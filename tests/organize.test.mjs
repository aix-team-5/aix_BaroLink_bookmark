// extension/js/organize.js 테스트 (팀원 A · 이슈 #4)
// 실행: node --test "tests/*.test.mjs"   (Node 20 이상. 따옴표가 필요하다)
// 진짜 bookmarks.js · store.js를 쓰고, 크롬 없이 돌리기 위해 가짜 chrome.bookmarks · storage.local을 넣는다.
// 가짜 chrome.bookmarks.move는 실제 크롬에서 확인한 동작을 따른다 (tests/bookmarks.test.mjs와 같음).
// bookmarks.js · store.js가 뼈대(PR #29 · #30이 합쳐지기 전)면 전체를 건너뛴다.

import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

// 크롬 호출 순서 기록 ("storage.set", "bookmarks.move" 등)
let calls = [];

// ---- 가짜 chrome.storage.local (store.js가 쓴다) ----
let data = {};
// 이 키를 저장하려 하면 오류를 던진다
let failSetKey = null;
const storage = {
  async get(keys) {
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
    await new Promise((resolve) => setTimeout(resolve, 2));
    if (failSetKey && Object.hasOwn(items, failSetKey)) throw new Error("저장 실패");
    for (const [key, value] of Object.entries(items)) data[key] = structuredClone(value);
    calls.push("storage.set");
  },
};

// ---- 가짜 chrome.bookmarks ----
// nodes: id → { id, parentId, title, url?, dateAdded, folderType?, syncing, children?: [id] }
let nodes = new Map();
let nextId = 1000;
// 이 ID를 옮기려 하면 null이 아닌 오류를 던진다 (moveBookmark가 그대로 던지는 경우)
let failMove = new Set();
// 옮긴 북마크 ID 기록, 그리고 move가 불릴 때 먼저 실행할 일 (옮기는 도중 사용자가 지우는 경우 흉내)
let moveLog = [];
let beforeMove = null;
// 폴더의 dateGroupModified를 흉내 내는 시계. 실제 크롬처럼 북마크를 만들거나 옮기면 그 폴더의 값이 바뀐다
let clock = 0;
// 임시 북마크(touch)를 만들 때 오류를 낸다 (touch 실패가 정리 결과를 깨지 않는지 확인용)
let failTouch = false;

function view(id, deep) {
  const node = nodes.get(id);
  const out = { id: node.id, title: node.title, dateAdded: node.dateAdded, syncing: node.syncing };
  if (node.parentId !== undefined) {
    out.parentId = node.parentId;
    out.index = nodes.get(node.parentId).children.indexOf(id);
  }
  if (node.url !== undefined) out.url = node.url;
  if (node.folderType !== undefined) out.folderType = node.folderType;
  if (node.dateGroupModified !== undefined) out.dateGroupModified = node.dateGroupModified;
  if (node.children && deep) out.children = node.children.map((child) => view(child, true));
  return out;
}

function need(id, message = "Can't find bookmark for id.") {
  const node = nodes.get(String(id));
  if (!node) throw new Error(message);
  return node;
}

const bookmarks = {
  async getTree() {
    return [view("0", true)];
  },
  async get(id) {
    need(id);
    return [view(String(id), false)];
  },
  async getChildren(id) {
    const node = need(id);
    if (!node.children) return [];
    return node.children.map((child) => view(child, false));
  },
  async create({ parentId, title, url }) {
    const parent = need(parentId, "Can't find parent bookmark for id.");
    if (parent.id === "0") throw new Error("Can't modify the root bookmark folders.");
    if (failTouch && url === b.TOUCH_URL) throw new Error("touch 실패");
    const id = String(nextId++);
    const node = { id, parentId: parent.id, title, dateAdded: 1, syncing: parent.syncing };
    if (url !== undefined) node.url = url;
    else node.children = [];
    nodes.set(id, node);
    parent.children.push(id);
    parent.dateGroupModified = ++clock;
    calls.push(url === b.TOUCH_URL ? "bookmarks.touch" : "bookmarks.create");
    return view(id, false);
  },
  async move(id, { parentId, index }) {
    if (beforeMove) await beforeMove(String(id));
    const node = need(id);
    if (failMove.has(node.id)) throw new Error("boom");
    const parent = need(parentId, "Can't find parent bookmark for id.");
    if (node.parentId === "0" || parent.id === "0") throw new Error("Can't modify the root bookmark folders.");
    const count = parent.children.length;
    if (index === undefined) index = count;
    if (index > count) throw new Error("Index out of bounds.");
    const from = nodes.get(node.parentId).children;
    const oldIndex = from.indexOf(node.id);
    from.splice(oldIndex, 1);
    if (parent.id === node.parentId && index > oldIndex) index -= 1;
    parent.children.splice(index, 0, node.id);
    node.parentId = parent.id;
    parent.dateGroupModified = ++clock;
    calls.push("bookmarks.move");
    moveLog.push(node.id);
    return view(node.id, false);
  },
  async remove(id) {
    const node = need(id);
    if (node.parentId === "0") throw new Error("Can't modify the root bookmark folders.");
    if (node.children && node.children.length > 0) throw new Error("Can't remove non-empty folder.");
    const siblings = nodes.get(node.parentId).children;
    siblings.splice(siblings.indexOf(node.id), 1);
    nodes.delete(node.id);
    calls.push("bookmarks.remove");
  },
  // renameFolder(N04)가 쓴다. 최신화 예약 확인용
  async update(id, { title }) {
    const node = need(id);
    if (node.parentId === undefined || node.parentId === "0") throw new Error("Can't modify the root bookmark folders.");
    if (title !== undefined) node.title = title;
    calls.push("bookmarks.update");
    return view(node.id, false);
  },
  async search({ url }) {
    calls.push("bookmarks.search");
    return [...nodes.values()].filter((node) => node.url === url).map((node) => view(node.id, false));
  },
};

globalThis.chrome = {
  bookmarks,
  tabs: { async getCurrent() { return { id: 1 }; }, async update() {}, async create() {} },
  storage: { local: storage },
  runtime: { getURL: (path) => "chrome-extension://test" + path },
};
// store.js는 document가 있으면 새 탭으로 본다
globalThis.document = {};

// console.warn · console.error를 모은다
let warnings = [];
let errors = [];
console.warn = (...args) => warnings.push(args.map(String).join(" "));
console.error = (...args) => errors.push(args);

// ---- 샘플 트리 ----
// 0
// ├─ 1 북마크바 (bookmarks-bar)
// │   ├─ 10 x0, 11 x1, 12 x2, 13 x3, 14 x4, 15 x5
// │   ├─ 16 [개발]          ← 이미 있는 폴더 (같은 이름 재사용 확인)
// │   │   └─ 160 깃허브
// │   └─ 17 [기본 폴더]
// │       ├─ 170 a, 171 [하위], 172 b, 173 c
// └─ 2 기타 북마크 (other)
//     └─ 20 메모
function build(spec) {
  nodes = new Map();
  nextId = 1000;
  const add = (item, parentId, syncing) => {
    const node = { ...item, parentId, dateAdded: item.dateAdded ?? 1, syncing: item.syncing ?? syncing };
    delete node.kids;
    if (item.url === undefined) node.children = [];
    nodes.set(node.id, node);
    if (parentId !== undefined) nodes.get(parentId).children.push(node.id);
    for (const kid of item.kids ?? []) add(kid, node.id, node.syncing);
  };
  add({ id: "0", title: "", kids: spec, syncing: false }, undefined, false);
}

const link = (id, title) => ({ id, title, url: `https://example.com/${id}` });

const SAMPLE = [
  {
    id: "1", title: "북마크바", folderType: "bookmarks-bar", syncing: true,
    kids: [
      link("10", "x0"), link("11", "x1"), link("12", "x2"), link("13", "x3"), link("14", "x4"), link("15", "x5"),
      { id: "16", title: "개발", kids: [link("160", "깃허브")] },
      { id: "17", title: "기본 폴더", kids: [link("170", "a"), { id: "171", title: "하위" }, link("172", "b"), link("173", "c")] },
    ],
  },
  { id: "2", title: "기타 북마크", folderType: "other", syncing: true, kids: [link("20", "메모")] },
];

const childIds = (id) => [...nodes.get(id).children];
const titleOf = (id) => nodes.get(id).title;
const folderNamed = (title, parentId = "1") => childIds(parentId).find((id) => nodes.get(id).title === title && !nodes.get(id).url);
const plan = (...folders) => ({ type: "folders", folders: folders.map(([name, items]) => ({ name, items, reasons: [] })), rest: [] });

const b = await import("../extension/js/bookmarks.js");
const store = await import("../extension/js/store.js");
const o = await import("../extension/js/organize.js");

// bookmarks.js · store.js가 뼈대면 건너뛴다
build(structuredClone(SAMPLE));
const BAR_READY = (await b.loadTree())?.roots?.bar ? true : false;
const probe = calls.length;
await store.recordOpened("probe");
const STORE_READY = calls.slice(probe).includes("storage.set");
const SKIP = BAR_READY && STORE_READY ? false : "bookmarks.js · store.js가 뼈대라 건너뜀 (PR #29 · #30이 합쳐진 뒤 다시 돌린다)";

beforeEach(() => {
  build(structuredClone(SAMPLE));
  data = {};
  calls = [];
  failMove = new Set();
  failSetKey = null;
  moveLog = [];
  beforeMove = null;
  warnings = [];
  errors = [];
  clock = 0;
  failTouch = false;
});

// 테스트가 예약한 최신화가 다음 테스트에서 실행되지 않게, 끝날 때 바로 실행해 비운다
afterEach(() => b.flushBarTouch());

const touches = () => calls.filter((c) => c === "bookmarks.touch").length;
const searches = () => calls.filter((c) => c === "bookmarks.search").length;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 지금 dateGroupModified가 가장 큰 폴더 ID (별 창이 기본으로 고르는 폴더)
const newestFolder = () =>
  [...nodes.values()].filter((node) => node.dateGroupModified !== undefined).sort((x, y) => y.dateGroupModified - x.dateGroupModified)[0]?.id;
const touchNodes = () => [...nodes.values()].filter((node) => node.url === b.TOUCH_URL);

// ---- N22 applyPlan ----

test("applyPlan: 북마크바 맨 뒤에 폴더를 만들고 옮긴 뒤 기록을 저장한다 (F07-01·02)", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(plan(["쇼핑", ["11", "13"]]), "first");
  const folder = folderNamed("쇼핑");
  assert.equal(childIds("1").at(-1), folder);
  assert.deepEqual(childIds(folder), ["11", "13"]);

  assert.match(entry.id, /^[0-9a-f-]{36}$/);
  assert.equal(typeof entry.at, "number");
  assert.equal(entry.type, "first");
  assert.deepEqual(entry.createdFolderIds, [folder]);
  assert.equal(entry.skipped, 0);
  assert.deepEqual(entry.moves, [
    { bookmarkId: "11", title: "x1", fromParentId: "1", fromIndex: 1, toParentId: folder },
    { bookmarkId: "13", title: "x3", fromParentId: "1", fromIndex: 3, toParentId: folder },
  ]);
  // 원래 순서는 폴더를 만들기 전·옮기기 전 그대로 (하위 폴더 포함)
  assert.deepEqual(entry.fromOrder, { 1: ["10", "11", "12", "13", "14", "15", "16", "17"] });
  assert.deepEqual(data.history, [entry]);
});

test("applyPlan: 명세 N22 입력처럼 type이 없는 계획도 받는다 (F07-01)", { skip: SKIP }, async () => {
  const entry = await o.applyPlan({ folders: [{ name: "쇼핑", items: ["11", "13"], reasons: [] }] }, "first");
  const folder = folderNamed("쇼핑");
  assert.deepEqual(childIds(folder), ["11", "13"]);
  assert.deepEqual(entry.createdFolderIds, [folder]);
  assert.deepEqual(data.history, [entry]);
});

test("applyPlan: setPending 저장이 끝난 뒤에 첫 이동을 하고, 표시는 지우지 않는다 (F07-05)", { skip: SKIP }, async () => {
  await o.applyPlan(plan(["쇼핑", ["11", "13"]]), "first");
  const firstMove = calls.indexOf("bookmarks.move");
  const pendingSet = calls.lastIndexOf("storage.set", firstMove);
  assert.ok(pendingSet !== -1 && pendingSet < firstMove);
  const folder = folderNamed("쇼핑");
  assert.equal(data.pendingMoves["11"].toParentId, folder);
  assert.equal(data.pendingMoves["13"].toParentId, folder);
  assert.equal(data.manualMoves, undefined);
});

test("applyPlan: 같은 이름의 폴더가 있으면 그 폴더를 쓰고 createdFolderIds에 넣지 않는다 (F07-08)", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(plan(["개발", ["10"]]), "first");
  assert.deepEqual(childIds("16"), ["160", "10"]);
  assert.deepEqual(entry.createdFolderIds, []);
  assert.equal(calls.includes("bookmarks.create"), false);
});

test("applyPlan: 계획에 같은 이름이 두 번 나오면 한 폴더로 합친다", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(plan(["쇼핑", ["11"]], [" 쇼핑 ", ["12"]]), "first");
  const folder = folderNamed("쇼핑");
  assert.deepEqual(childIds(folder), ["11", "12"]);
  assert.deepEqual(entry.createdFolderIds, [folder]);
  assert.equal(calls.filter((c) => c === "bookmarks.create").length, 1);
});

test("applyPlan: 비게 된 원래 폴더는 지우지 않는다 (F07-04)", { skip: SKIP }, async () => {
  await o.applyPlan(plan(["옮김", ["160"]]), "first");
  assert.deepEqual(childIds("16"), []);
  assert.ok(nodes.has("16"));
});

test("applyPlan: items는 북마크 객체와 ID(숫자 포함)를 모두 받는다", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(plan(["쇼핑", [{ id: "11", title: "무시" }, 12, "13"]]), "first");
  assert.deepEqual(entry.moves.map((m) => m.bookmarkId), ["11", "12", "13"]);
  // 제목은 계획이 아니라 loadTree에서 읽은 값
  assert.equal(entry.moves[0].title, "x1");
});

test("applyPlan: 지워진 북마크와 옮기다 오류가 난 북마크는 건너뛰고 skipped에 센다 (F07-09)", { skip: SKIP }, async () => {
  failMove = new Set(["12"]);
  const entry = await o.applyPlan(plan(["쇼핑", ["11", "12", "999", "13"]]), "first");
  const folder = folderNamed("쇼핑");
  assert.deepEqual(childIds(folder), ["11", "13"]);
  assert.equal(entry.skipped, 2);
  assert.deepEqual(entry.moves.map((m) => m.bookmarkId), ["11", "13"]);
  assert.equal(data.history.length, 1);
  assert.equal(warnings.length, 1);
});

test("applyPlan: 이미 그 폴더에 있는 북마크는 옮기지 않고 어디에도 넣지 않는다", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(plan(["개발", ["160", "10"]]), "first");
  assert.deepEqual(entry.moves.map((m) => m.bookmarkId), ["10"]);
  assert.equal(entry.skipped, 0);
  assert.equal(data.pendingMoves["160"], undefined);
  assert.deepEqual(childIds("16"), ["160", "10"]);
});

test("applyPlan: 같은 북마크가 두 폴더에 있으면 처음 것만 쓰고 경고한다", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(plan(["가", ["11"]], ["나", ["11", "12"]]), "first");
  assert.deepEqual(childIds(folderNamed("가")), ["11"]);
  assert.deepEqual(childIds(folderNamed("나")), ["12"]);
  assert.equal(entry.moves.length, 2);
  assert.equal(warnings.length, 1);
});

test("applyPlan: 옮긴 것도 만든 폴더도 없으면 기록을 저장하지 않는다", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(plan(["개발", ["160"]]), "first");
  assert.deepEqual(entry.moves, []);
  assert.deepEqual(entry.createdFolderIds, []);
  assert.equal(data.history, undefined);
});

test("applyPlan: 폴더를 만든 뒤 이동이 모두 오류여도 기록은 저장한다", { skip: SKIP }, async () => {
  failMove = new Set(["11", "13"]);
  const entry = await o.applyPlan(plan(["쇼핑", ["11", "13"]]), "first");
  assert.equal(entry.skipped, 2);
  assert.deepEqual(entry.moves, []);
  assert.deepEqual(entry.createdFolderIds, [folderNamed("쇼핑")]);
  assert.equal(data.history.length, 1);
});

test("applyPlan: 계획의 북마크가 모두 지워진 그룹은 폴더를 만들지 않고 skipped에 센다", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(plan(["없음", ["998", "999"]], ["쇼핑", ["11", "997"]]), "first");
  assert.equal(folderNamed("없음"), undefined);
  assert.equal(calls.filter((c) => c === "bookmarks.create").length, 1);
  assert.equal(entry.skipped, 3);
  assert.deepEqual(entry.moves.map((m) => m.bookmarkId), ["11"]);

  calls = [];
  data = {};
  const empty = await o.applyPlan(plan(["없음", ["998", "999"]]), "first");
  assert.equal(calls.includes("bookmarks.create"), false);
  assert.equal(empty.skipped, 2);
  assert.deepEqual(empty.createdFolderIds, []);
  assert.equal(data.history, undefined);
});

test("applyPlan: 계획이 잘못되면 아무것도 바꾸기 전에 오류", { skip: SKIP }, async () => {
  const bad = [
    [{ type: "pin", reason: "" }, "first"],
    [{ ...plan(["쇼핑", ["11"]]), type: "pin" }, "first"],
    [{ type: "folders", folders: "x" }, "first"],
    [null, "first"],
    [plan(["  ", ["11"]]), "first"],
    [plan(["쇼핑", ["11"]], ["", ["12"]]), "first"],
    [{ type: "folders", folders: [{ name: "쇼핑" }] }, "first"],
    [plan(["쇼핑", ["11", null]]), "first"],
    [plan(["쇼핑", ["11"]]), "later"],
    [plan(["쇼핑", ["11"]]), undefined],
  ];
  for (const [p, type] of bad) {
    await assert.rejects(o.applyPlan(p, type));
  }
  assert.deepEqual(calls, []);
  assert.deepEqual(childIds("1"), ["10", "11", "12", "13", "14", "15", "16", "17"]);
});

test("applyPlan: 첫 정리에 keep(비어 있지 않음)·folderId가 오면 아무것도 바꾸기 전에 오류, 결과의 kept는 0", { skip: SKIP }, async () => {
  await assert.rejects(o.applyPlan({ ...plan(["쇼핑", ["11"]]), keep: ["12"] }, "first"), /첫 정리/);
  await assert.rejects(o.applyPlan({ type: "folders", folders: [{ folderId: "16", items: ["11"] }] }, "first"), /첫 정리/);
  // keep이 배열이 아니면 종류와 상관없이 오류
  await assert.rejects(o.applyPlan({ ...plan(["쇼핑", ["11"]]), keep: "12" }, "new"), /keep/);
  assert.deepEqual(calls, []);
  // 빈 keep과 type "first"는 받는다
  const entry = await o.applyPlan({ ...plan(["쇼핑", ["11"]]), keep: [] }, "first");
  assert.equal(entry.type, "first");
  assert.equal(entry.kept, 0);
  assert.equal(data.history[0].kept, 0);
  assert.equal(data.handledNew, undefined);
});

// ---- N22 applyPlan "new" (F10-05, 명세 v20) ----

// 새 북마크 정리의 [정리하기] 입력: { folders: [{ folderId 또는 name, items }], keep }
const planNew = (folders, keep = []) => ({ folders, keep });

test("applyPlan new: 기존 폴더(folderId)로 옮기면 그 폴더 맨 뒤에 놓고 폴더를 만들지 않는다 (F10-05)", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(planNew([{ folderId: "16", items: ["11", "13"] }]), "new");
  assert.deepEqual(childIds("16"), ["160", "11", "13"]);
  assert.equal(calls.includes("bookmarks.create"), false);
  assert.equal(entry.type, "new");
  assert.deepEqual(entry.createdFolderIds, []);
  assert.equal(entry.skipped, 0);
  assert.equal(entry.kept, 0);
  assert.deepEqual(entry.moves.map((m) => [m.bookmarkId, m.toParentId]), [["11", "16"], ["13", "16"]]);
  assert.deepEqual(entry.fromOrder, { 1: ["10", "11", "12", "13", "14", "15", "16", "17"] });
  assert.deepEqual(data.history, [entry]);
});

test("applyPlan new: name만 있으면 북마크바 맨 뒤에 새 폴더를 만들어 옮긴다 (F10-05)", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(planNew([{ name: "쇼핑", items: ["11", "13"] }]), "new");
  const folder = folderNamed("쇼핑");
  assert.equal(childIds("1").at(-1), folder);
  assert.deepEqual(childIds(folder), ["11", "13"]);
  assert.deepEqual(entry.createdFolderIds, [folder]);
  assert.equal(entry.type, "new");
  assert.deepEqual(data.history, [entry]);
});

test("applyPlan new: folderId와 name이 둘 다 있으면 folderId를 쓰고 그 이름의 폴더는 만들지 않는다", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(planNew([{ folderId: "16", name: "쇼핑", items: ["11"] }]), "new");
  assert.deepEqual(childIds("16"), ["160", "11"]);
  assert.equal(folderNamed("쇼핑"), undefined);
  assert.deepEqual(entry.createdFolderIds, []);
});

test("applyPlan new: folderId 폴더가 없으면 오류 없이 skipped에 세고 handledNew에도 넣지 않는다", { skip: SKIP }, async () => {
  // 999는 없는 폴더, 10은 폴더가 아니라 북마크
  const entry = await o.applyPlan(
    planNew([{ folderId: "999", items: ["11", "12"] }, { folderId: "10", items: ["13"] }, { folderId: "16", items: ["14"] }], ["11", "15"]),
    "new",
  );
  assert.equal(entry.skipped, 3);
  assert.deepEqual(entry.moves.map((m) => m.bookmarkId), ["14"]);
  assert.deepEqual(childIds("1").slice(0, 4), ["10", "11", "12", "13"]);
  // 11은 folders에 나왔으므로 keep에 있어도 그대로 두기가 아니다 → 다음 정리 때 다시 나온다
  assert.equal(entry.kept, 1);
  assert.deepEqual(data.handledNew, ["15"]);
});

test("applyPlan new: folderId가 맨 위 루트(\"0\")면 폴더 없음과 같이 skipped", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(planNew([{ folderId: "0", items: ["11"] }]), "new");
  assert.equal(entry.skipped, 1);
  assert.deepEqual(entry.moves, []);
  assert.equal(calls.includes("bookmarks.move"), false);
  assert.equal(data.history, undefined);
});

test("applyPlan new: keep과 folders에 같은 ID가 있으면 folders를 따르고 handledNew에서 뺀다", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(planNew([{ folderId: "16", items: ["11"] }], ["11", "12"]), "new");
  assert.deepEqual(childIds("16"), ["160", "11"]);
  assert.equal(entry.kept, 1);
  assert.deepEqual(data.handledNew, ["12"]);
});

test("applyPlan new: keep만 있으면 기록 없이 같은 모양을 돌려주고 handledNew에 넣는다", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(planNew([], ["12", "20"]), "new");
  assert.deepEqual(Object.keys(entry).sort(), ["at", "createdFolderIds", "fromOrder", "id", "kept", "moves", "skipped", "type"]);
  assert.equal(entry.type, "new");
  assert.deepEqual(entry.createdFolderIds, []);
  assert.deepEqual(entry.moves, []);
  assert.deepEqual(entry.fromOrder, {});
  assert.equal(entry.skipped, 0);
  assert.equal(entry.kept, 2);
  assert.equal(data.history, undefined);
  assert.equal(data.pendingMoves, undefined);
  assert.deepEqual(data.handledNew, ["12", "20"]);
  assert.equal(calls.includes("bookmarks.move"), false);
});

test("applyPlan new: setPending 저장 뒤에 첫 이동, 기록 뒤에 handledNew, newBookmarks는 건드리지 않는다", { skip: SKIP }, async () => {
  data.newBookmarks = ["11", "12"];
  await o.applyPlan(planNew([{ folderId: "16", items: ["11"] }], ["12"]), "new");
  const firstMove = calls.indexOf("bookmarks.move");
  const pendingSet = calls.lastIndexOf("storage.set", firstMove);
  assert.ok(pendingSet !== -1 && pendingSet < firstMove);
  // 이동 뒤 저장 두 번: history → handledNew. 북마크바 최신화는 500ms 뒤로 미뤄져 아직 없다
  assert.deepEqual(calls.slice(firstMove), ["bookmarks.move", "storage.set", "storage.set"]);
  assert.equal(data.pendingMoves["11"].toParentId, "16");
  assert.deepEqual(data.newBookmarks, ["11", "12"]);
});

test("applyPlan new: 계획과 적용 사이에 지워진 북마크는 skipped로 세고 나머지는 옮긴다", { skip: SKIP }, async () => {
  await bookmarks.remove("13");
  const entry = await o.applyPlan(planNew([{ folderId: "16", items: ["11", "13"] }, { name: "쇼핑", items: ["12"] }]), "new");
  assert.equal(entry.skipped, 1);
  assert.deepEqual(entry.moves.map((m) => m.bookmarkId), ["11", "12"]);
  assert.deepEqual(childIds("16"), ["160", "11"]);
  assert.deepEqual(childIds(folderNamed("쇼핑")), ["12"]);
});

test("applyPlan new: keep 안의 지워진 북마크는 kept에 세지 않고 handledNew에도 넣지 않는다", { skip: SKIP }, async () => {
  await bookmarks.remove("12");
  const entry = await o.applyPlan(planNew([], ["12", "14", "998"]), "new");
  assert.equal(entry.kept, 1);
  assert.equal(entry.skipped, 0);
  assert.deepEqual(data.handledNew, ["14"]);
});

test("applyPlan new: keep에 같은 ID가 두 번 있어도 kept는 1, handledNew에도 한 번만 (숫자 ID 포함)", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(planNew([], ["12", "12", 12]), "new");
  assert.equal(entry.kept, 1);
  assert.deepEqual(data.handledNew, ["12"]);
  // 이미 handledNew에 있어도 이번에 고른 수로 센다
  const again = await o.applyPlan(planNew([], ["12"]), "new");
  assert.equal(again.kept, 1);
  assert.deepEqual(data.handledNew, ["12"]);
});

test("applyPlan new: 이미 목적지 폴더(북마크바)에 있는 북마크는 옮기지 않고 그대로 두기로 센다 (keep에도 있으면 한 번만)", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(planNew([{ folderId: "1", items: ["11"] }], ["11"]), "new");
  assert.deepEqual(entry.moves, []);
  assert.equal(entry.skipped, 0);
  assert.equal(entry.kept, 1);
  assert.deepEqual(data.handledNew, ["11"]);
  assert.equal(data.history, undefined);
  assert.equal(data.pendingMoves, undefined);
  assert.equal(calls.includes("bookmarks.move"), false);
});

test("applyPlan new: keep 없이 folders만으로 제자리 북마크를 줘도 그대로 두기로 센다", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(planNew([{ folderId: "16", items: ["160"] }]), "new");
  assert.deepEqual(entry.moves, []);
  assert.equal(entry.skipped, 0);
  assert.equal(entry.kept, 1);
  assert.deepEqual(data.handledNew, ["160"]);
  assert.deepEqual(childIds("16"), ["160"]);
});

test("applyPlan new: 제자리 북마크와 옮기는 북마크가 섞이면 moves는 옮긴 것만, kept는 제자리 것만", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(planNew([{ folderId: "16", items: ["160", "11"] }, { folderId: "1", items: ["12"] }], ["14"]), "new");
  assert.deepEqual(entry.moves.map((m) => [m.bookmarkId, m.toParentId]), [["11", "16"]]);
  assert.equal(entry.skipped, 0);
  assert.equal(entry.kept, 3);
  assert.deepEqual([...data.handledNew].sort(), ["12", "14", "160"]);
  assert.equal(data.pendingMoves["160"], undefined);
  assert.equal(data.pendingMoves["12"], undefined);
  assert.deepEqual(data.history, [entry]);
});

test("applyPlan first: 같은 이름 폴더에 이미 있는 북마크는 지금처럼 kept 0, handledNew를 바꾸지 않는다", { skip: SKIP }, async () => {
  data.handledNew = ["99"];
  const entry = await o.applyPlan(plan(["개발", ["160", "10"]]), "first");
  assert.deepEqual(entry.moves.map((m) => m.bookmarkId), ["10"]);
  assert.equal(entry.skipped, 0);
  assert.equal(entry.kept, 0);
  assert.deepEqual(data.handledNew, ["99"]);
});

test("applyPlan new: 최상위 폴더도 folderId로 쓸 수 있다 (기타 북마크 → 북마크바)", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(planNew([{ folderId: "1", items: ["20"] }]), "new");
  assert.deepEqual(entry.moves.map((m) => [m.bookmarkId, m.toParentId]), [["20", "1"]]);
  assert.equal(entry.kept, 0);
  assert.equal(childIds("1").at(-1), "20");
});

test("applyPlan new: folderId가 관리자 폴더(managed)나 그 아래 폴더면 폴더 없음과 같이 skipped, setPending·이동을 하지 않는다", { skip: SKIP }, async () => {
  build([
    ...structuredClone(SAMPLE),
    { id: "3", title: "관리자 북마크", folderType: "managed", syncing: false, kids: [{ id: "30", title: "회사", kids: [link("300", "인트라넷")] }] },
  ]);
  const entry = await o.applyPlan(planNew([{ folderId: "3", items: ["11"] }, { folderId: "30", items: ["12"] }]), "new");
  assert.equal(entry.skipped, 2);
  assert.deepEqual(entry.moves, []);
  assert.equal(entry.kept, 0);
  assert.equal(data.pendingMoves, undefined);
  assert.equal(data.history, undefined);
  assert.equal(data.handledNew, undefined);
  assert.equal(calls.includes("bookmarks.move"), false);
  assert.deepEqual(childIds("30"), ["300"]);
});

test("applyPlan new → undo: 기존 폴더로 옮긴 것을 원래 자리로 되돌리고 기존 폴더는 남긴다", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(planNew([{ folderId: "16", items: ["13", "11"] }]), "new");
  const result = await o.undo(entry.id);
  assert.deepEqual(result, { restored: 2, skipped: 0, fallback: 0 });
  assert.deepEqual(childIds("1"), ["10", "11", "12", "13", "14", "15", "16", "17"]);
  assert.deepEqual(childIds("16"), ["160"]);
});

test("applyPlan new → undo: 새 폴더를 만들어 옮긴 뒤 되돌리면 만든 폴더를 지운다", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(planNew([{ name: "쇼핑", items: ["11", "13"] }, { folderId: "16", items: ["12"] }]), "new");
  const folder = folderNamed("쇼핑");
  const result = await o.undo(entry.id);
  assert.deepEqual(result, { restored: 3, skipped: 0, fallback: 0 });
  assert.equal(nodes.has(folder), false);
  assert.deepEqual(childIds("1"), ["10", "11", "12", "13", "14", "15", "16", "17"]);
  assert.deepEqual(childIds("16"), ["160"]);
});

test("applyPlan new: 폴더를 만들었지만 이동이 모두 실패하면 기록은 남긴다", { skip: SKIP }, async () => {
  failMove = new Set(["11", "13"]);
  const entry = await o.applyPlan(planNew([{ name: "쇼핑", items: ["11", "13"] }], ["12"]), "new");
  assert.equal(entry.skipped, 2);
  assert.deepEqual(entry.moves, []);
  assert.deepEqual(entry.createdFolderIds, [folderNamed("쇼핑")]);
  assert.equal(entry.kept, 1);
  assert.deepEqual(data.history, [entry]);
  assert.deepEqual(data.handledNew, ["12"]);
});

test("applyPlan: 북마크바가 없으면 아무것도 바꾸기 전에 오류", { skip: SKIP }, async () => {
  build([{ id: "2", title: "기타 북마크", folderType: "other", syncing: true, kids: [link("20", "메모")] }]);
  await assert.rejects(o.applyPlan(plan(["쇼핑", ["20"]]), "first"), /북마크바/);
  assert.deepEqual(calls, []);
});

// ---- N23 undo ----

test("undo: 섞어서 옮긴 것을 원래 순서로 되돌리고 만든 폴더를 지운다 (F13-03·04)", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(plan(["가", ["13", "11"]], ["나", ["14", "12"]]), "first");
  const result = await o.undo(entry.id);
  assert.deepEqual(result, { restored: 4, skipped: 0, fallback: 0 });
  assert.deepEqual(childIds("1"), ["10", "11", "12", "13", "14", "15", "16", "17"]);
  assert.equal(typeof data.history[0].undoneAt, "number");
});

test("undo: 되돌릴 때도 setPending이 이동보다 먼저다", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(plan(["가", ["11"]]), "first");
  calls = [];
  await o.undo(entry.id);
  const firstMove = calls.indexOf("bookmarks.move");
  assert.ok(calls.indexOf("storage.set") < firstMove);
  assert.equal(data.pendingMoves["11"].toParentId, "1");
});

test("undo: 정리 뒤에 사용자가 옮긴 북마크와 지워진 북마크는 건너뛴다 (F13-05·08)", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(plan(["가", ["11", "12", "13"]]), "first");
  await bookmarks.move("12", { parentId: "2" });
  await bookmarks.remove("13");
  const result = await o.undo(entry.id);
  assert.deepEqual(result, { restored: 1, skipped: 2, fallback: 0 });
  assert.deepEqual(childIds("2"), ["20", "12"]);
  assert.deepEqual(childIds("1"), ["10", "11", "14", "15", "16", "17"]);
});

test("undo: 원래 앞에 있던 것이 하나도 남아 있지 않으면 맨 앞에 놓는다 (F13-06)", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(plan(["가", ["172"]]), "first");
  // 정리 뒤 앞 이웃 170과 [하위]를 다른 곳으로 옮김
  await bookmarks.move("170", { parentId: "2" });
  await bookmarks.move("171", { parentId: "2" });
  const result = await o.undo(entry.id);
  assert.equal(result.restored, 1);
  assert.deepEqual(childIds("17"), ["172", "173"]);
});

test("undo: 하위 폴더가 앞 이웃이면 그 뒤에 놓는다", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(plan(["가", ["172"]]), "first");
  await bookmarks.move("173", { parentId: "17", index: 0 });
  await o.undo(entry.id);
  assert.deepEqual(childIds("17"), ["173", "170", "171", "172"]);
});

test("undo: 원래 폴더가 없으면 기타 북마크 맨 뒤로 원래 순서대로 옮기고 fallback에 센다 (F13-07)", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(plan(["가", ["173", "170", "11"]]), "first");
  await b.deleteFolderKeepChildren("171");
  await bookmarks.move("172", { parentId: "2" });
  await bookmarks.remove("17");
  calls = [];
  const result = await o.undo(entry.id);
  assert.deepEqual(result, { restored: 3, skipped: 0, fallback: 2 });
  assert.deepEqual(childIds("2"), ["20", "172", "170", "173"]);
  assert.equal(data.pendingMoves["170"].toParentId, "2");
  assert.ok(calls.indexOf("storage.set") < calls.indexOf("bookmarks.move"));
  assert.deepEqual(childIds("1").slice(0, 3), ["10", "11", "12"]);
});

test("undo: 원래 폴더도 기타 북마크도 없으면 건너뛴다", { skip: SKIP }, async () => {
  build([
    { id: "1", title: "북마크바", folderType: "bookmarks-bar", syncing: true, kids: [{ id: "17", title: "기본 폴더", kids: [link("170", "a")] }] },
  ]);
  const entry = await o.applyPlan(plan(["가", ["170"]]), "first");
  await bookmarks.remove("17");
  const result = await o.undo(entry.id);
  assert.deepEqual(result, { restored: 0, skipped: 1, fallback: 0 });
});

test("undo: 만든 폴더에 사용자가 넣은 것이 있으면 지우지 않고, 원래 있던 폴더는 비어도 남긴다 (F13-04)", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(plan(["가", ["11"]], ["개발", ["160"]], ["나", ["12"]]), "first");
  const ga = folderNamed("가");
  const na = folderNamed("나");
  await bookmarks.move("20", { parentId: na });
  // [개발]의 160은 이미 [개발]에 있으므로 옮기지 않음
  await bookmarks.move("160", { parentId: "2" });
  await o.undo(entry.id);
  assert.equal(nodes.has(ga), false);
  assert.deepEqual(childIds(na), ["20"]);
  assert.ok(nodes.has("16"));
  assert.deepEqual(childIds("16"), []);
});

test("undo: 없는 기록 ID는 오류, 이미 되돌린 기록은 아무것도 하지 않는다", { skip: SKIP }, async () => {
  await assert.rejects(o.undo("없는-id"), /정리 기록/);
  const entry = await o.applyPlan(plan(["가", ["11"]]), "first");
  await o.undo(entry.id);
  const undoneAt = data.history[0].undoneAt;
  await bookmarks.move("11", { parentId: "2" });
  calls = [];
  assert.deepEqual(await o.undo(entry.id), { restored: 0, skipped: 0, fallback: 0 });
  assert.deepEqual(calls, []);
  assert.equal(data.history[0].undoneAt, undoneAt);
});

test("undo: 동시에 두 번 불러도 한 번만 되돌린다", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(plan(["가", ["11", "13"]]), "first");
  const [first, second] = await Promise.all([o.undo(entry.id), o.undo(entry.id)]);
  assert.deepEqual(first, { restored: 2, skipped: 0, fallback: 0 });
  assert.deepEqual(second, { restored: 0, skipped: 0, fallback: 0 });
  assert.deepEqual(childIds("1"), ["10", "11", "12", "13", "14", "15", "16", "17"]);
});

test("undo: 이동 중 오류가 나면 그 북마크만 건너뛰고 계속한다", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(plan(["가", ["11", "13"]]), "first");
  failMove = new Set(["11"]);
  const result = await o.undo(entry.id);
  assert.deepEqual(result, { restored: 1, skipped: 1, fallback: 0 });
  assert.deepEqual(childIds("1").slice(0, 5), ["10", "12", "13", "14", "15"]);
  // 북마크가 남아 있으니 만든 폴더는 지우지 않는다
  assert.ok(nodes.has(folderNamed("가")));
  assert.equal(typeof data.history[0].undoneAt, "number");
});

// ---- 1단계 테스트 목록에서 더한 것 ----

test("applyPlan: 북마크바·기타 북마크·기본 폴더에 흩어진 북마크를 한 폴더로 모은다 (F07-01·02)", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(plan(["모음", ["11", "20", "172"]]), "first");
  const folder = folderNamed("모음");
  assert.equal(childIds("1").at(-1), folder);
  assert.deepEqual(childIds(folder), ["11", "20", "172"]);
  assert.equal(data.history.length, 1);
  const firstMove = calls.indexOf("bookmarks.move");
  assert.ok(calls.lastIndexOf("storage.set", firstMove) !== -1);
  for (const id of ["11", "20", "172"]) assert.equal(data.pendingMoves[id].toParentId, folder);
  assert.deepEqual(Object.keys(entry.fromOrder).sort(), ["1", "17", "2"]);
  assert.deepEqual(entry.fromOrder["2"], ["20"]);
  assert.deepEqual(entry.fromOrder["17"], ["170", "171", "172", "173"]);
});

test("applyPlan → undo: x0~x5 중 x2·x3·x4를 옮긴 뒤 되돌리면 x0~x5 순서 (F07-02, F13-03)", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(plan(["가", ["12", "13", "14"]]), "first");
  assert.deepEqual(entry.fromOrder["1"].slice(0, 6), ["10", "11", "12", "13", "14", "15"]);
  await o.undo(entry.id);
  assert.deepEqual(childIds("1"), ["10", "11", "12", "13", "14", "15", "16", "17"]);
});

test("applyPlan: 옮기는 도중 지워진 북마크는 skipped에 세고 moves에 넣지 않는다 (F07-09)", { skip: SKIP }, async () => {
  beforeMove = async (id) => {
    if (id !== "11") return;
    beforeMove = null;
    await bookmarks.remove("13");
  };
  const entry = await o.applyPlan(plan(["가", ["11", "12", "13"]]), "first");
  assert.equal(entry.skipped, 1);
  assert.deepEqual(entry.moves.map((m) => m.bookmarkId), ["11", "12"]);
  assert.deepEqual(childIds(folderNamed("가")), ["11", "12"]);
  assert.deepEqual(data.history[0].moves.map((m) => m.bookmarkId), ["11", "12"]);
});

test("undo: 정리 뒤 원래 폴더에 새 북마크가 생기고 다른 북마크가 지워져도 원래 순서를 지킨다 (F13-03 v4)", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(plan(["가", ["11", "13"]]), "first");
  const added = await bookmarks.create({ parentId: "1", title: "새것", url: "https://example.com/new" });
  await bookmarks.move(added.id, { parentId: "1", index: 1 });
  await bookmarks.remove("14");
  const result = await o.undo(entry.id);
  assert.deepEqual(result, { restored: 2, skipped: 0, fallback: 0 });
  assert.deepEqual(childIds("1"), ["10", "11", added.id, "12", "13", "15", "16", "17"]);
});

test("undo: 사용자가 만든 폴더에 넣은 북마크가 있으면 폴더와 북마크를 그대로 두고 꺼내지 않는다 (F13-04)", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(plan(["가", ["11"]]), "first");
  const ga = folderNamed("가");
  await bookmarks.move("20", { parentId: ga });
  moveLog = [];
  calls = [];
  await o.undo(entry.id);
  assert.ok(nodes.has(ga));
  assert.deepEqual(childIds(ga), ["20"]);
  assert.deepEqual(moveLog, ["11"]);
  assert.equal(calls.includes("bookmarks.remove"), false);
});

test("applyPlan: 기록 저장이 실패하면 기록 전체를 console.error로 남기고 오류를 던진다", { skip: SKIP }, async () => {
  failSetKey = "history";
  await assert.rejects(o.applyPlan(plan(["가", ["11", "13"]]), "first"), /저장 실패/);
  assert.equal(errors.length, 1);
  const entry = errors[0][1];
  assert.deepEqual(entry.moves.map((m) => m.bookmarkId), ["11", "13"]);
  assert.deepEqual(entry.createdFolderIds, [folderNamed("가")]);
  assert.deepEqual(childIds(folderNamed("가")), ["11", "13"]);
  assert.equal(data.history, undefined);
});

// ---- 독립 검토에서 더한 것 ----

test("applyPlan: 북마크바가 둘이면 동기화되는 북마크바 맨 뒤에 폴더를 만든다 (F07-01)", { skip: SKIP }, async () => {
  build([
    { id: "5", title: "북마크바", folderType: "bookmarks-bar", syncing: false, kids: [link("50", "이 PC")] },
    ...structuredClone(SAMPLE),
  ]);
  const entry = await o.applyPlan(plan(["가", ["50", "10"]]), "first");
  const folder = folderNamed("가", "1");
  assert.equal(childIds("1").at(-1), folder);
  assert.deepEqual(childIds(folder), ["50", "10"]);
  assert.deepEqual(entry.createdFolderIds, [folder]);
  assert.deepEqual(entry.fromOrder["5"], ["50"]);
});

test("applyPlan: 같은 탭에서 동시에 두 번 불러도 한 번만 옮기고 기록도 한 건이다", { skip: SKIP }, async () => {
  const p = plan(["가", ["11", "13"]]);
  const [first, second] = await Promise.all([o.applyPlan(p, "first"), o.applyPlan(p, "first")]);
  assert.equal(first.moves.length, 2);
  assert.deepEqual(second.moves, []);
  assert.deepEqual(second.createdFolderIds, []);
  assert.equal(data.history.length, 1);
  assert.equal(childIds("1").filter((id) => nodes.get(id).title === "가").length, 1);
});

test("undo: 원래 폴더가 기타 북마크이고 정리 뒤 그 안 순서가 바뀌어도 이웃 기준으로 되돌린다", { skip: SKIP }, async () => {
  const p1 = await bookmarks.create({ parentId: "2", title: "p", url: "https://example.com/p" });
  const q1 = await bookmarks.create({ parentId: "2", title: "q", url: "https://example.com/q" });
  const r1 = await bookmarks.create({ parentId: "2", title: "r", url: "https://example.com/r" });
  const entry = await o.applyPlan(plan(["가", ["20", q1.id]]), "first");
  await bookmarks.move(r1.id, { parentId: "2", index: 0 });
  const result = await o.undo(entry.id);
  assert.deepEqual(result, { restored: 2, skipped: 0, fallback: 0 });
  assert.deepEqual(childIds("2"), ["20", r1.id, p1.id, q1.id]);
});

test("undo: fromOrder에 없는 옛 기록은 fromIndex 자리로, 숫자 ID의 fromOrder도 이웃 기준으로 되돌린다", { skip: SKIP }, async () => {
  await bookmarks.move("12", { parentId: "16" });
  await bookmarks.move("13", { parentId: "16" });
  data.history = [
    { id: "old", at: 1, type: "first", createdFolderIds: [], skipped: 0, fromOrder: {},
      moves: [{ bookmarkId: "12", title: "x2", fromParentId: "1", fromIndex: 2, toParentId: "16" }] },
    { id: "num", at: 1, type: "first", createdFolderIds: [], skipped: 0, fromOrder: { 1: [10, 11, 12, 13, 14, 15, 16, 17] },
      moves: [{ bookmarkId: 13, title: "x3", fromParentId: 1, fromIndex: 0, toParentId: 16 }] },
  ];
  assert.deepEqual(await o.undo("old"), { restored: 1, skipped: 0, fallback: 0 });
  assert.deepEqual(childIds("1").slice(0, 4), ["10", "11", "12", "14"]);
  assert.deepEqual(await o.undo("num"), { restored: 1, skipped: 0, fallback: 0 });
  assert.deepEqual(childIds("1").slice(0, 5), ["10", "11", "12", "13", "14"]);
});

// ---- 북마크바 최신화 (touchBookmarksBar · 디바운스) ----

test("applyPlan: 정리 뒤 최신화가 한 번 예약되고, 실행하면 북마크바가 가장 최근 폴더가 되며 임시 북마크는 남지 않는다", { skip: SKIP }, async () => {
  const entry = await o.applyPlan(plan(["가", ["11", "13"]]), "first");
  assert.equal(entry.moves.length, 2);
  // 바로 실행하지 않는다
  assert.equal(searches(), 0);
  await b.flushBarTouch();
  assert.equal(searches(), 1);
  assert.equal(touches(), 1);
  assert.equal(newestFolder(), "1");
  assert.deepEqual(touchNodes(), []);
  assert.ok(!JSON.stringify(data).includes("barolink.invalid"));
});

test("디바운스: 실제로 500ms 동안 다른 변경이 없을 때 한 번만 실행한다", { skip: SKIP }, async () => {
  await b.moveBookmark("11", "16");
  await sleep(300);
  await b.moveBookmark("12", "17");
  await sleep(300);
  // 두 번째 변경에서 시간을 다시 잰다 → 첫 변경 뒤 600ms가 지났지만 아직 실행 전
  assert.equal(searches(), 0);
  await sleep(350);
  await b.flushBarTouch();
  assert.equal(searches(), 1);
  assert.equal(touches(), 1);
  assert.equal(newestFolder(), "1");
});

test("디바운스: 여러 함수로 연속해서 바꿔도 최신화는 1회", { skip: SKIP }, async () => {
  const folder = await b.createFolder("새 폴더", "1");
  await b.moveBookmark("11", folder.id);
  await b.renameFolder(folder.id, "새 이름");
  const saved = await b.removeBookmark("12");
  await b.restoreBookmark(saved);
  await b.deleteFolderKeepChildren("16");
  await o.applyPlan({ folders: [{ folderId: "17", items: ["13", "14"] }] }, "new");
  assert.equal(searches(), 0);
  await b.flushBarTouch();
  assert.equal(searches(), 1);
  assert.equal(touches(), 1);
  assert.deepEqual(touchNodes(), []);
});

test("각 함수 뒤에 최신화가 예약된다 (createFolder, moveBookmark, renameFolder, deleteFolderKeepChildren, removeBookmark, restoreBookmark)", { skip: SKIP }, async () => {
  let saved;
  const cases = [
    ["createFolder", () => b.createFolder("예약 확인", "1")],
    ["moveBookmark", () => b.moveBookmark("11", "17")],
    ["renameFolder", () => b.renameFolder("16", "개발2")],
    ["removeBookmark", async () => { saved = await b.removeBookmark("12"); }],
    ["restoreBookmark", () => b.restoreBookmark(saved)],
    ["deleteFolderKeepChildren", () => b.deleteFolderKeepChildren("16")],
  ];
  for (const [name, run] of cases) {
    calls = [];
    await run();
    assert.equal(searches(), 0, `${name}: 바로 실행하지 않는다`);
    await b.flushBarTouch();
    assert.equal(searches(), 1, `${name}: 끝난 뒤 최신화가 예약돼 있었다`);
  }
});

test("바꾸지 못하면 예약하지 않는다 (없는 북마크 옮기기·지우기, 같은 이름 폴더)", { skip: SKIP }, async () => {
  assert.equal(await b.moveBookmark("없음", "17"), null);
  assert.equal(await b.removeBookmark("없음"), null);
  await b.createFolder("개발", "1");
  await assert.rejects(b.renameFolder("16", "  "));
  await b.flushBarTouch();
  assert.equal(searches(), 0);
});

test("최신화는 자기 자신을 다시 예약하지 않는다 (임시 북마크 생성·삭제는 예약 없음)", { skip: SKIP }, async () => {
  await b.moveBookmark("11", "17");
  await b.flushBarTouch();
  assert.equal(touches(), 1);
  // 최신화가 끝난 뒤 예약된 것이 없어야 한다. 기다려도, 다시 비워도 더 실행되지 않는다
  calls = [];
  await sleep(600);
  assert.equal(await b.flushBarTouch(), false);
  assert.equal(searches(), 0);
  assert.equal(touches(), 0);
});

test("applyPlan 도중에는 예약된 최신화가 실행되지 않고, 끝난 뒤 한 번 다시 예약된다", { skip: SKIP }, async () => {
  // 정리 전에 예약된 것이 있어도 정리 도중에 실행되지 않는다
  await b.moveBookmark("15", "17");
  beforeMove = () => sleep(300);
  await o.applyPlan(plan(["가", ["11", "12", "13"]]), "first");
  beforeMove = null;
  assert.equal(touches(), 0);
  await b.flushBarTouch();
  assert.equal(touches(), 1);
  assert.equal(newestFolder(), "1");
});

test("undo: 사용자 폴더로 되돌린 뒤에도 최신화가 한 번 예약된다", { skip: SKIP }, async () => {
  const entry = await o.applyPlan({ folders: [{ folderId: "16", items: ["170"] }] }, "new");
  await b.flushBarTouch();
  calls = [];
  const result = await o.undo(entry.id);
  assert.equal(result.restored, 1);
  assert.equal(searches(), 0);
  await b.flushBarTouch();
  assert.equal(touches(), 1);
  assert.equal(newestFolder(), "1");
});

test("undo: 북마크바로만 되돌리면 북마크바가 이미 최근이라 임시 북마크를 만들지 않는다", { skip: SKIP }, async () => {
  const entry = await o.applyPlan({ folders: [{ folderId: "16", items: ["11"] }] }, "new");
  await b.flushBarTouch();
  calls = [];
  await o.undo(entry.id);
  await b.flushBarTouch();
  assert.equal(searches(), 1);
  assert.equal(touches(), 0);
  assert.equal(newestFolder(), "1");
});

test("applyPlan: 최신화가 실패해도 정리 결과와 기록은 그대로이고 warn만 남긴다", { skip: SKIP }, async () => {
  failTouch = true;
  const entry = await o.applyPlan(plan(["가", ["11", "13"]]), "first");
  assert.equal(await b.flushBarTouch(), false);
  assert.equal(entry.moves.length, 2);
  assert.equal(entry.skipped, 0);
  assert.equal(data.history.length, 1);
  assert.equal(errors.length, 0);
  assert.ok(warnings.some((w) => w.includes("최근 수정 폴더")));
});

test("touchBookmarksBar: 지난번에 남은 임시 북마크를 다음 호출에서 함께 지운다", { skip: SKIP }, async () => {
  // 지우기 전에 끊긴 것처럼 임시 북마크 두 개를 남겨 둔다 (하나는 사용자 폴더 안)
  await bookmarks.create({ parentId: "1", title: "BaroLink", url: b.TOUCH_URL });
  await bookmarks.create({ parentId: "17", title: "BaroLink", url: b.TOUCH_URL });
  assert.equal(touchNodes().length, 2);
  assert.equal(await b.touchBookmarksBar(), true);
  assert.deepEqual(touchNodes(), []);
  assert.equal(newestFolder(), "1");
});

test("touchBookmarksBar: 북마크바가 이미 가장 최근이면 임시 북마크를 만들지 않는다", { skip: SKIP }, async () => {
  nodes.get("16").dateGroupModified = 5;
  nodes.get("1").dateGroupModified = 9;
  clock = 9;
  assert.equal(await b.touchBookmarksBar(), false);
  assert.equal(touches(), 0);
  nodes.get("17").dateGroupModified = 10;
  clock = 10;
  assert.equal(await b.touchBookmarksBar(), true);
  assert.equal(newestFolder(), "1");
});

test("loadTree: 임시 북마크는 북마크 목록·폴더 자식·루트 자식 어디에도 넣지 않는다", { skip: SKIP }, async () => {
  const temp = await bookmarks.create({ parentId: "1", title: "BaroLink", url: b.TOUCH_URL });
  const inFolder = await bookmarks.create({ parentId: "17", title: "BaroLink", url: b.TOUCH_URL });
  const tree = await b.loadTree();
  const ids = [temp.id, inFolder.id];
  assert.ok(!tree.bookmarks.some((bm) => ids.includes(bm.id)));
  assert.ok(!tree.roots.bar.childIds.some((id) => ids.includes(id)));
  assert.ok(!tree.folders.find((f) => f.id === "17").childIds.some((id) => ids.includes(id)));
});
