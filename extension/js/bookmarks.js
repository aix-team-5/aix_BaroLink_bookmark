// 담당: 팀원 A · 이슈 #2 · 명세: N01~N07, N48~N49 (F01, F02, F03, F07, F15) · 크롬 API: C04~C08, C18, C22
// 크롬 북마크를 읽고 바꾸는 통로. 크롬을 부르는 함수는 async다.

import { recordOpened, setPending } from "./store.js";

// 최상위 폴더의 folderType → rootType
const ROOT_TYPES = {
  "bookmarks-bar": "bar",
  other: "other",
  mobile: "mobile",
  managed: "managed",
};

// 파비콘 비교에 쓰는 크기와, 파비콘이 있을 수 없는 주소 (기본 그림을 받는 데 씀)
const FAVICON_SIZE = 32;
const NO_FAVICON_PAGE = "https://no-favicon.invalid/";

// 별(☆) 창의 기본 폴더를 북마크바로 되돌릴 때 잠깐 만들었다 지우는 임시 북마크의 주소와 제목
// .invalid는 실제로 열리지 않는 주소다. 이 주소의 북마크는 loadTree가 빼고, 서비스 워커(background.js)가 기록하지 않는다
export const TOUCH_URL = "https://barolink.invalid/touch";
const TOUCH_TITLE = "BaroLink";

// N01: 크롬 북마크를 읽어 화면과 규칙이 쓰기 쉬운 목록으로 바꾼다
export async function loadTree() {
  const [top] = await chrome.bookmarks.getTree();
  const tops = top?.children ?? [];
  const roots = {
    bar: pickRoot(tops, "bookmarks-bar"),
    other: pickRoot(tops, "other"),
    mobile: pickRoot(tops, "mobile"),
  };
  const chosen = new Set(Object.values(roots).filter(Boolean).map((root) => root.id));

  const bookmarks = [];
  const folders = [];
  // 고르지 않은 쪽(두 번째 기타 북마크 등)의 북마크도 넣는다. 북마크 관리자의 개수와 맞추기 위해서다 (F01-01)
  for (const root of tops) {
    const base = {
      rootType: ROOT_TYPES[root.folderType] ?? null,
      rootId: root.id,
      rootChosen: chosen.has(root.id),
    };
    collect(root.children ?? [], root.title, [], base, bookmarks, folders);
  }
  return { roots, bookmarks, folders };
}

// 같은 folderType이 둘이면 동기화되는 쪽, 둘 다 같으면 앞쪽을 고른다. 없으면 null
function pickRoot(tops, folderType) {
  const candidates = tops.filter((node) => node.folderType === folderType);
  const root = candidates.find((node) => node.syncing === true) ?? candidates[0];
  if (!root) return null;
  return {
    id: root.id,
    title: root.title,
    folderType: root.folderType,
    syncing: root.syncing === true,
    childIds: visibleChildren(root.children).map((child) => child.id),
  };
}

// 임시 북마크(TOUCH_URL)를 뺀 자식 목록. 지우기 전의 짧은 순간에도 화면과 정리 계산에 섞이지 않게 한다
function visibleChildren(children) {
  return (children ?? []).filter((child) => child.url !== TOUCH_URL);
}

// 트리를 내려가며 북마크와 폴더를 펼친다. path는 최상위 폴더 아래의 폴더 이름들
function collect(nodes, folderTitle, path, base, bookmarks, folders) {
  for (const node of visibleChildren(nodes)) {
    if (node.url !== undefined) {
      const item = {
        id: node.id,
        title: node.title,
        url: node.url,
        parentId: node.parentId,
        index: node.index,
        dateAdded: node.dateAdded,
      };
      // 한 번도 안 연 북마크에는 dateLastUsed가 없다. 크롬처럼 필드를 넣지 않는다
      if (node.dateLastUsed !== undefined) item.dateLastUsed = node.dateLastUsed;
      // 관리자가 정한 북마크에만 있다("managed"). 이것도 크롬에 있을 때만 넣는다 (F15-10)
      if (node.unmodifiable !== undefined) item.unmodifiable = node.unmodifiable;
      // path는 항목마다 복사한다. 한 항목의 path를 고쳐도 다른 항목이 바뀌지 않게
      bookmarks.push({ ...item, folderTitle, ...base, path: [...path] });
      continue;
    }
    const children = visibleChildren(node.children);
    folders.push({
      id: node.id,
      title: node.title,
      parentId: node.parentId,
      index: node.index,
      dateAdded: node.dateAdded,
      ...base,
      path: [...path],
      childIds: children.map((child) => child.id),
    });
    collect(children, node.title, [...path, node.title], base, bookmarks, folders);
  }
}

// N02: 같은 이름의 폴더가 있으면 그 폴더를, 없으면 새로 만들어 돌려준다
export async function createFolder(name, parentId) {
  const title = typeof name === "string" ? name.trim() : "";
  if (!title) throw new Error("폴더 이름이 비어 있어요");
  // 최상위(루트) 바로 아래에는 만들 수 없다 (C05)
  if (String(parentId) === "0") throw new Error("최상위에는 폴더를 만들 수 없어요");
  const children = await chrome.bookmarks.getChildren(String(parentId));
  // 북마크바·기타 북마크 같은 최상위 폴더(folderType 있음)는 같은 이름이어도 고르지 않는다
  const same = children
    .filter((node) => node.url === undefined && !node.folderType && node.title === title)
    .sort((a, b) => a.index - b.index)[0];
  if (same) return same;
  const folder = await chrome.bookmarks.create({ parentId: String(parentId), title });
  // 새 폴더가 '최근 수정 폴더'가 될 수 있으므로 북마크바 최신화를 예약한다 (scheduleBarTouch)
  scheduleBarTouch();
  return folder;
}

// N03: 북마크 하나를 옮긴다. 북마크가 없으면 null
// index는 옮긴 뒤 놓일 위치다. 크롬은 같은 폴더 안에서 뒤쪽으로 옮기면 한 칸 앞에 놓으므로 그만큼 맞춘다
export async function moveBookmark(id, parentId, index) {
  const node = await findNode(id);
  if (!node) return null;
  const destination = { parentId: String(parentId) };
  // 유한한 수가 아니면(NaN, "abc", "" 등) index를 넘기지 않는다(맨 뒤). 음수는 0, 소수는 버린다
  const wanted = typeof index === "number" || (typeof index === "string" && index.trim() !== "") ? Number(index) : NaN;
  if (Number.isFinite(wanted)) {
    const count = (await chrome.bookmarks.getChildren(destination.parentId)).length;
    let target = Math.max(0, Math.trunc(wanted));
    if (node.parentId === destination.parentId) {
      target = Math.min(target, count - 1);
      if (target > node.index) target += 1;
    } else {
      // 목적지 폴더의 개수보다 크면 "Index out of bounds" 오류가 나므로 줄인다
      target = Math.min(target, count);
    }
    destination.index = target;
  }
  let moved;
  try {
    moved = await chrome.bookmarks.move(node.id, destination);
  } catch (error) {
    // 그사이 지워졌으면 null, 그 밖의 오류(목적지 없음 등)는 그대로 던진다
    if (!(await findNode(node.id))) return null;
    throw error;
  }
  // 옮긴 폴더가 '최근 수정 폴더'가 되므로 북마크바 최신화를 예약한다. 끌어 놓기·폴더로 이동도 여기를 거친다
  scheduleBarTouch();
  return moved;
}

// 북마크 하나를 찾는다. 없으면 null
async function findNode(id) {
  try {
    const [node] = await chrome.bookmarks.get(String(id));
    return node ?? null;
  } catch {
    return null;
  }
}

// N04: 앱 폴더 이름 바꾸기. 바뀐 노드를 돌려준다 (createFolder처럼 크롬 노드 그대로)
// 이름은 앞뒤 공백을 자르고 저장한다. 빈 이름·없는 폴더·바꿀 수 없는 폴더면 바꾸지 않고 오류를 던진다
export async function renameFolder(id, name) {
  const title = typeof name === "string" ? name.trim() : "";
  if (!title) throw new Error("폴더 이름이 비어 있어요");
  const node = await findNode(id);
  if (!node) throw new Error("폴더를 찾지 못했어요");
  // 관리자가 정한 폴더(managed)는 바꿀 수 없다
  if (node.unmodifiable) throw new Error("바꿀 수 없는 폴더예요");
  if (node.url !== undefined) throw new Error("폴더가 아니에요");
  // 루트("0")는 parentId가 없다
  if (node.parentId === undefined) throw new Error("최상위 폴더는 이름을 바꿀 수 없어요");
  if (node.folderType) throw new Error("북마크바·기타 북마크·모바일 북마크는 이름을 바꿀 수 없어요");
  const renamed = await chrome.bookmarks.update(node.id, { title });
  // 크롬이 수정 시각을 바꾸지 않을 수도 있지만 무해하므로 북마크바 최신화를 예약한다
  scheduleBarTouch();
  return renamed;
}

// N05: 안의 북마크를 상위 폴더로 꺼낸 뒤 폴더만 삭제. 꺼낸 북마크 수를 돌려준다
// 꺼낸 것은 폴더가 있던 자리에 원래 순서대로 놓는다. 안의 폴더도 함께 꺼내지만(비어야 지울 수 있다) 세지 않는다
// 중간에 이동이 실패하면 일부만 꺼낸 채 오류를 던진다 (이미 꺼낸 것은 상위 폴더에 남는다)
export async function deleteFolderKeepChildren(id) {
  const [folder] = await chrome.bookmarks.get(String(id));
  // 관리자가 정한 폴더(managed)는 바꿀 수 없다
  if (folder.unmodifiable) throw new Error("바꿀 수 없는 폴더예요");
  if (folder.url !== undefined) throw new Error("폴더가 아니에요");
  if (folder.folderType) throw new Error("북마크바·기타 북마크·모바일 북마크는 지울 수 없어요");

  const children = await chrome.bookmarks.getChildren(folder.id);
  let placed = 0;
  let moved = 0;
  if (children.length > 0) {
    // 꺼내는 이동이 직접 옮김으로 기록되지 않게, 저장이 끝난 뒤에 옮긴다
    await setPending(children.map((child) => ({ id: child.id, toParentId: folder.parentId })));
    for (const child of children) {
      const result = await moveBookmark(child.id, folder.parentId, folder.index + placed);
      if (!result) continue;
      placed++;
      if (result.url !== undefined) moved++;
    }
  }
  // removeTree는 쓰지 않는다(안의 북마크까지 지워짐). 비어 있지 않으면 크롬이 오류를 낸다
  await chrome.bookmarks.remove(folder.id);
  // 꺼낸 북마크가 들어간 폴더가 '최근 수정 폴더'가 될 수 있으므로 북마크바 최신화를 예약한다 (꺼낼 때마다 예약해도 디바운스로 한 번만 실행)
  scheduleBarTouch();
  return moved;
}

// N48: 북마크 하나를 지우고, 되살리기에 쓸 정보 { id, title, url, parentId, index }를 돌려준다. 이미 없으면 null (F15-11)
// 폴더는 지우지 않는다(N05). 관리자가 정한 북마크(unmodifiable)는 오류 (F15-10)
// 돌려준 정보는 저장하지 않는다. 부르는 쪽이 화면 메모리에만 두고 6초 뒤 버린다 (F15-12)
export async function removeBookmark(id) {
  const node = await findNode(id);
  if (!node) return null;
  if (node.unmodifiable) throw new Error("바꿀 수 없는 북마크예요");
  if (node.url === undefined) throw new Error("북마크가 아니에요 (폴더는 여기서 지우지 않아요)");
  // 지우면 크롬에서 다시 읽을 수 없으므로 먼저 만들어 둔다
  const saved = { id: node.id, title: node.title, url: node.url, parentId: node.parentId, index: node.index };
  try {
    await chrome.bookmarks.remove(node.id);
  } catch (error) {
    // 그사이 지워졌으면 null, 그 밖의 오류는 그대로 던진다
    if (!(await findNode(node.id))) return null;
    throw error;
  }
  // 크롬이 수정 시각을 바꾸지 않을 수도 있지만 무해하므로 북마크바 최신화를 예약한다
  scheduleBarTouch();
  return saved;
}

// N49: removeBookmark가 돌려준 정보로 같은 제목·주소의 북마크를 원래 폴더의 원래 자리에 다시 만든다 (새 ID, F15-07)
// index가 폴더 안 항목 수보다 크면 맨 뒤. 원래 폴더가 없으면 기타 북마크 맨 뒤에 만들고 fallback: true (F15-08)
// 돌려주는 node는 크롬 노드 그대로다
export async function restoreBookmark(saved) {
  if (!saved || typeof saved.url !== "string" || saved.url === "") throw new Error("되살릴 주소가 없어요");
  if (saved.parentId === undefined || saved.parentId === null || saved.parentId === "") {
    throw new Error("되살릴 폴더가 없어요");
  }
  const title = typeof saved.title === "string" ? saved.title : "";
  const parent = await findNode(saved.parentId);
  // 폴더 ID는 다시 쓰이지 않으므로, 폴더가 아닌 노드가 나오면 원래 폴더가 없는 것으로 본다
  if (parent && parent.url === undefined) {
    const details = { parentId: parent.id, title, url: saved.url };
    try {
      if (typeof saved.index === "number" && Number.isFinite(saved.index)) {
        // 폴더의 개수보다 크면 크롬이 "Index out of bounds" 오류를 내므로 줄인다
        const count = (await chrome.bookmarks.getChildren(parent.id)).length;
        details.index = Math.min(Math.max(0, Math.trunc(saved.index)), count);
      }
      const node = await chrome.bookmarks.create(details);
      // 원래 폴더가 '최근 수정 폴더'가 되므로 북마크바 최신화를 예약한다
      scheduleBarTouch();
      return { node, fallback: false };
    } catch (error) {
      // 확인한 직후 폴더가 지워졌으면 기타 북마크로, 그 밖의 오류는 그대로 던진다
      if (await findNode(parent.id)) throw error;
    }
  }
  const node = await createInOther(title, saved.url);
  scheduleBarTouch();
  return { node, fallback: true };
}

// ---- 별(☆) 창의 기본 폴더를 북마크바로 되돌리기 ----
// 크롬의 별 창은 저장 위치로 '가장 최근에 내용이 바뀐 폴더'(dateGroupModified가 가장 최근인 폴더)를 기본으로 고른다.
// 우리가 북마크를 사용자 폴더로 옮기면 그 폴더가 기본이 되어, 다음 별 저장이 그 폴더 안으로 들어가 'new'가 뜨지 않는다 (F10-01, F10-09).
// 그래서 북마크를 바꾼 뒤 북마크바 바로 아래에 임시 북마크를 만들고 곧바로 지워 북마크바를 다시 '최근 수정 폴더'로 만든다(북마크바 최신화).
// 북마크를 바꾸는 export 함수(createFolder, moveBookmark, renameFolder, deleteFolderKeepChildren, removeBookmark, restoreBookmark)는
// 끝난 뒤 scheduleBarTouch로 최신화를 예약한다. 마지막 예약 뒤 TOUCH_DELAY_MS 동안 다른 예약이 없으면 한 번만 실행한다(디바운스).
// 최신화는 chrome.bookmarks를 직접 불러 임시 북마크를 만들고 지우므로, 다시 최신화를 예약하지 않는다(무한 반복 없음).
// 주의: 이것은 공식 API가 아니라 크롬 내부 동작(별 창 기본 폴더 = 최근 수정 폴더)에 기댄 것이다. 크롬 버전에 따라 효과가 없을 수 있다.
// 북마크를 다른 위치로 옮기지 않는다. 임시 북마크를 만들고 지우는 것만 한다.

// 마지막 변경 뒤 이만큼 다른 변경이 없으면 최신화한다
const TOUCH_DELAY_MS = 500;
// 예약된 최신화 타이머. 없으면 null
let touchTimer = null;
// holdBarTouch가 진행 중인 수. 0보다 크면 타이머가 끝나도 실행하지 않고, 모두 끝난 뒤 다시 예약한다
let touchHold = 0;
let touchWanted = false;
// 같은 탭에서 최신화가 겹치지 않게 한 줄로 세운다
let touchQueue = Promise.resolve();

// 최신화 예약이 남아 있다는 표시(chrome.storage.local의 내부 키). 예약할 때 남기고, 최신화가 끝나면(만들었든 필요 없었든) 지운다
// 새 탭을 0.5초 안에 닫아 예약이 실행되지 못했을 때, 다음 새 탭이 이 표시를 보고 한 번 최신화한다 (touchBookmarksBarIfPending)
// 표시가 없으면 새 탭을 열어도 크롬 북마크를 바꾸지 않는다. 사용자가 별 창으로 사용자 폴더에 직접 저장한 뒤에도 마찬가지다 (docs/privacy.md 4절)
// store.js를 거치지 않는 bookmarks.js만의 내부 키다. 새 탭만 쓰고 서비스 워커는 쓰지 않는다
const TOUCH_PENDING_KEY = "barTouchPending";
// 이 탭이 표시를 남겼는지. 같은 표시를 여러 번 쓰지 않으려고 둔다
let pendingMarked = false;
let markTask = Promise.resolve();

function markTouchPending() {
  if (pendingMarked) return;
  pendingMarked = true;
  markTask = chrome.storage.local.set({ [TOUCH_PENDING_KEY]: true }).catch((error) => {
    pendingMarked = false;
    console.warn("북마크바 최신화 예약 표시를 남기지 못했어요", error);
  });
}

// 최신화가 끝난 뒤 부른다. 그사이 새 예약이 생겼으면 표시를 남겨 둔다
async function clearTouchPending() {
  if (touchTimer !== null || touchHold > 0 || touchWanted) return;
  pendingMarked = false;
  try {
    await chrome.storage.local.remove(TOUCH_PENDING_KEY);
  } catch (error) {
    console.warn("북마크바 최신화 예약 표시를 지우지 못했어요", error);
  }
}

// 새 탭이 처음 그려질 때 부른다(render.js). 예약 표시가 남아 있을 때만 최신화하고 결과(true/false)를 돌려준다. 표시가 없으면 크롬 북마크를 건드리지 않고 false
// 실패해도 오류를 던지지 않는다
export async function touchBookmarksBarIfPending() {
  try {
    const stored = await chrome.storage.local.get(TOUCH_PENDING_KEY);
    if (stored[TOUCH_PENDING_KEY] !== true) return false;
  } catch (error) {
    console.warn("북마크바 최신화 예약 표시를 읽지 못했어요", error);
    return false;
  }
  return touchBookmarksBar();
}

// 북마크를 바꾼 뒤 부른다. 이미 예약돼 있으면 시간을 처음부터 다시 잰다(디바운스). 기다리지 않고 바로 돌아온다
function scheduleBarTouch() {
  markTouchPending();
  if (touchHold > 0) {
    touchWanted = true;
    return;
  }
  if (touchTimer !== null) clearTimeout(touchTimer);
  touchTimer = setTimeout(() => {
    touchTimer = null;
    touchBookmarksBar();
  }, TOUCH_DELAY_MS);
}

// fn을 실행하는 동안에는 최신화를 실행하지 않고, 그사이 예약된 것이 있으면 끝난 뒤(fn이 오류를 던져도) 다시 예약한다
// 바꾼 것이 하나도 없으면 예약하지 않는다. organize.js의 정리(applyPlan)와 되돌리기(undo)가 쓴다
// 중간에 크롬 호출이 오래 걸려 500ms가 지나도, 정리 도중에 임시 북마크가 생기지 않게 하기 위해서다
export async function holdBarTouch(fn) {
  if (touchHold === 0 && touchTimer !== null) {
    // 이미 예약된 것은 정리가 끝난 뒤로 미룬다
    clearTimeout(touchTimer);
    touchTimer = null;
    touchWanted = true;
  }
  touchHold++;
  try {
    return await fn();
  } finally {
    touchHold--;
    if (touchHold === 0 && touchWanted) {
      touchWanted = false;
      scheduleBarTouch();
    }
  }
}

// 예약된 최신화가 있으면 기다리지 않고 지금 실행하고, 끝날 때까지 기다린다. 없으면 진행 중인 최신화만 기다린다
// 테스트와 콘솔 확인에서 500ms를 기다리지 않으려고 쓴다
export async function flushBarTouch() {
  if (touchTimer !== null) {
    clearTimeout(touchTimer);
    touchTimer = null;
    return touchBookmarksBar();
  }
  await touchQueue;
  return false;
}

// 북마크바를 다시 '최근 수정 폴더'로 만든다(바로 실행). 만들었으면 true, 필요 없거나 실패했으면 false
// 실패해도 오류를 던지지 않는다(정리 결과에 영향이 없게). 북마크바는 ID가 아니라 folderType으로 찾는다 (F01-04)
// 끝나면(만들었든 필요 없었든) 예약 표시를 지운다. 실패했으면 다음 새 탭이 다시 해 보도록 표시를 남긴다
export function touchBookmarksBar() {
  const task = touchQueue.then(runTouch);
  touchQueue = task.catch(() => {});
  return task;
}

async function runTouch() {
  // 예약 표시를 쓰는 중이면 끝난 뒤에 시작한다(표시를 지우는 것이 쓰는 것보다 먼저 끝나지 않게)
  await markTask;
  const done = await tryTouch();
  if (done !== null) await clearTouchPending();
  return done === true;
}

// 만들었으면 true, 필요 없었으면 false, 실패했으면 null
async function tryTouch() {
  try {
    // 지난번에 지우기 전에 끊겨(새 탭을 닫는 등) 남은 임시 북마크를 먼저 지운다
    await removeTouchLeftovers();
    const [top] = await chrome.bookmarks.getTree();
    const tops = top?.children ?? [];
    const bar = pickRoot(tops, "bookmarks-bar");
    if (!bar) return false;
    const barNode = tops.find((node) => node.id === bar.id);
    // 북마크바가 이미 어느 사용자 폴더보다 최근에 바뀌었으면 만들지 않는다
    if (!userFolderNewer(tops, barNode?.dateGroupModified ?? 0)) return false;
    const node = await chrome.bookmarks.create({ parentId: bar.id, title: TOUCH_TITLE, url: TOUCH_URL });
    await chrome.bookmarks.remove(node.id);
    return true;
  } catch (error) {
    console.warn("북마크바를 최근 수정 폴더로 되돌리지 못했어요", error);
    return null;
  }
}

// 같은 주소의 임시 북마크를 모두 지운다. 하나를 못 지워도 나머지는 지운다
async function removeTouchLeftovers() {
  const found = await chrome.bookmarks.search({ url: TOUCH_URL });
  for (const node of found) {
    if (node.url !== TOUCH_URL) continue;
    try {
      await chrome.bookmarks.remove(node.id);
    } catch (error) {
      console.warn(`남은 임시 북마크 ${node.id}를 지우지 못했어요`, error);
    }
  }
}

// 사용자 폴더(folderType 없음) 중 dateGroupModified가 time 이상인 것이 있으면 true. 관리자 폴더(managed) 아래는 보지 않는다
function userFolderNewer(tops, time) {
  const walk = (nodes) =>
    nodes.some((node) => {
      if (node.url !== undefined) return false;
      if (!node.folderType && node.dateGroupModified !== undefined && node.dateGroupModified >= time) return true;
      return walk(node.children ?? []);
    });
  return walk(tops.filter((node) => node.folderType !== "managed"));
}

// 기타 북마크(loadTree의 roots.other와 같은 폴더) 맨 뒤에 북마크를 만든다
async function createInOther(title, url) {
  const other = pickRoot(await chrome.bookmarks.getChildren("0"), "other");
  if (!other) throw new Error("기타 북마크 폴더를 찾지 못했어요");
  return chrome.bookmarks.create({ parentId: other.id, title, url });
}

// N06: 연 시각을 기록한 뒤 주소를 연다. javascript: 주소(또는 해석할 수 없는 주소)면 열지 않고 false를 돌려준다
// 모든 주소를 chrome.tabs로 연다. 현재 탭은 이 탭의 id로, 새 탭은 뒤에 연다
export async function openBookmark(bookmark, { newTab = false } = {}) {
  const url = bookmark?.url;
  if (typeof url !== "string" || url === "") throw new Error("열 주소가 없어요");
  if (!isOpenable(url)) return false;

  try {
    await recordOpened(bookmark.id);
  } catch (error) {
    console.warn("연 시각을 기록하지 못했어요", error);
  }

  if (newTab) {
    await chrome.tabs.create({ url, active: false });
    return;
  }
  const tab = await chrome.tabs.getCurrent();
  if (tab?.id === undefined) throw new Error("현재 탭을 찾지 못했어요");
  await chrome.tabs.update(tab.id, { url });
}

// 크롬과 같은 방식(URL 해석)으로 javascript: 주소를 가린다. 해석하지 못한 주소도 열지 않는다
function isOpenable(url) {
  try {
    return new URL(url).protocol !== "javascript:";
  } catch {
    return false;
  }
}

// N07: _favicon 주소 만들기
export function faviconUrl(url, size = 32) {
  return chrome.runtime.getURL("/_favicon/") + "?pageUrl=" + encodeURIComponent(url) + "&size=" + size;
}

// N07: 쓸 파비콘 주소를 돌려준다. 원래 주소에 없으면 첫 페이지 주소로 다시 찾고, 둘 다 없으면 null
// 파비콘은 페이지 주소 단위로 저장되므로, 받은 그림이 기본 그림과 다른지로 있는지를 본다
export async function hasFavicon(url) {
  if (typeof url !== "string") return null;
  try {
    const blank = await loadDefaultIcon();
    if (!sameBytes(await readIcon(url), blank)) return faviconUrl(url, FAVICON_SIZE);
    const home = homePage(url);
    if (!home || home === url) return null;
    return sameBytes(await readIcon(home), blank) ? null : faviconUrl(home, FAVICON_SIZE);
  } catch (error) {
    console.warn("파비콘을 확인하지 못했어요", error);
    return null;
  }
}

// 기본 그림은 한 번만 받아 둔다. 받지 못했으면 다음에 다시 받는다
let defaultIcon = null;
function loadDefaultIcon() {
  defaultIcon ??= readIcon(NO_FAVICON_PAGE).catch((error) => {
    defaultIcon = null;
    throw error;
  });
  return defaultIcon;
}

// 확장 프로그램 안의 _favicon 주소에서 그림을 받는다 (밖으로 보내지 않음)
async function readIcon(pageUrl) {
  const response = await fetch(faviconUrl(pageUrl, FAVICON_SIZE));
  if (!response.ok) throw new Error(`파비콘을 받지 못했어요 (${response.status})`);
  return new Uint8Array(await response.arrayBuffer());
}

function sameBytes(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// http(s) 주소의 첫 페이지 주소. 그 밖의 주소(chrome://, file:// 등)는 null
function homePage(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.origin + "/";
  } catch {
    return null;
  }
}
