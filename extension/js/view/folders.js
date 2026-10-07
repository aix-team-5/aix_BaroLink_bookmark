// 담당: 팀원 C · 이슈 #13 · 명세: N41 (F03, F15)
// 화면 파일끼리는 서로 부르지 않는다 (공통 조각은 ui.js). 크롬은 bookmarks.js를 거친다.

// N41: 내 폴더 줄을 #folder-list 칸에 그린다 (render.js가 부른다)
export function showFolders(tree) {}

// N41: 폴더 팝업(폴더 안의 폴더 포함), 폴더 만들기 · 이름 바꾸기 · 삭제
export function openFolderPopup(folderId) {}

// N41: 우클릭 메뉴
export function showContextMenu(bookmark) {}
