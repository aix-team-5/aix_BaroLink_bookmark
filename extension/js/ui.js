// 담당: 팀원 D · 이슈 #16 · 명세: N44, N45, N46 (F02, F04, F12)
// 모든 화면 파일이 함께 쓰는 공통 화면 조각. 화면 파일(render.js, view/*, search.js)은 이 파일을 불러 쓸 수 있다.
// 이 파일은 화면 파일을 부르지 않는다. 색과 크기는 newtab.css의 공통 값을 쓴다.

// N44: 앱 아이콘(색 타일 위의 파비콘, 없으면 제목의 첫 글자)을 만든다
export function appIcon(bookmark, size = 56) {
  return document.createElement("span");
}

// N45: 짧은 안내 문구를 #toast 칸에 띄운다. actionLabel이 있으면 버튼([되돌리기] 등)을 함께 보여 주고, 누르면 onAction을 부른다
export function showToast(message, { actionLabel, onAction, duration = 2200 } = {}) {}

// N46: 선으로 그린 공통 아이콘을 만든다
// 이름: bookmark, check, chevron, clock, close, folder, grid, history, lock, plus, search, sparkles
export function icon(name, size = 20) {
  return document.createElementNS("http://www.w3.org/2000/svg", "svg");
}
