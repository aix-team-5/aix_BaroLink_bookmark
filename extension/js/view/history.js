// 담당: 팀원 A · 이슈 #5 · 명세: N43 (F07, F13)
// 화면 파일끼리는 서로 부르지 않는다 (공통 조각은 ui.js). 크롬은 organize.js와 store.js를 거친다.

// 준비 단계: 기대는 파일 중 render.js(#15)만 아직 뼈대다.
// - #2 bookmarks.js · #3 store.js · #4 organize.js · #16 ui.js: main에 구현됨
// - #14 newtab.html · newtab.css: #notice 칸과 .notice__* · .btn* 모양 있음. 정리 기록 창(history-*)의 모양은 아직 없음
// - #17 cards.js: [정리하기] 뒤에 actions.showResultNotice(entry)를 부름
// - #15 render.js: 뼈대 (actions에 showResultNotice를 넣는 코드, 정리 기록 버튼에서 showHistory를 부르는 코드 없음)
//   그래서 지금은 새 탭 콘솔에서 showResultNotice(entry)를 직접 불러 확인한다

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
  //   임시로 만든 폴더가 0개일 때만 resultNoNewFolder를 쓴다
  resultNoNewFolder: (bookmarks) => `북마크 ${bookmarks}개를 폴더에 넣었어요`, // 제안
  // TODO(팀 결정) ②: type "new"일 때의 문구 (명세에 없음)
  resultNew: (bookmarks) => `새 북마크 ${bookmarks}개를 정리했어요`, // 시안
  resultNewNone: "새 북마크를 그대로 뒀어요", // 시안
  resultNothing: "옮긴 북마크가 없어요", // 제안, TODO(팀 결정)
  resultSkipped: (n) => `${n}개는 이미 지워져 건너뛰었어요`, // 제안 (F07-09: 건너뛴 개수를 표시)
  undo: "되돌리기", // 확정 F07-03
  closeNotice: "정리 결과 안내 닫기", // 시안 (닫기 버튼의 aria-label)

  // 되돌린 뒤 안내 (#toast, ui.js의 showToast)
  undone: "원래대로 되돌렸어요", // 시안
  undoFallback: "원래 폴더가 없어 기타 북마크로 되돌렸어요", // 확정 F13-07
  // TODO(팀 결정) ③: 되돌릴 때 건너뛴 북마크가 있을 때 (F13-05 직접 옮김, F13-08 삭제됨)
  undoSkipped: (n) => `${n}개는 옮겨졌거나 지워져서 그대로 뒀어요`, // 제안
  undoFailed: "되돌리지 못했어요. 다시 눌러 주세요", // 제안 (명세에 없음)
  // 토스트는 한 번에 하나라서 되돌린 뒤 안내 문구를 이어 붙인다 (팀원 A 결정)
  toastJoin: " · ",

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
  // 정리 결과 안내 (#notice). newtab.css의 #notice .notice__* 와 공통 버튼 .btn*
  noticeBar: "notice__bar",
  noticeText: "notice__text",
  noticeTitle: "notice__title",
  noticeDesc: "notice__desc",
  btn: "btn",
  btnUndo: "btn--primary",
  btnClose: "btn--icon",

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

// 정리 결과 안내의 문구를 만든다 → { title, desc }. desc가 빈 문자열이면 그리지 않는다
function resultMessage(entry) {
  const moved = countOf(entry.moves);
  const created = countOf(entry.createdFolderIds);
  const skipped = Number(entry.skipped) || 0;

  let title;
  if (moved === 0 && created === 0) {
    // 옮긴 것도 만든 폴더도 없으면 기록이 저장되지 않은 결과다
    title = TEXT.resultNothing;
  } else if (entry.type === "new") {
    // TODO(팀 결정) ②: 시안 문구를 임시로 쓴다 (P1의 applyPlan은 "new"를 받지 않는다)
    title = moved > 0 ? TEXT.resultNew(moved) : TEXT.resultNewNone;
  } else {
    // TODO(팀 결정) ①: 만든 폴더가 0개면 "만들고"가 틀린 말이라 임시로 다른 문구를 쓴다
    title = created > 0 ? TEXT.resultFirst(created, moved) : TEXT.resultNoNewFolder(moved);
  }

  // F07-09: 이미 지워져 건너뛴 북마크의 개수
  const desc = skipped > 0 ? TEXT.resultSkipped(skipped) : "";
  return { title, desc };
}

// 배열의 길이. 배열이 아니면 0
function countOf(list) {
  return Array.isArray(list) ? list.length : 0;
}

// 되돌린 뒤 토스트에 띄울 문구. r은 undo의 결과 { restored, skipped, fallback }
function undoMessage(r) {
  const parts = [TEXT.undone];
  if (r && r.fallback > 0) parts.push(TEXT.undoFallback); // F13-07
  // TODO(팀 결정) ③: 되돌릴 때 건너뛴 북마크(F13-05 직접 옮김, F13-08 삭제됨)의 안내. 제안 문구를 임시로 쓴다
  if (r && r.skipped > 0) parts.push(TEXT.undoSkipped(r.skipped));
  return parts.join(TEXT.toastJoin);
}

// 지금 #notice에 떠 있는 안내의 기록 ID와 12초 타이머
let noticeId = null;
let noticeTimer = null;

// #notice 칸을 비우고 타이머를 지운다. historyId를 주면 그 기록의 안내가 떠 있을 때만 비운다
function clearNotice(historyId) {
  if (historyId !== undefined && historyId !== noticeId) return;
  if (noticeTimer !== null) {
    clearTimeout(noticeTimer);
    noticeTimer = null;
  }
  noticeId = null;
  const slot = document.getElementById("notice");
  if (slot) slot.replaceChildren();
}

// [되돌리기]를 눌렀을 때 (F13-03, F13-07)
// 다시 그리기는 요청하지 않는다 (북마크와 history가 바뀌면 render.js가 다시 부른다)
async function handleUndo(entry, button) {
  if (button.disabled) return;
  button.disabled = true; // 두 번 눌리지 않게 바로 막는다

  let r;
  try {
    r = await undo(entry.id);
  } catch (error) {
    console.error("정리를 되돌리지 못했어요", error);
    button.disabled = false;
    showToast(TEXT.undoFailed);
    return;
  }

  // 그 사이에 다른 정리의 안내가 떴으면 그 안내는 지우지 않는다
  clearNotice(entry.id);
  const message = undoMessage(r);
  // 문구를 이어 붙였으면 읽을 시간을 조금 더 준다
  showToast(message, message === TEXT.undone ? {} : { duration: 5000 });
}

// N43: 정리 결과 안내 ([되돌리기], 12초)를 #notice 칸에 그린다. cards.js가 actions.showResultNotice로 부른다
export function showResultNotice(entry) {
  // 여러 번 불려도 결과가 같게: 앞의 타이머를 지우고 칸을 비운 뒤 다시 그린다
  clearNotice();
  const slot = document.getElementById("notice");
  if (!slot || !entry) return;

  const bar = document.createElement("div");
  bar.className = CLS.noticeBar;
  bar.setAttribute("role", "status");
  bar.appendChild(icon("check"));

  // 문구는 textContent로 넣는다
  const { title, desc } = resultMessage(entry);
  const text = document.createElement("div");
  text.className = CLS.noticeText;
  const titleEl = document.createElement("div");
  titleEl.className = CLS.noticeTitle;
  titleEl.textContent = title;
  text.appendChild(titleEl);
  if (desc) {
    const descEl = document.createElement("div");
    descEl.className = CLS.noticeDesc;
    descEl.textContent = desc;
    text.appendChild(descEl);
  }
  bar.appendChild(text);

  // 옮긴 것도 만든 폴더도 없으면 기록이 저장되지 않았다 → 되돌릴 것이 없어 [되돌리기]를 그리지 않는다
  if (countOf(entry.moves) > 0 || countOf(entry.createdFolderIds) > 0) {
    const undoButton = document.createElement("button");
    undoButton.type = "button";
    undoButton.className = `${CLS.btn} ${CLS.btnUndo}`;
    undoButton.textContent = TEXT.undo;
    undoButton.addEventListener("click", () => handleUndo(entry, undoButton));
    bar.appendChild(undoButton);
  }

  // F07-03: 사용자가 닫을 수 있게
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = `${CLS.btn} ${CLS.btnClose}`;
  closeButton.setAttribute("aria-label", TEXT.closeNotice);
  closeButton.appendChild(icon("close", 16));
  closeButton.addEventListener("click", () => clearNotice());
  bar.appendChild(closeButton);

  slot.appendChild(bar);
  noticeId = entry.id;
  noticeTimer = setTimeout(() => clearNotice(), NOTICE_MS);
}

// N43: 정리 기록 화면
export function showHistory() {
  // TODO(P2, #22 닫힌 뒤)
  // 1. load()로 history를, loadTree()로 폴더 이름을 읽는다
  // 2. 이미 열린 history-dialog가 있으면 내용만 바꾸고, 없으면 <dialog>를 만들어 #dialogs에 붙이고 showModal()
  // 3. 머리: icon("history") + TEXT.historyTitle, TEXT.historyDesc, 닫기 버튼
  // 4. history가 비었으면 TEXT.historyEmpty (F13-10)
  // 5. at이 큰 순서(최신순)로 한 줄씩: dateLabel · typeLabel · 이동 개수 (F13-01)
  //    undoneAt이 있으면 TEXT.historyUndone, 없으면 [되돌리기] → handleUndo(entry, button) (F13-09)
  // 6. 줄을 누르면 펼쳐서 북마크마다 "원래 폴더 이름 → 옮긴 폴더 이름" (F13-02). 없는 폴더는 TEXT.unknownFolder
}
