// 담당: 팀원 A · 이슈 #3 · 명세: N08~N16, N38~N40 · 크롬 API: C14, C15
// 저장 항목을 읽고 쓰는 통로. 모든 저장은 이 파일을 거친다. 한 키는 한쪽(새 탭 또는 서비스 워커)만 쓴다.

// N08: 저장 항목 전체를 읽는다 (없는 키는 기본값)
export async function load() {
  return {
    pinned: [],
    lastOpenedByUs: {},
    dismissed: {},
    manualMoves: {},
    newBookmarks: [],
    handledNew: [],
    pendingMoves: {},
    history: [],
    state: { firstCard: "pending" },
  };
}

// N09: 읽고 → 고치고 → 쓰기를 한 번에 처리. 고친 값을 돌려준다
export async function update(key, fn) {}

// N10: 연 시각 기록 (lastOpenedByUs)
export async function recordOpened(id) {}

// N11: 독에 추가. 이미 8개면 넣지 않고 false
export async function pin(id) {
  return false;
}

// N11: 독에서 제거. 고정 목록을 돌려준다
export async function unpin(id) {
  return [];
}

// N12: "이제 안 봐도 됨" 기록 · 취소 (dismissed)
export async function dismiss(id) {}
export async function undismiss(id) {}

// N13: 직접 옮김 기록 (manualMoves). 서비스 워커만 호출
export async function markManualMove(id) {}

// N14: 우리 정리가 옮길 북마크를 목적지 · 시각과 함께 표시 (pendingMoves). 새 탭만 호출
export async function setPending(moves) {}

// N14: 그 이동이 우리 것인지 확인. 서비스 워커만 호출
export async function isPending(id, parentId) {
  return false;
}

// N15: 정리 기록 추가, 되돌린 시각 기록 (history)
export async function addHistory(entry) {}
export async function markUndone(historyId) {}

// N16: 크롬에 더 이상 없는 북마크 ID를 새 탭이 쓰는 저장 항목에서 지운다. 지운 개수를 돌려준다
export async function cleanupMissing(tree) {
  return 0;
}

// N38: 첫 정리 카드 상태 ("pending" | "done" | "later"). 새 탭만 호출
export async function setFirstCard(value) {}

// N39: '그대로 두기'로 둔 새 북마크를 기록 (handledNew). 새 탭만 호출
export async function markHandledNew(ids) {}

// N40: 새 북마크 목록에 추가 · 제거, 삭제된 ID 정리 (newBookmarks, manualMoves). 서비스 워커만 호출
export async function addNew(id) {}
export async function removeNew(id) {}
export async function purgeWorkerKeys(ids) {}
