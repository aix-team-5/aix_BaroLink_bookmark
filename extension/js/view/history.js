// 담당: 팀원 A · 이슈 #5 · 명세: N43 (F07, F13)
// 화면 파일끼리는 서로 부르지 않는다 (공통 조각은 ui.js). 크롬은 organize.js와 store.js를 거친다.

// 준비 단계: 기대는 파일이 아직 뼈대라서 상수·문구·클래스 이름만 정해 두고 동작은 넣지 않았다.
// - #2 bookmarks.js: 뼈대 (loadTree 구현은 feat/F01-bookmarks 브랜치, main에 아직 안 합쳐짐)
// - #3 store.js: 뼈대 (load 구현은 feat/F01-store 브랜치, main에 아직 안 합쳐짐)
// - #4 organize.js: 뼈대 (applyPlan · undo 구현은 feat/F07-organize 브랜치, main에 아직 안 합쳐짐)
// - #14 newtab.html · newtab.css: #notice · #dialogs 칸은 있음. CLS의 모양은 아직 없음
// - #15 render.js: 뼈대 (헤더의 정리 기록 버튼에서 showHistory를 부르는 코드 없음)
// - #16 ui.js: 뼈대 (showToast · icon이 빈 값을 돌려줌)
// - #17 cards.js: 뼈대 ([정리하기] 뒤에 actions.showResultNotice(entry)를 부르는 코드 없음)

import { undo } from "../organize.js";
import { load } from "../store.js";
import { loadTree } from "../bookmarks.js";
import { showToast, icon } from "../ui.js";

// F07-03: 정리 결과 안내를 보여 주는 시간
const NOTICE_MS = 12000;

// 화면 문구
const TEXT = {
  // 정리 결과 안내 (#notice)
  resultFirst: (folders, bookmarks) => `폴더 ${folders}개를 만들고 북마크 ${bookmarks}개를 넣었어요`, // 확정 F07-03
  // TODO(팀 결정) ①: 같은 이름의 폴더를 다시 써서 새로 만든 폴더가 없거나 적을 때 "만들고"가 틀린 말이 된다
  resultNoNewFolder: (bookmarks) => `북마크 ${bookmarks}개를 폴더에 넣었어요`, // 제안
  // TODO(팀 결정) ②: type "new"일 때의 문구 (명세에 없음)
  resultNew: (bookmarks) => `새 북마크 ${bookmarks}개를 정리했어요`, // 시안
  resultNewNone: "새 북마크를 그대로 뒀어요", // 시안
  resultSkipped: (n) => `${n}개는 이미 지워져 건너뛰었어요`, // 제안 (F07-09: 건너뛴 개수를 표시)
  undo: "되돌리기", // 확정 F07-03
  closeNotice: "정리 결과 안내 닫기", // 시안 (닫기 버튼의 aria-label)

  // 되돌린 뒤 안내 (#toast, ui.js의 showToast)
  undone: "원래대로 되돌렸어요", // 시안
  undoFallback: "원래 폴더가 없어 기타 북마크로 되돌렸어요", // 확정 F13-07
  // TODO(팀 결정) ③: 되돌릴 때 건너뛴 북마크가 있을 때 (F13-05 직접 옮김, F13-08 삭제됨)
  undoSkipped: (n) => `${n}개는 옮겨졌거나 지워져서 그대로 뒀어요`, // 제안

  // 정리 기록 창 (#dialogs)
  historyTitle: "정리 기록", // 확정 F13-01
  historyDesc: "북마크를 옮긴 기록과 원래 위치를 확인할 수 있어요.", // 시안
  historyEmpty: "아직 정리한 기록이 없어요", // 확정 F13-10
  historyRow: (date, type, count) => `${date} · ${type} · ${count}개 이동`, // 시안 (F13-01: 날짜·종류·이동 개수)
  historyMove: (from, to) => `${from} → ${to}`, // 확정 F13-02
  historyUndone: "되돌림", // 확정 F13-09
  historyClose: "닫기", // 제안
  typeFirst: "첫 정리", // 확정 F13-01
  typeNew: "새 북마크 정리", // 확정 F13-01
  unknownFolder: "(지워진 폴더)", // 제안
};

// 이 파일이 붙이는 CSS 클래스 이름. 모양은 newtab.css(팀원 D)에 둔다
const CLS = {
  // 정리 결과 안내 (#notice)
  notice: "result-notice",
  noticeIcon: "result-notice__icon",
  noticeMessage: "result-notice__message",
  noticeUndo: "result-notice__undo",
  noticeClose: "result-notice__close",

  // 정리 기록 창 (<dialog>, #dialogs)
  dialog: "history-dialog",
  header: "history-header",
  title: "history-title",
  titleIcon: "history-title__icon",
  desc: "history-desc",
  close: "history-close",
  empty: "history-empty",
  list: "history-list",
  item: "history-item",
  itemUndone: "history-item--undone",
  row: "history-row",
  toggle: "history-toggle",
  rowIcon: "history-row__icon",
  rowLabel: "history-row__label",
  chevron: "history-row__chevron",
  expanded: "is-expanded",
  undo: "history-undo",
  undoneLabel: "history-undone",
  moves: "history-moves",
  move: "history-move",
  moveTitle: "history-move__title",
  movePath: "history-move__path",
};

// 정리 종류를 화면 문구로 바꾼다
function typeLabel(type) {
  if (type === "first") return TEXT.typeFirst;
  if (type === "new") return TEXT.typeNew;
  return "";
}

// 정리 시각(밀리초)을 "M월 D일"로 바꾼다
function dateLabel(at) {
  const d = new Date(at);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

// 정리 결과 안내의 문구를 만든다
function resultMessage(entry) {
  // TODO(P1, #4 이후)
  // 1. 옮긴 개수 = entry.moves.length, 만든 폴더 수 = entry.createdFolderIds.length
  // 2. type "first": 만든 폴더가 있으면 TEXT.resultFirst, 없으면 TEXT.resultNoNewFolder (팀 결정 ① 반영)
  // 3. type "new": 옮긴 개수가 있으면 TEXT.resultNew, 없으면 TEXT.resultNewNone (팀 결정 ② 반영)
  // 4. entry.skipped가 0보다 크면 TEXT.resultSkipped를 뒤에 붙인다 (F07-09)
}

// [되돌리기]를 눌렀을 때
async function runUndo(historyId) {
  // TODO(P1, #4 이후)
  // 1. 두 번 눌리지 않게 버튼을 막는다
  // 2. organize.js의 undo(historyId)를 await한다 → { restored, skipped, fallback }
  // 3. #notice 칸을 비운다
  // 4. 안내: fallback > 0이면 TEXT.undoFallback, 아니면 TEXT.undone. skipped > 0이면 TEXT.undoSkipped (팀 결정 ③ 반영)
  //    showToast로 띄운다
  // 5. 다시 그리기는 요청하지 않는다 (북마크와 history가 바뀌면 render.js가 다시 부른다)
  // 6. 실패하면 버튼을 다시 풀고 console.error로 남긴다
}

// N43: 정리 결과 안내 ([되돌리기], 12초)를 #notice 칸에 그린다. cards.js가 actions.showResultNotice로 부른다
export function showResultNotice(entry) {
  // TODO(P1, #4 이후)
  // 1. #notice 칸을 비운다 (여러 번 불려도 결과가 같게. 앞의 타이머도 지운다)
  // 2. CLS.notice 상자에 icon("check"), resultMessage(entry), [되돌리기], 닫기(icon("close"))를 넣는다. 문구는 textContent로
  // 3. [되돌리기] → runUndo(entry.id), 닫기 → 칸을 비운다 (F07-03: 사용자가 닫을 수 있게)
  // 4. NOTICE_MS 뒤에 이 entry의 안내가 아직 떠 있으면 칸을 비운다
}

// N43: 정리 기록 화면
export function showHistory() {
  // TODO(P2, #22 닫힌 뒤)
  // 1. load()로 history를, loadTree()로 폴더 이름을 읽는다
  // 2. 이미 열린 history-dialog가 있으면 내용만 바꾸고, 없으면 <dialog>를 만들어 #dialogs에 붙이고 showModal()
  // 3. 머리: icon("history") + TEXT.historyTitle, TEXT.historyDesc, 닫기 버튼
  // 4. history가 비었으면 TEXT.historyEmpty (F13-10)
  // 5. at이 큰 순서(최신순)로 한 줄씩: dateLabel · typeLabel · 이동 개수 (F13-01)
  //    undoneAt이 있으면 TEXT.historyUndone, 없으면 [되돌리기] → runUndo(entry.id) (F13-09)
  // 6. 줄을 누르면 펼쳐서 북마크마다 "원래 폴더 이름 → 옮긴 폴더 이름" (F13-02). 없는 폴더는 TEXT.unknownFolder
}
