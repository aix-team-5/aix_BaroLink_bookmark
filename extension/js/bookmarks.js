// 담당: 팀원 A · 이슈 #2 · 명세: N01~N07 (F01, F02, F03, F07) · 크롬 API: C04~C08, C18, C22
// 크롬 북마크를 읽고 바꾸는 통로. 크롬을 부르는 함수는 async다.

// N01: 크롬 북마크를 읽어 화면과 규칙이 쓰기 쉬운 목록으로 바꾼다
export async function loadTree() {
  return { roots: { bar: null, other: null, mobile: null }, bookmarks: [], folders: [] };
}

// N02: 같은 이름의 폴더가 있으면 그 폴더를, 없으면 새로 만들어 돌려준다
export async function createFolder(name, parentId) {
  return null;
}

// N03: 북마크 하나를 옮긴다. 북마크가 없으면 null
export async function moveBookmark(id, parentId, index) {
  return null;
}

// N04: 앱 폴더 이름 바꾸기
export async function renameFolder(id, name) {
  return null;
}

// N05: 안의 북마크를 상위 폴더로 꺼낸 뒤 폴더만 삭제. 꺼낸 북마크 수를 돌려준다
export async function deleteFolderKeepChildren(id) {
  return 0;
}

// N06: 연 시각을 기록한 뒤 주소를 연다. javascript: 주소면 열지 않고 false를 돌려준다
export async function openBookmark(bookmark, { newTab = false } = {}) {}

// N07: _favicon 주소 만들기
export function faviconUrl(url, size = 32) {
  return "";
}

// N07: 받은 그림이 기본 그림과 다른지(파비콘이 있는지)
export async function hasFavicon(url) {
  return false;
}
