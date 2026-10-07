// 담당: 팀원 D · 이슈 #15 · 명세: N30 (F01~F04, F08, F12) · 크롬 API: C09~C12, C16
// 화면의 시작점. 크롬 북마크 알림과 저장소 알림은 이 파일만 받고, 화면 파일(view/*)의 그리기 함수를 부른다.

// 화면 연결 방식 (docs/file-structure.md 12번, 명세 v13)
// - 각 파일은 newtab.html의 자기 칸 안만 그린다. 이 파일의 칸: #header, #web-search, #all-bookmarks, #dock
// - 화면 파일끼리는 서로 부르지 않는다. 다른 화면 파일의 동작이 필요한 그리기 함수에는 동작 묶음(actions)을 넘긴다:
//     const actions = { openFolder: openFolderPopup, showResultNotice, showContextMenu };
// - 북마크나 저장 항목이 바뀌면 renderAll을 다시 부른다. 그리기 함수는 자기 칸을 비우고 다시 그리며, 열려 있는 팝업은 닫지 않는다.

// N30: 헤더 · 날짜 · 고정됨(독) · 모든 북마크를 직접 그리고, 각 화면 파일의 그리기 함수를 부른다
export function renderAll(tree, stored) {}
