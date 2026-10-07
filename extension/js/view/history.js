// 담당: 팀원 A · 이슈 #5 · 명세: N43 (F07, F13)
// 화면 파일끼리는 서로 부르지 않는다 (공통 조각은 ui.js). 크롬은 organize.js와 store.js를 거친다.

// N43: 정리 결과 안내 ([되돌리기], 12초)를 #notice 칸에 그린다. cards.js가 actions.showResultNotice로 부른다
export function showResultNotice(entry) {}

// N43: 정리 기록 화면
export function showHistory() {}
