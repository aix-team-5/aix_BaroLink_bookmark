// 담당: 팀원 A · 이슈 #4 · 명세: N22, N23 (F07, F10, F13)
// 정리 적용과 되돌리기. 크롬 북마크를 실제로 바꾼다. bookmarks.js와 store.js를 거친다.

// N22: 폴더를 만들고 북마크를 옮긴 뒤 기록을 저장. type은 "first" | "new"
export async function applyPlan(plan, type) {
  return { id: "", at: 0, type, createdFolderIds: [], moves: [], fromOrder: {}, skipped: 0 };
}

// N23: 원래 순서에서 바로 앞에 있던 이웃의 뒤에 끼워 넣어 되돌린다
export async function undo(historyId) {
  return { restored: 0, skipped: 0, fallback: 0 };
}
