// 담당: 팀원 D (고정 제안은 팀원 C와 협업) · 이슈 #17 · 명세: N31 (F06, F09, F10) · 크롬 API: C19~C21
// 화면 파일끼리는 서로 부르지 않는다 (공통 조각은 ui.js). 크롬은 bookmarks.js와 store.js를 거친다 (권한 요청과 topSites만 예외).

// N31: 첫 정리 카드(또는 고정 제안 카드)를 #organize-suggestion 칸에 그린다
// actions는 render.js가 넘겨 주는 동작 묶음이다. [정리하기]가 끝나면 actions.showResultNotice(entry)를 부른다
export function showFirstCard(plan, actions) {}

// N31: 자세히 보기와 [정리하기] 창
export function showOrganizeDialog(plan, actions) {}

// N31: 고정할 북마크 고르기 창
export function showPinPicker() {}
