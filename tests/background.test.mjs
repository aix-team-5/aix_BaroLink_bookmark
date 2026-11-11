// extension/background.js 테스트 (팀원 B · 이슈 #6)
// 실행: node --test "tests/*.test.mjs"   (Node 20 이상. 따옴표가 필요하다)
// 진짜 store.js를 쓰고, 크롬 없이 돌리기 위해 가짜 chrome.bookmarks · storage.local · runtime을 넣는다.
// background.js는 불러오는 순간 리스너를 등록하므로, 등록된 함수를 잡아 두었다가 알림처럼 직접 부른다.
// 서비스 워커처럼 돌리기 위해 document를 두지 않는다 (store.js는 document가 없으면 서비스 워커로 본다).

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

// ---- 가짜 chrome.storage.local ----
let data = {};
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const storage = {
  async get(keys) {
    await tick();
    const list = keys == null ? Object.keys(data) : typeof keys === "string" ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
    const out = {};
    for (const key of list) if (Object.hasOwn(data, key)) out[key] = structuredClone(data[key]);
    return out;
  },
  async set(items) {
    await tick();
    for (const [key, value] of Object.entries(items)) data[key] = structuredClone(value);
  },
};

// ---- 가짜 chrome.bookmarks ----
// 최상위 폴더 4개(folderType 있음) 아래에 사용자 폴더 하나
let nodes = {};
// 이 ID를 get할 때 늦게 답한다 (알림 순서 경쟁을 만들기 위해)
let slowIds = new Set();
function resetTree() {
  nodes = {
    0: { id: "0" },
    1: { id: "1", parentId: "0", title: "북마크바", folderType: "bookmarks-bar" },
    2: { id: "2", parentId: "0", title: "기타 북마크", folderType: "other" },
    3: { id: "3", parentId: "0", title: "모바일 북마크", folderType: "mobile" },
    4: { id: "4", parentId: "0", title: "관리 북마크", folderType: "managed" },
    10: { id: "10", parentId: "1", title: "졸업프로젝트" },
  };
  slowIds = new Set();
}
const listeners = {};
const event = (name) => ({ addListener: (fn) => { listeners[name] = fn; } });
const bookmarks = {
  async get(id) {
    await (slowIds.has(String(id)) ? new Promise((resolve) => setTimeout(resolve, 30)) : tick());
    const node = nodes[String(id)];
    if (!node) throw new Error(`Can't find bookmark for id. (${id})`);
    return [structuredClone(node)];
  },
  onCreated: event("onCreated"),
  onMoved: event("onMoved"),
  onRemoved: event("onRemoved"),
  onImportBegan: event("onImportBegan"),
  onImportEnded: event("onImportEnded"),
};
globalThis.chrome = {
  storage: { local: storage },
  bookmarks,
  runtime: { onInstalled: event("onInstalled") },
};
delete globalThis.document;

await import("../extension/background.js");

// 북마크를 만들고 onCreated 알림을 보낸다 (크롬처럼 node에는 url이 있다. 폴더면 url 없음)
let nextId = 100;
function create(parentId, { folder = false } = {}) {
  const id = String(nextId++);
  nodes[id] = folder ? { id, parentId: String(parentId), title: `폴더 ${id}` } : { id, parentId: String(parentId), title: `북마크 ${id}`, url: `https://example.com/${id}` };
  return { id, fire: () => listeners.onCreated(id, structuredClone(nodes[id])) };
}
function move(id, parentId) {
  const oldParentId = nodes[id].parentId;
  nodes[id].parentId = String(parentId);
  return listeners.onMoved(id, { parentId: String(parentId), oldParentId, index: 0, oldIndex: 0 });
}

beforeEach(() => {
  data = {};
  resetTree();
});

test("리스너: 파일을 불러오면 알림 6개가 모두 등록된다", () => {
  for (const name of ["onInstalled", "onCreated", "onMoved", "onRemoved", "onImportBegan", "onImportEnded"]) {
    assert.equal(typeof listeners[name], "function", name);
  }
});

test("onCreated: 북마크바·기타·모바일 바로 아래에 저장하면 newBookmarks에 추가 (F10-01)", async () => {
  const a = create(1);
  const b = create(2);
  const c = create(3);
  await a.fire();
  await b.fire();
  await c.fire();
  assert.deepEqual(data.newBookmarks, [a.id, b.id, c.id]);
});

test("onCreated: 사용자 폴더 안·관리 폴더 안에 저장하면 추가하지 않는다 (F10-09)", async () => {
  await create(10).fire();
  await create(4).fire();
  assert.equal(Object.hasOwn(data, "newBookmarks"), false);
});

test("onCreated: 폴더는 추가하지 않는다", async () => {
  await create(1, { folder: true }).fire();
  assert.equal(Object.hasOwn(data, "newBookmarks"), false);
});

test("onCreated: 같은 알림이 두 번 와도 한 번만 들어간다", async () => {
  const a = create(1);
  await a.fire();
  await a.fire();
  assert.deepEqual(data.newBookmarks, [a.id]);
});

test("onCreated: 부모 폴더를 못 읽으면 기록하지 않고 오류를 밖으로 던지지 않는다", async () => {
  const a = create(1);
  const node = structuredClone(nodes[a.id]);
  node.parentId = "999";
  const warn = console.warn;
  console.warn = () => {};
  try {
    await listeners.onCreated(a.id, node);
  } finally {
    console.warn = warn;
  }
  assert.equal(Object.hasOwn(data, "newBookmarks"), false);
});

test("onMoved: 새 북마크를 다른 폴더로 옮기면 newBookmarks에서 빼고 manualMoves에 기록 (F10-08, F07-06)", async () => {
  const a = create(1);
  await a.fire();
  await move(a.id, 10);
  assert.deepEqual(data.newBookmarks, []);
  assert.equal(typeof data.manualMoves[a.id], "number");
});

test("onMoved: 우리 정리의 이동(pendingMoves 1분 안)은 newBookmarks에서 빼지만 manualMoves에는 기록하지 않는다 (F10-05, F07-05)", async () => {
  const a = create(1);
  await a.fire();
  data.pendingMoves = { [a.id]: { toParentId: "10", at: Date.now() } };
  await move(a.id, 10);
  assert.deepEqual(data.newBookmarks, []);
  assert.equal(Object.hasOwn(data, "manualMoves"), false);
});

test("onMoved: 순서만 바뀐 이동은 아무것도 바꾸지 않는다", async () => {
  const a = create(1);
  await a.fire();
  await listeners.onMoved(a.id, { parentId: "1", oldParentId: "1", index: 0, oldIndex: 3 });
  assert.deepEqual(data.newBookmarks, [a.id]);
  assert.equal(Object.hasOwn(data, "manualMoves"), false);
});

test("onCreated → onMoved를 기다리지 않고 연달아 보내도 이동이 마지막에 반영된다 (별 버튼 창에서 폴더를 바꾼 경우)", async () => {
  const a = create(1);
  // 저장 처리가 부모 폴더를 늦게 읽어도, 이동 처리가 먼저 끝나 지운 ID를 다시 넣으면 안 된다
  slowIds.add("1");
  const created = a.fire();
  nodes[a.id].parentId = "10";
  const moved = listeners.onMoved(a.id, { parentId: "10", oldParentId: "1", index: 0, oldIndex: 0 });
  await Promise.all([created, moved]);
  assert.deepEqual(data.newBookmarks, []);
  assert.equal(typeof data.manualMoves[a.id], "number");
});

test("onRemoved: 지운 새 북마크는 newBookmarks에서도 빠진다 (F01-06)", async () => {
  const a = create(1);
  const b = create(2);
  await a.fire();
  await b.fire();
  await listeners.onRemoved(a.id, { parentId: "1", index: 0, node: structuredClone(nodes[a.id]) });
  assert.deepEqual(data.newBookmarks, [b.id]);
});
