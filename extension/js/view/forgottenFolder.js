// 담당: 팀원 B · 이슈 #9 · 명세: N42 (F04)
// 화면 파일끼리는 서로 부르지 않는다 (공통 조각은 ui.js). 크롬은 bookmarks.js와 store.js를 거친다.
// P2: [고정하기](F04-08), "N개 더 있어요 · 모두 보기", 되돌리기 줄 자리. 우클릭 메뉴(F15)는 folders.js의 showContextMenu가 합쳐진 뒤 붙인다.

import { openBookmark } from "../bookmarks.js";
import { load, dismiss, undismiss, pin } from "../store.js";
import { lastOpened } from "../forgotten.js";
import { appIcon, icon, showToast } from "../ui.js";

// 그리는 칸과 팝업을 붙이는 칸 (newtab.html)
const SLOT_ID = "forgotten-slot";
const DIALOG_HOST_ID = "dialogs";
const DIALOG_ID = "dialog-forgotten";

// 한 번에 보여 주는 개수 (F04-04 배지, F04-05 팝업). 팝업은 "모두 보기"를 누르면 전부 보여 준다
const MAX_SHOWN = 8;
// [이제 안 봐도 됨]의 되돌리기 안내 시간 (F04-09, v9)
const UNDO_MS = 6000;
// 팝업 안 안내 문구("고정은 8개까지 할 수 있어요" 등)를 보여 주는 시간
const NOTICE_MS = 4000;
const DAY = 24 * 60 * 60 * 1000;

// 마지막으로 받은 값. 팝업이 열려 있는 동안 다시 그릴 때 쓴다
let current = { items: [], actions: {} };
// 팝업 목록을 비동기로 채우는 중에 다시 불리면, 늦게 끝난 앞의 작업은 버린다
let fillToken = 0;
// [이제 안 봐도 됨]으로 뺀 북마크: ID → { time, timer }. 팝업 안 그 자리에 6초 동안 [되돌리기]를 보여 준다
// 팝업은 showModal()이라 #toast가 어두운 배경 뒤에 깔려 누를 수 없기 때문이다. 팝업을 닫으면 비운다
// 자리는 순번이 아니라 "마지막으로 연 시각"(time)으로 기억한다. 목록이 이 시각의 오래된 순이고(pickForgotten) 뺀 북마크의 시각은 바뀌지 않으므로,
// 같은 기준으로 끼우면 다른 줄을 빼거나 열어도 제자리에 생긴다. 순번으로 기억하면 둘째로 뺀 줄이 한 칸 위에 생긴다 (#46 리뷰)
const undoRows = new Map();
// dismissed에 저장하는 중인 북마크 ID. 저장이 끝나기 전에 같은 줄을 다시 눌러도 한 번만 처리한다
const dismissing = new Set();
// "N개 더 있어요 · 모두 보기"를 눌렀는지. 누르면 8개를 넘는 후보도 모두 보여 준다. 팝업을 닫으면 다시 8개로 (F04-05 비고, P2)
let showAll = false;
// pinned에 저장하는 중인 북마크 ID. 저장이 끝나기 전에 [고정하기]를 다시 눌러도 한 번만 처리한다
const pinning = new Set();
// 팝업 안 안내 문구를 지우는 타이머
let noticeTimer = null;

// "N개월 전" 같은 지난 시간 문구. 한 달이 안 되면 일, 1년 이상도 개월로 센다 (시안의 문구)
function ago(time, now) {
  const days = Math.max(0, Math.floor((now - time) / DAY));
  if (days < 30) return days === 0 ? "오늘" : `${days}일 전`;
  return `${Math.floor(days / 30)}개월 전`;
}

// "N개월 전 저장 · N개월 전에 열어 봄", 연 기록이 없으면 "연 기록 없음" (F04-05, F04-12)
function metaText(bookmark, stored, now) {
  const saved = Number.isFinite(bookmark.dateAdded) ? `${ago(bookmark.dateAdded, now)} 저장` : "저장 시각 모름";
  const { time, source } = lastOpened(bookmark, stored);
  const opened = source === "added" ? "연 기록 없음" : `${ago(time, now)}에 열어 봄`;
  return `${saved} · ${opened}`;
}

// 버튼이 아닌 요소를 누를 수 있게 한다 (키보드 Enter·Space 포함). 다시 그릴 때마다 새 요소라 리스너가 쌓이지 않는다
function makePressable(element, label, onPress) {
  element.setAttribute("role", "button");
  element.tabIndex = 0;
  element.setAttribute("aria-label", label);
  element.addEventListener("click", onPress);
  element.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onPress(event);
    }
  });
}

// 공통 버튼 하나를 만든다
function makeButton(label, { variant = "", onClick, ariaLabel } = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = variant ? `btn ${variant}` : "btn";
  if (label) button.textContent = label;
  if (ariaLabel) button.setAttribute("aria-label", ariaLabel);
  if (onClick) button.addEventListener("click", onClick);
  return button;
}

// N42: 잊고 있던 북마크 폴더(개수 배지)와 팝업을 #forgotten-slot 칸에 그린다. items는 pickForgotten의 결과, 앞의 8개만 보여 준다
// actions는 render.js가 넘겨 주는 동작 묶음이다. [어디 있는지 보기]는 actions.openFolder(folderId)를 부른다
export function showForgotten(items, actions) {
  current = { items: Array.isArray(items) ? items : [], actions: actions ?? {} };
  const slot = document.getElementById(SLOT_ID);
  if (slot) renderCard(slot, current.items);

  // 열려 있는 팝업은 닫지 않고 목록만 새로 채운다 (연 것·뺀 것이 빠지고 다음 후보가 올라온다)
  const dialog = document.getElementById(DIALOG_ID);
  if (dialog?.open) fillList(dialog);
}

// 폴더 카드: 시계 아이콘 + 개수 배지(최대 8) + "잊고 있던 북마크". 후보가 없으면 칸을 비워 숨긴다 (F04-04, F04-11)
// 칸(#forgotten-slot) 자체가 카드 모양이라 칸에 누르기 동작을 단다. 같은 칸을 다시 쓰므로 on…으로 덮어써 쌓이지 않게 한다
function renderCard(slot, items) {
  slot.replaceChildren();
  if (items.length === 0) {
    slot.removeAttribute("role");
    slot.removeAttribute("tabindex");
    slot.removeAttribute("aria-label");
    slot.onclick = null;
    slot.onkeydown = null;
    return;
  }

  const count = Math.min(items.length, MAX_SHOWN);
  const head = document.createElement("div");
  head.className = "actions forgotten__head";
  const logo = document.createElement("span");
  logo.className = "brand__logo brand__logo--primary";
  logo.appendChild(icon("clock", 20));
  const badge = document.createElement("span");
  badge.className = "badge-count";
  badge.textContent = String(count);
  head.append(logo, badge);

  const title = document.createElement("div");
  title.className = "forgotten__title";
  title.textContent = "잊고 있던 북마크";
  const desc = document.createElement("div");
  desc.className = "forgotten__desc";
  desc.textContent = "오랜만에 다시 만나보세요";

  slot.append(head, title, desc);
  slot.setAttribute("role", "button");
  slot.tabIndex = 0;
  slot.setAttribute("aria-label", `잊고 있던 북마크 ${count}개 보기`);
  slot.onclick = openDialog;
  slot.onkeydown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDialog();
    }
  };
}

// 팝업: 제목·설명·닫기 + 목록 + "북마크는 원래 폴더에 그대로 있어요" (F04-05, F04-06)
function openDialog() {
  const host = document.getElementById(DIALOG_HOST_ID);
  if (!host) return;
  const existing = document.getElementById(DIALOG_ID);
  if (existing?.open) return;
  existing?.remove();

  const dialog = document.createElement("dialog");
  dialog.className = "dialog";
  dialog.id = DIALOG_ID;

  const panel = document.createElement("div");
  panel.className = "dialog__panel";

  const header = document.createElement("div");
  header.className = "dialog__header";
  const headText = document.createElement("div");
  const title = document.createElement("div");
  title.className = "dialog__title";
  const logo = document.createElement("span");
  logo.className = "brand__logo";
  logo.appendChild(icon("clock", 18));
  title.append(logo, "잊고 있던 북마크");
  const subtitle = document.createElement("div");
  subtitle.className = "dialog__subtitle";
  subtitle.textContent = "30일 넘게 열지 않은 북마크를 다시 꺼내 왔어요.";
  headText.append(title, subtitle);
  const closeButton = makeButton("", { variant: "btn--icon", ariaLabel: "창 닫기", onClick: () => dialog.close() });
  closeButton.appendChild(icon("close", 20));
  header.append(headText, closeButton);

  const body = document.createElement("div");
  body.className = "dialog__body";
  // 팝업 안 안내 문구. 팝업은 showModal()이라 #toast가 어두운 배경 뒤에 깔려 보이지 않으므로 여기에 보여 준다
  const notice = document.createElement("div");
  notice.className = "dialog__subtitle";
  notice.dataset.role = "notice";
  notice.setAttribute("role", "status");
  notice.hidden = true;
  const list = document.createElement("div");
  list.className = "list";
  const note = document.createElement("div");
  note.className = "dialog__subtitle";
  note.textContent = "북마크는 원래 폴더에 그대로 있어요";
  body.append(notice, list, note);

  panel.append(header, body);
  dialog.appendChild(panel);
  // 바깥(어두운 배경)을 누르면 닫는다. Esc로 닫기는 <dialog>의 기본 동작이다
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    clearUndoRows();
    showAll = false;
    clearTimeout(noticeTimer);
    noticeTimer = null;
    dialog.remove();
  });

  host.appendChild(dialog);
  dialog.showModal();
  fillList(dialog);
}

// 목록을 앞의 8개로 채운다("모두 보기"를 눌렀으면 전부). "연 기록 없음"을 가리려면 우리 기록(lastOpenedByUs)이 필요해 저장 항목을 읽는다
// 방금 뺀 북마크는 render.js가 다시 그리기 전이라도 빼고, 그 자리에 [되돌리기] 줄을 끼워 넣는다
async function fillList(dialog) {
  const token = ++fillToken;
  const remaining = current.items.filter((bookmark) => !undoRows.has(String(bookmark.id)));
  const items = showAll ? remaining : remaining.slice(0, MAX_SHOWN);
  const hidden = remaining.length - items.length;
  let stored = {};
  try {
    stored = await load();
  } catch (error) {
    console.warn("저장 항목을 읽지 못해 크롬 기록만으로 표시해요", error);
  }
  if (token !== fillToken || !dialog.isConnected) return;

  const list = dialog.querySelector(".list");
  if (!list) return;
  const now = Date.now();
  const rows = placeUndoRows(
    items.map((bookmark) => {
      const { time } = lastOpened(bookmark, stored);
      return { time, row: renderRow(bookmark, time, stored, now, dialog) };
    }),
    (id) => renderUndoRow(id, dialog),
  );
  if (rows.length === 0) {
    const empty = document.createElement("div");
    empty.className = "dialog__subtitle";
    empty.textContent = "지금은 다시 꺼내 볼 북마크가 없어요";
    list.replaceChildren(empty);
    return;
  }
  if (hidden > 0) rows.push(renderMoreRow(hidden, dialog));
  list.replaceChildren(...rows);
}

// 목록 아래 "N개 더 있어요 · 모두 보기" (확정 시안). 누르면 나머지 후보까지 모두 보여 준다
function renderMoreRow(hidden, dialog) {
  const row = document.createElement("div");
  row.className = "dialog__subtitle";
  row.append(
    makeButton(`${hidden}개 더 있어요 · 모두 보기`, {
      variant: "btn--ghost",
      onClick: () => {
        showAll = true;
        fillList(dialog);
      },
    }),
  );
  return row;
}

// 일반 줄({ time, row }, 오래된 순)과 되돌리기 줄을 "마지막으로 연 시각" 순으로 합쳐 줄 목록을 돌려준다
// 시각이 같으면 일반 줄 다음에 둔다 (pickForgotten은 같은 시각이면 들어온 순서를 지키는데, 뺀 북마크의 그 순서는 알 수 없다)
function placeUndoRows(entries, makeUndoRow) {
  const undo = [...undoRows].map(([id, { time }]) => ({ id, time })).sort((a, b) => a.time - b.time);
  const rows = [];
  let u = 0;
  for (const { time, row } of entries) {
    while (u < undo.length && undo[u].time < time) rows.push(makeUndoRow(undo[u++].id));
    rows.push(row);
  }
  while (u < undo.length) rows.push(makeUndoRow(undo[u++].id));
  return rows;
}

// 뺀 북마크 자리에 6초 동안 보이는 줄: "목록에서 뺐어요" + [되돌리기] (F04-09)
function renderUndoRow(id, dialog) {
  const row = document.createElement("div");
  row.className = "list__row";
  const text = document.createElement("span");
  text.className = "list__text";
  const meta = document.createElement("span");
  meta.className = "meta";
  meta.textContent = "목록에서 뺐어요";
  text.appendChild(meta);
  row.append(text, makeButton("되돌리기", { variant: "btn--ghost", onClick: () => undoDismiss(id, dialog) }));
  return row;
}

// 팝업을 닫거나 다시 열 때 되돌리기 줄과 타이머를 비운다
function clearUndoRows() {
  for (const { timer } of undoRows.values()) clearTimeout(timer);
  undoRows.clear();
}

// 목록 한 줄: 앱 아이콘과 제목(누르면 열기) + 저장·연 시각 + [이제 안 봐도 됨] [어디 있는지 보기]
// time은 이 북마크를 마지막으로 연 시각(lastOpened). 뺐을 때 되돌리기 줄의 자리로 쓴다
function renderRow(bookmark, time, stored, now, dialog) {
  const row = document.createElement("div");
  row.className = "list__row";
  const name = bookmark.title || bookmark.url;

  // 아이콘과 제목 어느 쪽을 눌러도 연다 (F04-07). Ctrl·⌘·Shift 클릭과 가운데 클릭은 새 탭으로
  const open = (event) => openItem(bookmark, event?.ctrlKey || event?.metaKey || event?.shiftKey || event?.button === 1, dialog);
  const tile = appIcon(bookmark, 44);
  makePressable(tile, `${name} 열기`, open);
  tile.addEventListener("auxclick", (event) => {
    if (event.button === 1) open(event);
  });

  const text = document.createElement("span");
  text.className = "list__text";
  const title = document.createElement("span");
  title.className = "title";
  title.textContent = name;
  makePressable(title, `${name} 열기`, open);
  title.addEventListener("auxclick", (event) => {
    if (event.button === 1) open(event);
  });
  const meta = document.createElement("span");
  meta.className = "meta";
  meta.textContent = metaText(bookmark, stored, now);

  const buttons = document.createElement("span");
  buttons.className = "actions";
  // 버튼 순서는 확정 시안대로 [고정하기] [이제 안 봐도 됨] [어디 있는지 보기]
  buttons.append(
    makeButton("고정하기", { variant: "btn--ghost", onClick: () => pinItem(bookmark, dialog) }),
    makeButton("이제 안 봐도 됨", { variant: "btn--ghost", onClick: () => dismissItem(bookmark, time, dialog) }),
    makeButton("어디 있는지 보기", { variant: "btn--ghost", onClick: () => showLocation(bookmark, dialog) }),
  );

  text.append(title, meta, buttons);
  row.append(tile, text);
  return row;
}

// 연다. 연 시각은 openBookmark가 기록하고, 기록이 바뀌면 render.js가 다시 그려 목록에서 빠진다 (F04-07)
async function openItem(bookmark, newTab, dialog) {
  try {
    const opened = await openBookmark(bookmark, { newTab });
    if (opened === false) showToast("이 북마크는 열 수 없어요");
    else if (!newTab) dialog.close();
  } catch (error) {
    console.warn("북마크를 열지 못했어요", error);
    showToast("북마크를 열지 못했어요");
  }
}

// 팝업 안에 안내 문구를 잠깐 보여 준다
function showNotice(dialog, text) {
  const notice = dialog.querySelector('[data-role="notice"]');
  if (!notice) return;
  notice.textContent = text;
  notice.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    noticeTimer = null;
    notice.hidden = true;
    notice.textContent = "";
  }, NOTICE_MS);
}

// [고정하기]: 독(pinned)에 추가한다 (F04-08). 고정한 북마크는 pickForgotten이 빼므로, 저장이 바뀌면 render.js가 다시 그려 후보에서 빠진다
// 독이 이미 8개면 pin이 false를 돌려준다. 그때는 넣지 않고 "고정은 8개까지 할 수 있어요"를 보여 준다 (F08-06)
async function pinItem(bookmark, dialog) {
  const id = String(bookmark.id);
  if (pinning.has(id)) return;
  pinning.add(id);
  let added;
  try {
    added = await pin(id);
  } catch (error) {
    console.warn("고정하지 못했어요", error);
    if (dialog.isConnected) showNotice(dialog, "고정하지 못했어요");
    return;
  } finally {
    pinning.delete(id);
  }
  if (!dialog.isConnected) return;
  showNotice(dialog, added ? "고정됨에 추가했어요" : "고정은 8개까지 할 수 있어요");
}

// [이제 안 봐도 됨]: dismissed에 기록하고, 그 줄 자리에 6초 동안 [되돌리기]를 보여 준다 (F04-09)
// time(마지막으로 연 시각)으로 자리를 기억한다
async function dismissItem(bookmark, time, dialog) {
  const id = String(bookmark.id);
  if (dismissing.has(id) || undoRows.has(id)) return;
  dismissing.add(id);
  try {
    await dismiss(id);
  } catch (error) {
    console.warn("목록에서 빼지 못했어요", error);
    return;
  } finally {
    dismissing.delete(id);
  }
  if (!dialog.isConnected) return;
  const timer = setTimeout(() => {
    undoRows.delete(id);
    if (dialog.isConnected) fillList(dialog);
  }, UNDO_MS);
  undoRows.set(id, { time, timer });
  fillList(dialog);
}

// [되돌리기]: dismissed에서 지운다. 기록이 바뀌면 render.js가 다시 그려 그 북마크가 목록에 돌아온다
async function undoDismiss(id, dialog) {
  const pending = undoRows.get(id);
  if (!pending) return;
  clearTimeout(pending.timer);
  undoRows.delete(id);
  try {
    await undismiss(id);
  } catch (error) {
    console.warn("되돌리지 못했어요", error);
  }
  if (dialog.isConnected) fillList(dialog);
}

// [어디 있는지 보기]: 이 팝업을 닫고, 그 북마크가 들어 있는 폴더의 팝업을 연다 (F04-10)
function showLocation(bookmark, dialog) {
  const openFolder = current.actions.openFolder;
  if (typeof openFolder !== "function") {
    console.warn("actions.openFolder가 없어 폴더를 열 수 없어요");
    return;
  }
  dialog.close();
  openFolder(bookmark.parentId);
}
