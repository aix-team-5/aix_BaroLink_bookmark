// extension/js/store.js 테스트 (팀원 A · 이슈 #3)
// 실행: node --test "tests/*.test.mjs"   (Node 20 이상. 따옴표가 필요하다)
// 크롬 없이 돌리기 위해 가짜 chrome.storage.local을 넣는다. get·set마다 0~3ms 임의로 늦어지고, 값은 복사해서 주고받는다.
// 쓰는 쪽: globalThis.document가 있으면 새 탭, 없으면 서비스 워커로 본다.

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

let data = {};
const delay = () => new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 4)));

globalThis.chrome = {
  storage: {
    local: {
      async get(keys) {
        await delay();
        let list;
        if (keys === undefined || keys === null) list = Object.keys(data);
        else if (typeof keys === "string") list = [keys];
        else if (Array.isArray(keys)) list = keys;
        else list = Object.keys(keys);
        const out = {};
        for (const key of list) {
          if (Object.hasOwn(data, key)) out[key] = structuredClone(data[key]);
        }
        return out;
      },
      async set(items) {
        await delay();
        for (const [key, value] of Object.entries(items)) data[key] = structuredClone(value);
      },
    },
  },
};

const store = await import("../extension/js/store.js");

const asNewTab = () => { globalThis.document = {}; };
const asWorker = () => { delete globalThis.document; };

// Date.now를 잠시 바꿔 fn을 실행하고, 끝나면 원래대로 돌려놓는다
async function withNow(time, fn) {
  const original = Date.now;
  Date.now = () => time;
  try {
    return await fn();
  } finally {
    Date.now = original;
  }
}

beforeEach(() => {
  data = {};
  asNewTab();
});

// 1. load
test("load: 저장된 것이 없으면 키 10개 모두 기본값", async () => {
  const all = await store.load();
  assert.deepEqual(all, {
    pinned: [],
    lastOpenedByUs: {},
    dismissed: {},
    manualMoves: {},
    newBookmarks: [],
    handledNew: [],
    pendingMoves: {},
    history: [],
    state: { firstCard: "pending" },
    importing: null,
  });
});

test("load: state가 일부만 있으면 기본값과 합친다", async () => {
  data.state = { other: 1 };
  data.pinned = ["5"];
  const all = await store.load();
  assert.deepEqual(all.state, { firstCard: "pending", other: 1 });
  assert.deepEqual(all.pinned, ["5"]);
});

test("load: 돌려받은 값을 고쳐도 기본값은 그대로", async () => {
  const first = await store.load();
  first.pinned.push("x");
  first.state.firstCard = "done";
  first.lastOpenedByUs.y = 1;
  const second = await store.load();
  assert.deepEqual(second.pinned, []);
  assert.deepEqual(second.state, { firstCard: "pending" });
  assert.deepEqual(second.lastOpenedByUs, {});
});

// 2. 동시에 쓰기
test("recordOpened: 120번을 동시에 불러도 120개 모두 남는다", async () => {
  await Promise.all(Array.from({ length: 120 }, (_, i) => store.recordOpened(i)));
  assert.equal(Object.keys(data.lastOpenedByUs).length, 120);
});

// 3. 쓰는 쪽 검사
test("update: 쓰는 쪽이 아니면 오류, 모르는 키도 오류", async () => {
  asNewTab();
  await assert.rejects(store.markManualMove("1"));
  await assert.rejects(store.addNew("1"));
  await assert.rejects(store.update("unknownKey", (v) => v));
  asWorker();
  await assert.rejects(store.dismiss("1"));
  await assert.rejects(store.setFirstCard("done"));
  await assert.rejects(store.update("unknownKey", (v) => v));
  assert.deepEqual(data, {});
});

// 4. fn 오류 뒤에도 큐가 계속 돈다
test("update: fn이 오류를 내도 다음 update는 동작한다", async () => {
  const failing = store.update("pinned", () => {
    throw new Error("일부러 낸 오류");
  });
  const next = store.update("pinned", (list) => [...list, "a"]);
  await assert.rejects(failing, /일부러 낸 오류/);
  assert.deepEqual(await next, ["a"]);
  assert.deepEqual(data.pinned, ["a"]);
});

test("update: fn이 undefined를 돌려주면 쓰지 않고 현재 값을 돌려준다", async () => {
  const result = await store.update("pinned", () => undefined);
  assert.deepEqual(result, []);
  assert.equal(Object.hasOwn(data, "pinned"), false);
});

test("update: fn은 복사본을 받는다", async () => {
  data.pinned = ["1"];
  await store.update("pinned", (list) => {
    list.push("2");
    return undefined;
  });
  assert.deepEqual(data.pinned, ["1"]);
});

// 5. dismiss / undismiss (pin·unpin은 아래 5-1에서 테스트한다)
test("dismiss 뒤 undismiss하면 원래대로", async () => {
  await store.dismiss("7");
  assert.equal(typeof data.dismissed["7"], "number");
  await store.undismiss("7");
  assert.deepEqual(data.dismissed, {});
});

// 5-1. pin / unpin (N11, F08-01·04·06)
test("pin: 맨 뒤에 추가하고 true", async () => {
  assert.equal(await store.pin("1"), true);
  assert.equal(await store.pin("2"), true);
  assert.deepEqual(data.pinned, ["1", "2"]);
});

test("pin: 이미 고정돼 있으면 다시 넣지 않고 true", async () => {
  data.pinned = ["1", "2"];
  assert.equal(await store.pin("1"), true);
  assert.deepEqual(data.pinned, ["1", "2"]);
});

test("pin: 이미 8개면 넣지 않고 false, 목록은 그대로", async () => {
  data.pinned = ["1", "2", "3", "4", "5", "6", "7", "8"];
  assert.equal(await store.pin("9"), false);
  assert.deepEqual(data.pinned, ["1", "2", "3", "4", "5", "6", "7", "8"]);
  assert.equal(await store.pin("8"), true);
  assert.equal(data.pinned.length, 8);
});

test("unpin: 그 ID를 빼고 남은 고정 목록을 돌려준다", async () => {
  data.pinned = ["1", "2", "3"];
  const list = await store.unpin("2");
  assert.deepEqual(list, ["1", "3"]);
  assert.deepEqual(data.pinned, ["1", "3"]);
});

test("unpin: 없는 ID면 쓰지 않고 지금 목록을 돌려준다", async () => {
  assert.deepEqual(await store.unpin("1"), []);
  assert.equal(Object.hasOwn(data, "pinned"), false);
  data.pinned = ["1", "2"];
  assert.deepEqual(await store.unpin("9"), ["1", "2"]);
  assert.deepEqual(data.pinned, ["1", "2"]);
});

test("pin / unpin: 숫자 ID는 문자열로 맞춘다", async () => {
  assert.equal(await store.pin(5), true);
  assert.equal(await store.pin("5"), true);
  assert.deepEqual(data.pinned, ["5"]);
  assert.deepEqual(await store.unpin(5), []);
  assert.deepEqual(data.pinned, []);
});

test("pin: 동시에 10개를 넣으면 정확히 8개만 들어간다", async () => {
  const results = await Promise.all(Array.from({ length: 10 }, (_, i) => store.pin(`b${i}`)));
  assert.equal(results.filter((r) => r === true).length, 8);
  assert.equal(results.filter((r) => r === false).length, 2);
  assert.equal(data.pinned.length, 8);
  assert.equal(new Set(data.pinned).size, 8);
});

test("pin / unpin: 서비스 워커에서 부르면 오류, 아무것도 저장 안 됨", async () => {
  asWorker();
  await assert.rejects(store.pin("1"));
  await assert.rejects(store.unpin("1"));
  assert.deepEqual(data, {});
});

// 6. setPending / isPending
test("setPending → isPending: 같은 목적지면 true, 다른 목적지면 false, 숫자 ID도 맞는다", async () => {
  await store.setPending([{ id: 10, toParentId: 2 }, { id: "11", toParentId: "3" }]);
  asWorker();
  assert.equal(await store.isPending("10", "2"), true);
  assert.equal(await store.isPending(10, 2), true);
  assert.equal(await store.isPending("11", "3"), true);
  assert.equal(await store.isPending("11", "2"), false);
  assert.equal(await store.isPending("99", "2"), false);
});

test("setPending: 1분이 지나면 false, 다음 setPending 때 만료된 항목을 지운다", async () => {
  const base = 1_000_000;
  await withNow(base, () => store.setPending([{ id: "1", toParentId: "a" }]));
  await withNow(base + 59999, async () => {
    assert.equal(await store.isPending("1", "a"), true);
  });
  await withNow(base + 60000, async () => {
    assert.equal(await store.isPending("1", "a"), false);
  });
  assert.ok(Object.hasOwn(data.pendingMoves, "1"));
  await withNow(base + 61000, () => store.setPending([{ id: "2", toParentId: "b" }]));
  assert.deepEqual(data.pendingMoves, { 2: { toParentId: "b", at: base + 61000 } });
});

test("setPending: 잘못된 입력은 오류, 서비스 워커에서 부르면 오류", async () => {
  await assert.rejects(store.setPending("1"));
  await assert.rejects(store.setPending([{ id: "1" }]));
  await assert.rejects(store.setPending([null]));
  asWorker();
  await assert.rejects(store.setPending([{ id: "1", toParentId: "2" }]));
  assert.deepEqual(data, {});
});

// N47. setImporting / isImporting (서비스 워커만 쓴다)
test("setImporting: 서비스 워커에서 켜면 { at }, 끄면 null", async () => {
  asWorker();
  const base = 1_700_000_000_000;
  await withNow(base, () => store.setImporting(true));
  assert.deepEqual(data.importing, { at: base });
  assert.equal(await withNow(base, () => store.isImporting()), true);
  await store.setImporting(false);
  assert.ok(Object.hasOwn(data, "importing"));
  assert.equal(data.importing, null);
  assert.equal(await store.isImporting(), false);
});

test("isImporting: 표시한 지 10분 직전은 true, 정확히 10분이면 false, 값이 없으면 false", async () => {
  asWorker();
  assert.equal(await store.isImporting(), false);
  const base = 1_700_000_000_000;
  await withNow(base, () => store.setImporting(true));
  assert.equal(await withNow(base + 599999, () => store.isImporting()), true);
  assert.equal(await withNow(base + 600000, () => store.isImporting()), false);
  // isImporting은 읽기만 한다 (만료돼도 값을 지우지 않는다)
  assert.deepEqual(data.importing, { at: base });
});

test("setImporting: 새 탭에서 부르면 오류이고 저장하지 않는다. true·false가 아니면 오류", async () => {
  await assert.rejects(store.setImporting(true), /서비스 워커만 쓴다/);
  await assert.rejects(store.setImporting(false), /서비스 워커만 쓴다/);
  assert.deepEqual(data, {});
  asWorker();
  await assert.rejects(store.setImporting("false"));
  await assert.rejects(store.setImporting(1));
  await assert.rejects(store.setImporting());
  assert.deepEqual(data, {});
});

test("isImporting: await 없이 setImporting(true)를 부른 바로 뒤에도 true, false로 끈 바로 뒤에도 false", async () => {
  asWorker();
  // background.js처럼 onImportBegan에서 await 없이 켜고, 곧바로 onCreated에서 확인하는 순서
  for (let i = 0; i < 20; i++) {
    store.setImporting(true);
    assert.equal(await store.isImporting(), true, `${i + 1}번째: 켠 바로 뒤`);
    store.setImporting(false);
    assert.equal(await store.isImporting(), false, `${i + 1}번째: 끈 바로 뒤`);
  }
});

// 7. addHistory / markUndone
test("addHistory: 최신이 앞, id 없으면 오류, markUndone은 그 기록에만 시각을 남긴다", async () => {
  await store.addHistory({ id: "h1", at: 1, type: "first", moves: [] });
  await store.addHistory({ id: "h2", at: 2, type: "new", moves: [] });
  assert.deepEqual(data.history.map((h) => h.id), ["h2", "h1"]);
  await assert.rejects(store.addHistory({ at: 3 }));
  await assert.rejects(store.addHistory(null));
  assert.equal(data.history.length, 2);

  await withNow(5000, () => store.markUndone("h1"));
  assert.equal(data.history[1].undoneAt, 5000);
  assert.equal(Object.hasOwn(data.history[0], "undoneAt"), false);

  const before = structuredClone(data.history);
  await store.markUndone("없는-id");
  assert.deepEqual(data.history, before);
});

// 8. cleanupMissing
function seedForCleanup() {
  data.pinned = ["1", "2", "9"];
  data.handledNew = ["2", "8"];
  data.lastOpenedByUs = { 1: 100, 9: 100 };
  data.dismissed = { 8: 100, 3: 100 };
  data.history = [{ id: "h1", moves: [{ bookmarkId: "9", title: "지운 북마크" }] }];
  data.manualMoves = { 9: 100 };
  data.newBookmarks = ["9"];
}

test("cleanupMissing: 크롬에 없는 ID를 지우고 개수를 돌려준다. history와 서비스 워커 키는 그대로", async () => {
  seedForCleanup();
  const tree = { bookmarks: [{ id: "1" }, { id: "2" }, { id: "3" }], folders: [{ id: "100" }] };
  const removed = await store.cleanupMissing(tree);
  assert.equal(removed, 4);
  assert.deepEqual(data.pinned, ["1", "2"]);
  assert.deepEqual(data.handledNew, ["2"]);
  assert.deepEqual(data.lastOpenedByUs, { 1: 100 });
  assert.deepEqual(data.dismissed, { 3: 100 });
  assert.deepEqual(data.history, [{ id: "h1", moves: [{ bookmarkId: "9", title: "지운 북마크" }] }]);
  assert.deepEqual(data.manualMoves, { 9: 100 });
  assert.deepEqual(data.newBookmarks, ["9"]);
});

test("cleanupMissing: ID가 하나도 없으면 아무것도 지우지 않고 0", async () => {
  seedForCleanup();
  const before = structuredClone(data);
  assert.equal(await store.cleanupMissing({ bookmarks: [], folders: [] }), 0);
  assert.equal(await store.cleanupMissing([]), 0);
  assert.equal(await store.cleanupMissing(new Set()), 0);
  assert.equal(await store.cleanupMissing(undefined), 0);
  assert.deepEqual(data, before);
});

test("cleanupMissing: 노드 배열(children 포함)과 ID Set도 받는다", async () => {
  seedForCleanup();
  const nodes = [{ id: "0", children: [{ id: "1" }, { id: "x", children: [{ id: "2" }, { id: "3" }] }] }];
  assert.equal(await store.cleanupMissing(nodes), 4);
  assert.deepEqual(data.pinned, ["1", "2"]);

  seedForCleanup();
  assert.equal(await store.cleanupMissing(new Set([1, 2, 3])), 4);
  assert.deepEqual(data.dismissed, { 3: 100 });
});

// 9. setFirstCard / addNew · removeNew · purgeWorkerKeys (markHandledNew는 P2에서 테스트한다)
test("setFirstCard: 허용된 값만, 잘못된 값은 오류", async () => {
  await store.setFirstCard("done");
  assert.deepEqual(data.state, { firstCard: "done" });
  await store.setFirstCard("later");
  assert.deepEqual((await store.load()).state, { firstCard: "later" });
  await assert.rejects(store.setFirstCard("finished"));
  await assert.rejects(store.setFirstCard(undefined));
  assert.deepEqual(data.state, { firstCard: "later" });
});

test("addNew / removeNew / purgeWorkerKeys: 서비스 워커에서 동작", async () => {
  asWorker();
  await store.addNew("1");
  await store.addNew(2);
  await store.addNew("1");
  assert.deepEqual(data.newBookmarks, ["1", "2"]);
  await store.removeNew("1");
  assert.deepEqual(data.newBookmarks, ["2"]);

  await store.addNew("3");
  await store.markManualMove("2");
  await store.markManualMove("4");
  await store.purgeWorkerKeys(["2", 4]);
  assert.deepEqual(data.newBookmarks, ["3"]);
  assert.deepEqual(data.manualMoves, {});
});

// ---- N50 snapshotStored / restoreStored (F15-07) ----

// 가짜 저장소에 쓴 키를 순서대로 모으면서 fn을 실행한다
async function recordSets(fn) {
  const local = globalThis.chrome.storage.local;
  const set = local.set;
  const keys = [];
  local.set = async (items) => {
    keys.push(...Object.keys(items));
    return set(items);
  };
  try {
    await fn();
  } finally {
    local.set = set;
  }
  return keys;
}

test("snapshotStored: 고정 자리·연 시각·다시 안 볼 시각을 읽고, 저장소에 쓰지 않는다", async () => {
  data = { pinned: ["1", "2", "3"], lastOpenedByUs: { 2: 111 }, dismissed: { 2: 222 } };
  const before = structuredClone(data);
  assert.deepEqual(await store.snapshotStored(2), { pinnedIndex: 1, lastOpened: 111, dismissedAt: 222 });
  assert.deepEqual(data, before);
});

test("snapshotStored: 기록이 없으면 각각 null (저장된 것이 아예 없어도)", async () => {
  assert.deepEqual(await store.snapshotStored("9"), { pinnedIndex: null, lastOpened: null, dismissedAt: null });
  data = { pinned: ["1"], lastOpenedByUs: { 1: 5 } };
  assert.deepEqual(await store.snapshotStored("9"), { pinnedIndex: null, lastOpened: null, dismissedAt: null });
});

test("snapshotStored: 앞서 시작한 쓰기(pin)가 끝난 뒤의 값을 읽는다", async () => {
  data = { pinned: ["1", "2"] };
  const pinning = store.pin("7");
  const snapshot = await store.snapshotStored("7");
  await pinning;
  assert.equal(snapshot.pinnedIndex, 2);
});

test("restoreStored: 새 ID로 고정 같은 자리·연 시각·다시 안 볼 시각을 옮겨 적고 handledNew에 넣는다", async () => {
  data = { pinned: ["1", "2", "3"], lastOpenedByUs: { 2: 111 }, dismissed: { 2: 222 }, handledNew: ["8"] };
  const snapshot = await store.snapshotStored("2");
  // 지운 뒤 cleanupMissing이 옛 ID를 지운 상태
  await store.cleanupMissing(new Set(["1", "3", "8"]));
  await store.restoreStored(1000, snapshot);
  assert.deepEqual(data.pinned, ["1", "1000", "3"]);
  assert.deepEqual(data.lastOpenedByUs, { 1000: 111 });
  assert.deepEqual(data.dismissed, { 1000: 222 });
  assert.deepEqual(data.handledNew, ["8", "1000"]);
});

test("restoreStored: 고정 자리가 목록 길이보다 크면 맨 뒤", async () => {
  data = { pinned: ["1"] };
  await store.restoreStored("1000", { pinnedIndex: 5, lastOpened: null, dismissedAt: null });
  assert.deepEqual(data.pinned, ["1", "1000"]);
});

test("restoreStored: 고정이 이미 8개면 고정만 되살리지 않는다 (나머지는 옮겨 적음)", async () => {
  const full = ["1", "2", "3", "4", "5", "6", "7", "8"];
  data = { pinned: [...full] };
  await store.restoreStored("1000", { pinnedIndex: 0, lastOpened: 111, dismissedAt: 222 });
  assert.deepEqual(data.pinned, full);
  assert.deepEqual(data.lastOpenedByUs, { 1000: 111 });
  assert.deepEqual(data.dismissed, { 1000: 222 });
  assert.deepEqual(data.handledNew, ["1000"]);
});

test("restoreStored: 고정하지 않았던 북마크는 고정하지 않고, 기록이 없는 키는 쓰지 않는다", async () => {
  data = { pinned: ["1"] };
  const keys = await recordSets(() => store.restoreStored("1000", { pinnedIndex: null, lastOpened: null, dismissedAt: null }));
  assert.deepEqual(keys, ["handledNew"]);
  assert.deepEqual(data.pinned, ["1"]);
  assert.equal(Object.hasOwn(data, "lastOpenedByUs"), false);
  assert.equal(Object.hasOwn(data, "dismissed"), false);
});

test("restoreStored: handledNew에는 새 ID가 한 번만 들어간다 (두 번 불러도)", async () => {
  const snapshot = { pinnedIndex: 0, lastOpened: 111, dismissedAt: null };
  await store.restoreStored("1000", snapshot);
  await store.restoreStored(1000, snapshot);
  assert.deepEqual(data.handledNew, ["1000"]);
  assert.deepEqual(data.pinned, ["1000"]);
});

test("restoreStored: handledNew를 가장 먼저 쓰고, 그다음 pinned → lastOpenedByUs → dismissed", async () => {
  data = { pinned: ["1"] };
  const keys = await recordSets(() => store.restoreStored("1000", { pinnedIndex: 0, lastOpened: 111, dismissedAt: 222 }));
  assert.deepEqual(keys, ["handledNew", "pinned", "lastOpenedByUs", "dismissed"]);
});

test("restoreStored: 서비스 워커에서 부르면 오류이고 아무것도 쓰지 않는다", async () => {
  asWorker();
  await assert.rejects(store.restoreStored("1000", { pinnedIndex: 0, lastOpened: 111, dismissedAt: 222 }), /새 탭만 쓴다/);
  assert.deepEqual(data, {});
});

test("restoreStored: snapshot이 없거나 객체가 아니면 오류이고 아무것도 쓰지 않는다", async () => {
  await assert.rejects(store.restoreStored("1000"));
  await assert.rejects(store.restoreStored("1000", "snapshot"));
  await assert.rejects(store.restoreStored("", { pinnedIndex: 0, lastOpened: null, dismissedAt: null }));
  assert.deepEqual(data, {});
});
