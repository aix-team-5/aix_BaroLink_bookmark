// 담당: 팀원 B · 이슈 #9 · 명세: N42 (F04)
// 화면 파일끼리는 서로 부르지 않는다 (공통 조각은 ui.js). 크롬은 bookmarks.js와 store.js를 거친다.

// N42: 잊고 있던 북마크 폴더(개수 배지)와 팝업을 #forgotten-slot 칸에 그린다. items는 pickForgotten의 결과, 앞의 8개만 보여 준다
// actions는 render.js가 넘겨 주는 동작 묶음이다. [어디 있는지 보기]는 actions.openFolder(folderId)를 부른다
export function showForgotten(items, actions) {}
