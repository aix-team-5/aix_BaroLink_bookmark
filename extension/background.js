// 담당: 팀원 B · 이슈 #6 · 명세: N32, N33, N34 (F01, F07, F10) · 크롬 API: C03, C09, C10, C12, C13
// 서비스 워커. 알림 리스너는 파일 맨 위에서 바로 등록한다. 상태는 변수가 아니라 저장소에 기록한다.
// 이 PR은 P1(F01-06 삭제 정리, F07-05 직접 옮김 기록)만 다룬다. 새 북마크 기록(F10)과 가져오기 중 멈춤은 P2 브랜치에서 한다.
import * as store from "./js/store.js";

chrome.runtime.onInstalled.addListener(onInstalled);
chrome.bookmarks.onCreated.addListener(onCreated);
chrome.bookmarks.onMoved.addListener(inOrder(onMoved));
chrome.bookmarks.onRemoved.addListener(inOrder(onRemoved));
chrome.bookmarks.onImportBegan.addListener(onImportBegan);
chrome.bookmarks.onImportEnded.addListener(onImportEnded);

// 북마크 알림을 도착한 순서대로 하나씩 끝까지 처리하는 큐
// 이동 처리가 isPending을 기다리는 사이에 같은 북마크의 삭제 처리가 먼저 끝나면, 지운 ID를 다시 기록하게 된다
let queue = Promise.resolve();

function inOrder(handler) {
  return (...args) => {
    const task = queue.then(() => handler(...args));
    // 실패한 처리가 큐를 막지 않게 한다
    queue = task.catch(() => {});
    return task;
  };
}

// C03: 처음 설치할 때만 manualMoves, newBookmarks의 빈 기본값을 만든다
// update는 값이 없으면 기본값을 받으므로 그대로 돌려주면 기본값이 저장되고, 이미 있는 값은 바뀌지 않는다
async function onInstalled(details) {
  if (details.reason !== "install") return;
  try {
    await store.update("manualMoves", (moves) => moves);
    await store.update("newBookmarks", (list) => list);
  } catch (error) {
    console.warn("서비스 워커 저장 항목의 기본값을 만들지 못했어요", error);
  }
}

// N32: 북마크바·기타·모바일 바로 아래에 저장된 새 북마크를 newBookmarks에 추가
function onCreated(id, node) {}

// N33: 폴더가 바뀐 이동이면 newBookmarks에서 지우고, 우리 정리의 이동이 아니면 직접 옮김으로 기록
// 순서만 바뀐 이동과 폴더의 이동은 기록하지 않는다. 우리 정리가 옮긴 것은 pendingMoves에 1분 동안 표시돼 있다 (F07-05)
// 기록은 store.js의 update 큐를 거치므로 알림이 동시에 여러 개 와도 순서대로 처리된다
async function onMoved(id, moveInfo) {
  if (String(moveInfo.parentId) === String(moveInfo.oldParentId)) return;
  try {
    const [node] = await chrome.bookmarks.get(id);
    if (!node?.url) return;
    if (await store.isPending(id, moveInfo.parentId)) return;
    await store.markManualMove(id);
  } catch (error) {
    console.warn(`북마크 ${id}의 이동을 기록하지 못했어요`, error);
  }
}

// N34: 삭제된 북마크(폴더면 안의 북마크까지) ID를 서비스 워커가 쓰는 항목에서 정리
// 폴더가 통째로 지워지면 알림은 폴더 것 하나만 오고 안의 북마크는 node.children에 들어 있다 (C12). 새 탭이 쓰는 항목은 cleanupMissing이 정리한다
async function onRemoved(id, removeInfo) {
  const ids = [String(id)];
  const walk = (nodes) => {
    for (const child of nodes ?? []) {
      ids.push(String(child.id));
      walk(child.children);
    }
  };
  walk(removeInfo?.node?.children);
  try {
    await store.purgeWorkerKeys(ids);
  } catch (error) {
    console.warn(`삭제된 북마크 ${id}의 기록을 정리하지 못했어요`, error);
  }
}

// C13: 가져오기 중에는 onCreated 처리를 멈추고, 끝난 뒤 한 번만 다시 읽는다
function onImportBegan() {}
function onImportEnded() {}
