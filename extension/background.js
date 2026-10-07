// 담당: 팀원 B · 이슈 #6 · 명세: N32, N33, N34 (F01, F07, F10) · 크롬 API: C03, C09, C10, C12, C13
// 서비스 워커. 알림 리스너는 파일 맨 위에서 바로 등록한다. 상태는 변수가 아니라 저장소에 기록한다.
import * as store from "./js/store.js";

chrome.runtime.onInstalled.addListener(onInstalled);
chrome.bookmarks.onCreated.addListener(onCreated);
chrome.bookmarks.onMoved.addListener(onMoved);
chrome.bookmarks.onRemoved.addListener(onRemoved);
chrome.bookmarks.onImportBegan.addListener(onImportBegan);
chrome.bookmarks.onImportEnded.addListener(onImportEnded);

// C03: 처음 설치할 때만 manualMoves, newBookmarks의 빈 기본값을 만든다
function onInstalled(details) {}

// N32: 북마크바·기타·모바일 바로 아래에 저장된 새 북마크를 newBookmarks에 추가
function onCreated(id, node) {}

// N33: 폴더가 바뀐 이동이면 newBookmarks에서 지우고, 우리 정리의 이동이 아니면 직접 옮김으로 기록
function onMoved(id, moveInfo) {}

// N34: 삭제된 북마크(폴더면 안의 북마크까지) ID를 서비스 워커가 쓰는 항목에서 정리
function onRemoved(id, removeInfo) {}

// C13: 가져오기 중에는 onCreated 처리를 멈추고, 끝난 뒤 한 번만 다시 읽는다
function onImportBegan() {}
function onImportEnded() {}
