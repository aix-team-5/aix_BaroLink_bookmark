// 담당: 팀원 A · 이슈 #5 · 명세: N43 (F07, F13)
// 화면 파일끼리는 서로 부르지 않는다 (공통 조각은 ui.js). 크롬은 bookmarks.js(폴더 이름 읽기), organize.js(되돌리기), store.js를 거친다.

// render.js가 actions.showResultNotice로 정리 결과 안내를 부르고, 헤더의 정리 기록 버튼에서 showHistory를 부른다

import { loadTree } from "../bookmarks.js";
import { undo } from "../organize.js";
import { load } from "../store.js";
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
  resultSkipped: (n) => `${n}개는 옮기지 않았어요`, // 제안, TODO(팀 결정) (F07-09: 건너뛴 개수를 표시). skipped에는 지워짐·직접 옮김·오류가 섞여 이유를 단정하지 않는다
  undo: "되돌리기", // 확정 F07-03
  closeNotice: "정리 결과 안내 닫기", // 시안 (닫기 버튼의 aria-label)

  // 되돌린 뒤 안내 (#toast, ui.js의 showToast)
  undone: "원래대로 되돌렸어요", // 시안
  undoFallback: "원래 폴더가 없어 기타 북마크로 되돌렸어요", // 확정 F13-07
  // TODO(팀 결정) ③: 되돌릴 때 건너뛴 북마크가 있을 때 (F13-05 직접 옮김, F13-08 삭제됨)
  undoSkipped: (n) => `${n}개는 되돌리지 않았어요`, // 제안, TODO(팀 결정). skipped에는 지워짐·직접 옮김·오류가 섞여 이유를 단정하지 않는다
  undoNone: "되돌린 북마크가 없어요", // 제안, TODO(팀 결정) ③
  undoAlready: "이미 되돌린 정리예요", // 제안, TODO(팀 결정) ③
  undoFoldersOnly: "정리로 만든 빈 폴더를 지웠어요", // 제안, TODO(팀 결정) ③
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
  historyLoadFailed: "정리 기록을 불러오지 못했어요", // 제안 (명세에 없음)
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

  // 정리 기록 창 (<dialog>, #dialogs). 틀·머리말은 공통 .dialog, .dialog__panel/__header/__title/__subtitle/__body
  dialogFrame: "dialog",
  dialogPanel: "dialog__panel",
  dialogHeader: "dialog__header",
  dialogTitle: "dialog__title",
  dialogSubtitle: "dialog__subtitle",
  dialogBody: "dialog__body",
  // 아래는 정리 기록 창에만 있는 모양 (newtab.css에 아직 없음, 팀원 D에게 부탁)
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
  moveSep: "history-move__sep",
  movePath: "history-move__path",
  status: "history-status",
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

  // F07-09: 옮기지 못하고 건너뛴 북마크의 개수 (이미 지워졌거나 이동 중 오류)
  const desc = skipped > 0 ? TEXT.resultSkipped(skipped) : "";
  return { title, desc };
}

// 배열의 길이. 배열이 아니면 0
function countOf(list) {
  return Array.isArray(list) ? list.length : 0;
}

// 되돌린 뒤 토스트에 띄울 문구. r은 undo의 결과 { restored, skipped, fallback }, entry는 되돌린 정리 기록
function undoMessage(r, entry) {
  const restored = (r && Number(r.restored)) || 0;
  const skipped = (r && Number(r.skipped)) || 0;
  const fallback = (r && Number(r.fallback)) || 0;

  // TODO(팀 결정) ③: 복원한 북마크가 없을 때의 문구. 제안 문구를 임시로 쓴다
  if (restored === 0) {
    if (skipped === 0) {
      // 옮긴 북마크 없이 폴더만 만든 정리는 되돌리면 빈 폴더만 지운다
      if (entry && countOf(entry.moves) === 0 && countOf(entry.createdFolderIds) > 0) {
        return TEXT.undoFoldersOnly;
      }
      return TEXT.undoAlready;
    }
    return [TEXT.undoNone, TEXT.undoSkipped(skipped)].join(TEXT.toastJoin);
  }

  const parts = [TEXT.undone];
  if (fallback > 0) parts.push(TEXT.undoFallback); // F13-07
  // TODO(팀 결정) ③: 되돌릴 때 건너뛴 북마크(F13-05 직접 옮김, F13-08 삭제됨)의 안내. 제안 문구를 임시로 쓴다
  if (skipped > 0) parts.push(TEXT.undoSkipped(skipped));
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

  // 되돌리는 동안 이 기록의 안내가 12초 타이머로 사라지지 않게 타이머를 멈춘다
  if (noticeId === entry.id && noticeTimer !== null) {
    clearTimeout(noticeTimer);
    noticeTimer = null;
  }

  let r;
  try {
    r = await undo(entry.id);
  } catch (error) {
    console.error("정리를 되돌리지 못했어요", error);
    button.disabled = false; // 다시 누를 수 있게
    showToast(TEXT.undoFailed);
    // 이 기록의 안내가 아직 떠 있으면 타이머를 다시 시작한다 (그 사이 다른 정리의 안내가 떴으면 건드리지 않는다)
    if (noticeId === entry.id) {
      if (noticeTimer !== null) clearTimeout(noticeTimer);
      noticeTimer = setTimeout(() => clearNotice(), NOTICE_MS);
    }
    return;
  }

  // 그 사이에 다른 정리의 안내가 떴으면 그 안내는 지우지 않는다
  clearNotice(entry.id);
  const message = undoMessage(r, entry);
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

// 정리 기록 창: #dialogs 안의 <dialog>를 하나만 두고 다시 쓴다
const DIALOG_HOST_ID = "dialogs";
const HISTORY_DIALOG_ID = "dialog-history";
const HISTORY_TITLE_ID = "dialog-history-title";

// 펼쳐 둔 내역의 ID(문자열). 본문을 다시 채워도 펼친 채로 둔다. 창을 닫으면 비운다
const expandedIds = new Set();
// 창 안 [되돌리기]가 진행 중인 내역의 ID. 본문을 다시 그려도 버튼을 막아 둔다
const undoingIds = new Set();
// 마지막으로 읽은 { entries, names }. 펼치기는 저장소를 다시 읽지 않고 이 값으로 본문만 다시 그린다
let historyData = null;
// 늦게 도착한 옛 읽기 결과가 새 결과를 덮어쓰지 않게 하는 번호
let loadSeq = 0;
// 창 안 안내 줄의 문구 { text, isError }. 창을 닫기 전까지 남기고, 닫으면 지운다
let statusMessage = null;

// 창 안 안내 줄(.history-status)에 statusMessage를 반영한다. 비어 있으면 숨긴다
function applyStatus(el) {
  const text = statusMessage ? statusMessage.text : "";
  el.textContent = text;
  // 처음에는 status, 실패일 때만 alert
  el.setAttribute("role", statusMessage && statusMessage.isError ? "alert" : "status");
  el.hidden = text === "";
}

// 안내 문구를 기억하고, 지금 열린 창의 안내 줄 글자만 바꾼다 (본문은 건드리지 않는다)
function setStatus(text, isError) {
  statusMessage = { text, isError };
  const dialog = document.getElementById(HISTORY_DIALOG_ID);
  const el = dialog && dialog.querySelector(`.${CLS.status}`);
  if (el) applyStatus(el);
}

// loadTree의 결과로 폴더 ID → 폴더 이름 표를 만든다 (루트 포함)
function folderNames(tree) {
  const names = new Map();
  // 고르지 않은 루트(두 번째 기타 북마크 등): 바로 아래 북마크의 folderTitle이 루트의 이름이다
  for (const bookmark of tree.bookmarks) {
    if (bookmark.path.length === 0) names.set(String(bookmark.rootId), bookmark.folderTitle);
  }
  for (const root of Object.values(tree.roots)) {
    if (root) names.set(String(root.id), root.title);
  }
  for (const folder of tree.folders) {
    names.set(String(folder.id), folder.title);
  }
  return names;
}

// 지금 있는 폴더면 이름, 없으면 TEXT.unknownFolder
function folderName(names, id) {
  const key = String(id);
  return names.has(key) ? names.get(key) : TEXT.unknownFolder;
}

// #dialog-history를 하나만 두고 다시 쓴다. 처음 만들 때만 이벤트를 단다
function getHistoryDialog(host) {
  let dialog = document.getElementById(HISTORY_DIALOG_ID);
  if (dialog) return dialog;

  dialog = document.createElement("dialog");
  dialog.id = HISTORY_DIALOG_ID;
  dialog.className = CLS.dialogFrame;
  dialog.setAttribute("aria-labelledby", HISTORY_TITLE_ID);
  // 바깥(어두운 곳)을 누르면 닫는다 (folders.js와 같게). Esc는 <dialog>의 기본 동작
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    // close 이벤트는 close() 뒤에 늦게 온다. 그사이 다시 열었으면 지우지 않는다
    if (dialog.open) return;
    expandedIds.clear();
    historyData = null;
    statusMessage = null;
    loadSeq++; // 읽는 중이던 결과는 버린다
    dialog.remove();
  });
  host.appendChild(dialog);
  return dialog;
}

// 머리말(아이콘 · 제목 · 설명 · 닫기), 안내 줄, 본문 칸을 새로 그린다. 본문 칸을 돌려준다
function drawFrame(dialog) {
  dialog.replaceChildren();

  const panel = document.createElement("div");
  panel.className = CLS.dialogPanel;

  const header = document.createElement("div");
  header.className = CLS.dialogHeader;
  const headText = document.createElement("div");
  const title = document.createElement("div");
  title.className = CLS.dialogTitle;
  const titleText = document.createElement("span");
  titleText.id = HISTORY_TITLE_ID;
  titleText.textContent = TEXT.historyTitle;
  title.append(icon("history", 20), titleText);
  const subtitle = document.createElement("div");
  subtitle.className = CLS.dialogSubtitle;
  subtitle.textContent = TEXT.historyDesc;
  headText.append(title, subtitle);

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = `${CLS.btn} ${CLS.btnClose}`;
  closeButton.setAttribute("aria-label", TEXT.historyClose);
  closeButton.appendChild(icon("close", 20));
  closeButton.addEventListener("click", () => dialog.close());
  header.append(headText, closeButton);

  // 창 안 [되돌리기]의 결과 안내 줄. 토스트(#toast)는 모달 뒤에 깔려 보이지 않아 창 안에 둔다
  // 머리말과 본문 사이에 한 번만 만들고, 본문을 다시 그려도 건드리지 않는다
  const status = document.createElement("div");
  status.className = CLS.status;
  applyStatus(status);

  const body = document.createElement("div");
  body.className = CLS.dialogBody;

  panel.append(header, status, body);
  dialog.appendChild(panel);
  return body;
}

// 본문을 historyData로 다시 그린다. 여러 번 불려도 결과가 같다
function drawBody(dialog, body) {
  body.replaceChildren();
  if (!historyData) return;

  const { entries, names } = historyData;
  // F13-10: 내역이 하나도 없을 때
  if (entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = CLS.empty;
    empty.textContent = TEXT.historyEmpty;
    body.appendChild(empty);
    return;
  }

  // F13-01: 최신순(at이 큰 순). 원본 배열은 건드리지 않는다
  const sorted = [...entries].sort((a, b) => (Number(b.at) || 0) - (Number(a.at) || 0));
  const list = document.createElement("div");
  list.className = CLS.list;
  for (const entry of sorted) {
    list.appendChild(historyItem(dialog, body, entry, names));
  }
  body.appendChild(list);
}

// 내역 한 줄: [펼치기 버튼(아이콘 · 날짜 · 종류 · 이동 개수 · 화살표)] [되돌리기 또는 "되돌림"] + 펼친 내용
function historyItem(dialog, body, entry, names) {
  const key = String(entry.id);
  const moves = Array.isArray(entry.moves) ? entry.moves : [];
  const expanded = expandedIds.has(key);
  const undone = Boolean(entry.undoneAt);

  const item = document.createElement("div");
  item.className = CLS.item;
  if (undone) item.classList.add(CLS.itemUndone);
  if (expanded) item.classList.add(CLS.expanded);

  const row = document.createElement("div");
  row.className = CLS.row;

  // F13-01: 날짜 · 종류 · 이동 개수
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = CLS.toggle;
  toggle.dataset.historyId = key;
  toggle.setAttribute("aria-expanded", String(expanded));
  const rowIcon = document.createElement("span");
  rowIcon.className = CLS.rowIcon;
  rowIcon.appendChild(icon("history", 16));
  const label = document.createElement("span");
  label.className = CLS.rowLabel;
  label.textContent = TEXT.historyRow(dateLabel(entry.at), typeLabel(entry.type), moves.length);
  const chevron = icon("chevron", 16);
  chevron.classList.add(CLS.chevron);
  toggle.append(rowIcon, label, chevron);
  toggle.addEventListener("click", () => toggleEntry(dialog, body, key));
  row.appendChild(toggle);

  // F13-09: 되돌린 내역은 [되돌리기] 대신 "되돌림"
  if (undone) {
    const undoneLabel = document.createElement("span");
    undoneLabel.className = CLS.undoneLabel;
    undoneLabel.textContent = TEXT.historyUndone;
    row.appendChild(undoneLabel);
  } else {
    const undoButton = document.createElement("button");
    undoButton.type = "button";
    undoButton.className = `${CLS.btn} ${CLS.undo}`;
    undoButton.textContent = TEXT.undo;
    undoButton.disabled = undoingIds.has(key);
    undoButton.addEventListener("click", () => undoFromHistory(entry, undoButton));
    row.appendChild(undoButton);
  }
  item.appendChild(row);

  // F13-02: 펼치면 북마크마다 "원래 폴더 → 옮긴 폴더"
  if (expanded) {
    const movesEl = document.createElement("div");
    movesEl.className = CLS.moves;
    for (const move of moves) {
      const moveEl = document.createElement("div");
      moveEl.className = CLS.move;
      const moveTitle = document.createElement("span");
      moveTitle.className = CLS.moveTitle;
      moveTitle.textContent = move.title ?? "";
      // CSS가 없어도 "제목 · 원래 → 옮긴 폴더"로 읽히게 구분 글자를 넣는다
      const moveSep = document.createElement("span");
      moveSep.className = CLS.moveSep;
      moveSep.textContent = " · ";
      const movePath = document.createElement("span");
      movePath.className = CLS.movePath;
      movePath.textContent = TEXT.historyMove(
        folderName(names, move.fromParentId),
        folderName(names, move.toParentId),
      );
      moveEl.append(moveTitle, moveSep, movePath);
      movesEl.appendChild(moveEl);
    }
    item.appendChild(movesEl);
  }
  return item;
}

// 내역을 펼치거나 접는다. 저장소는 다시 읽지 않고 본문만 다시 그린 뒤 같은 버튼에 포커스를 돌려놓는다
function toggleEntry(dialog, body, key) {
  if (expandedIds.has(key)) expandedIds.delete(key);
  else expandedIds.add(key);
  drawBody(dialog, body);
  const toggle = [...body.querySelectorAll(`.${CLS.toggle}`)].find((el) => el.dataset.historyId === key);
  if (toggle) toggle.focus();
}

// history와 폴더 이름을 읽어 본문을 채운다. 창이 닫혔거나 더 새 읽기가 시작됐으면 버린다
async function fillBody(dialog) {
  const seq = ++loadSeq;
  let data;
  try {
    const [stored, tree] = await Promise.all([load(), loadTree()]);
    data = {
      entries: Array.isArray(stored.history) ? stored.history : [],
      names: folderNames(tree),
    };
  } catch (error) {
    if (seq !== loadSeq) return;
    console.error("정리 기록을 불러오지 못했어요", error);
    historyData = null;
    if (!dialog.isConnected || !dialog.open) return;
    const body = dialog.querySelector(`.${CLS.dialogBody}`);
    if (!body) return;
    // 토스트(#toast)는 모달 바깥이라 가려지고 화면 낭독기에도 전달되지 않는다 → 본문 안에 안내한다
    const failed = document.createElement("div");
    failed.className = CLS.empty;
    failed.setAttribute("role", "alert");
    failed.textContent = TEXT.historyLoadFailed;
    body.replaceChildren(failed);
    return;
  }
  if (seq !== loadSeq || !dialog.isConnected || !dialog.open) return;
  historyData = data;
  const body = dialog.querySelector(`.${CLS.dialogBody}`);
  if (body) drawBody(dialog, body);
}

// 창 안의 [되돌리기] (F13-07, F13-09): undo를 직접 부르고, 결과는 토스트 대신 창 안 안내 줄에 보여 준다
// (모달은 top layer라 #toast가 흐린 배경 뒤에 깔리고 화면 낭독기에도 전달되지 않는다. #notice의 [되돌리기]는 handleUndo와 토스트 그대로)
// 끝나면(성공·실패 모두) 그때 열려 있는 창의 본문을 다시 채운다. renderAll은 이 창을 다시 그리지 않는다
// 되돌리는 중에 창을 닫았다 다시 열면 누른 버튼의 창은 이미 지워졌으므로, 끝난 뒤 지금 열린 창을 id로 다시 찾는다
async function undoFromHistory(entry, button) {
  const key = String(entry.id);
  if (button.disabled || undoingIds.has(key)) return;
  undoingIds.add(key);
  button.disabled = true; // 두 번 눌리지 않게 바로 막는다

  let r;
  let failed = false;
  try {
    r = await undo(entry.id);
  } catch (error) {
    console.error("정리를 되돌리지 못했어요", error);
    failed = true;
  } finally {
    undoingIds.delete(key);
  }

  // 끝난 시점에 창이 닫혀 있으면 안내 줄 대신 토스트로 알린다 (닫은 뒤 다시 열었을 때 옛 문구가 남지 않게)
  const openNow = document.getElementById(HISTORY_DIALOG_ID);
  const isOpen = Boolean(openNow && openNow.open);
  if (failed) {
    button.disabled = false; // 다시 누를 수 있게
    if (isOpen) setStatus(TEXT.undoFailed, true);
    else showToast(TEXT.undoFailed);
  } else {
    // handleUndo처럼 이 기록의 결과 안내(#notice)는 닫는다
    clearNotice(entry.id);
    const message = undoMessage(r, entry);
    if (isOpen) setStatus(message, false);
    // handleUndo와 같게: 문구를 이어 붙였으면 읽을 시간을 조금 더 준다
    else showToast(message, message === TEXT.undone ? {} : { duration: 5000 });
  }

  const current = document.getElementById(HISTORY_DIALOG_ID);
  if (!current || !current.open) return;
  await fillBody(current);
  // 다시 그리면 눌렀던 버튼이 없어지므로, 창이 아직 열려 있으면 그 내역의 펼치기 버튼에 포커스를 돌려놓는다
  if (!current.isConnected || !current.open) return;
  const toggle = [...current.querySelectorAll(`.${CLS.toggle}`)].find((el) => el.dataset.historyId === key);
  if (toggle) toggle.focus();
}

// N43: 정리 기록 화면 (F13-01, F13-02, F13-09, F13-10)
// 머리말은 바로 그리고, 본문은 load · loadTree를 읽은 뒤 채운다. 이미 열려 있으면 내용만 바꾼다
export function showHistory() {
  const host = document.getElementById(DIALOG_HOST_ID);
  if (!host) return;

  const dialog = getHistoryDialog(host);
  const body = drawFrame(dialog);
  // 이미 열려 있어 읽어 둔 값이 있으면 먼저 그려 두고, 새로 읽은 값으로 바꾼다
  drawBody(dialog, body);
  if (!dialog.open) dialog.showModal();
  fillBody(dialog);
}
