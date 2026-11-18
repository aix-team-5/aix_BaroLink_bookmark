// 담당: 팀원 D · 이슈 #19 · 명세: N36 (F17, P3)
// 드래그 이동. SortableJS는 쓰지 않고 크롬 기본 끌어 놓기(HTML drag and drop)로 한다 (P3 정리본 Q5)
// - 앱만 끈다. 끄는 쪽(손잡이)은 makeDraggable, 놓는 쪽은 makeDropTarget(앱 폴더·하위 폴더)·makeSortable(폴더 팝업 안 순서)
// - 놓으면 bookmarks.js의 moveBookmark(N03)만 부르고 DOM은 그대로 둔다. 화면은 크롬 onMoved 알림으로 render.js가 다시 그린다
// - setPending을 부르지 않는다. 그래서 다른 폴더로 옮기면 서비스 워커가 manualMoves에 기록한다 (F17-01, F15-02와 같음)
// - 표시(F17-06~09)는 드래그 이벤트에서 CSS 클래스만 붙이고 뗀다. 모양은 newtab.css의 .dnd-*

import { moveBookmark } from "./bookmarks.js";
import { appIcon, showToast } from "./ui.js";

// 끄는 동안의 상태 { bookmark, tile }. 끄지 않을 때는 null
let drag = null;
// 놓을 수 있는 폴더 타일 { tile, folderId, name }. 끌기를 시작할 때 점선 테두리를 붙인다 (F17-06)
const targets = new Set();
// 화면 위·아래 가장자리에서 자동으로 굴리는 거리와 범위 (F17-01 비고)
const EDGE_PX = 64;
const SCROLL_STEP = 18;
// 우리 끌기인지 알아보는 데이터 종류 (다른 탭·파일 끌기와 섞이지 않게)
const DRAG_TYPE = "application/x-barolink-bookmark";
// F17-10: 끄는 동안 <html>에 붙이는 클래스. 끝나면 떼고 document에 "dnd:end"를 보낸다
const DRAGGING_CLASS = "is-dragging";

// N36(v21까지의 이름): 명세 v22에서 아래 세 함수로 나뉜다. 지금 명세와 자동 검사가 이 이름을 찾으므로 남겨 둔다 (하는 일 없음)
export function initDnd(container) {}

// 끄는 쪽: 앱 칸에 점 6개 손잡이를 붙이고, 손잡이로만 끌 수 있게 한다 (F17-01·02)
// tile: 앱 하나를 감싸는 요소(손잡이를 그 안에 붙인다). bookmark: loadTree의 북마크 객체
// 관리자가 정한 북마크(unmodifiable)에는 손잡이를 붙이지 않는다 (F17-04). 북마크 검색 결과에는 부르지 않는다 (F17-04)
export function makeDraggable(tile, bookmark) {
  if (!tile || !bookmark || bookmark.id == null || bookmark.unmodifiable) return;
  tile.classList.add("dnd-item");
  tile.dataset.bookmarkId = String(bookmark.id);
  items.set(tile, bookmark);

  const handle = document.createElement("span");
  handle.className = "dnd-handle";
  handle.draggable = true;
  handle.title = "끌어서 폴더에 넣기";
  handle.setAttribute("aria-hidden", "true");
  handle.addEventListener("dragstart", (event) => start(event, tile, bookmark));
  handle.addEventListener("dragend", finish);
  // 손잡이를 눌러도 앱이 열리지 않게 한다
  handle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  tile.appendChild(handle);
}

// 놓는 쪽: 앱 폴더·하위 폴더 타일. 위에 놓으면 그 폴더 맨 뒤로 옮긴다 (F17-01·02)
// options.name: 안내에 쓸 폴더 이름. 없으면 타일 안의 .folder__name 글자를 쓴다
export function makeDropTarget(tile, folderId, options = {}) {
  if (!tile || folderId == null) return;
  const entry = { tile, folderId: String(folderId), name: options.name ?? null };
  targets.add(entry);
  tile.classList.add("dnd-target");

  // 놓을 수 있을 때만 preventDefault 한다. 하지 않으면 크롬이 '놓을 수 없음' 모양을 보인다 (F17-09)
  const over = (event) => {
    if (!canDropInto(entry)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    if (!tile.classList.contains("dnd-over")) {
      clearOver();
      // 팝업 안 하위 폴더 위로 오면 앱 사이 세로 막대는 지운다 (목록의 dragover까지 올라가지 않으므로 여기서 지운다)
      for (const list of document.querySelectorAll(".dnd-sortable")) clearBar(list);
      tile.classList.add("dnd-over");
      // 안내 문구는 CSS가 data-drop-label을 글자로만 보인다 (HTML로 읽지 않음)
      tile.dataset.dropLabel = `'${folderName(entry)}'에 넣기`;
    }
  };
  tile.addEventListener("dragenter", over);
  tile.addEventListener("dragover", over);
  tile.addEventListener("dragleave", (event) => {
    // 타일 안의 다른 요소로 옮겨 가는 것은 벗어난 것이 아니다
    if (event.relatedTarget && tile.contains(event.relatedTarget)) return;
    tile.classList.remove("dnd-over");
    delete tile.dataset.dropLabel;
  });
  tile.addEventListener("drop", (event) => {
    if (!canDropInto(entry)) return;
    event.preventDefault();
    event.stopPropagation();
    const bookmark = drag.bookmark;
    finish();
    // 맨 뒤로 (index를 넘기지 않음)
    move(bookmark, entry.folderId, undefined, tile);
  });
}

// 놓는 쪽: 폴더 팝업 안의 앱 목록. 앱 사이에 놓으면 그 자리로 옮겨 순서를 바꾼다 (F17-02·08)
// listEl: 앱 칸(makeDraggable을 부른 요소)이 들어 있는 목록. parentId: 그 목록이 보여 주는 폴더 ID
// 목록 안의 하위 폴더 타일은 makeDropTarget이 맡는다 (그 위에서는 세로 막대를 보이지 않는다)
export function makeSortable(listEl, parentId) {
  if (!listEl || parentId == null) return;
  const folderId = String(parentId);
  listEl.classList.add("dnd-sortable");

  const over = (event) => {
    if (!drag) return;
    // 하위 폴더 타일 위면 그 타일이 맡는다
    if (insideTarget(event.target, listEl)) {
      clearBar(listEl);
      return;
    }
    const spot = spotAt(listEl, event);
    if (!spot || isSameSpot(listEl, spot, folderId)) {
      clearBar(listEl);
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    showBar(listEl, spot);
  };
  listEl.addEventListener("dragenter", over);
  listEl.addEventListener("dragover", over);
  listEl.addEventListener("dragleave", (event) => {
    if (event.relatedTarget && listEl.contains(event.relatedTarget)) return;
    clearBar(listEl);
  });
  listEl.addEventListener("drop", (event) => {
    if (!drag || insideTarget(event.target, listEl)) return;
    const spot = spotAt(listEl, event);
    if (!spot || isSameSpot(listEl, spot, folderId)) return;
    event.preventDefault();
    const bookmark = drag.bookmark;
    const index = finalIndex(bookmark, folderId, listEl, spot);
    finish();
    move(bookmark, folderId, index, listEl);
  });
}

// ----- 안쪽 -----

// 앱 칸 → 북마크 (순서 바꾸기에서 놓일 자리의 크롬 순서 번호를 알아낸다)
const items = new WeakMap();

function start(event, tile, bookmark) {
  drag = { bookmark, tile };
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(DRAG_TYPE, String(bookmark.id));
    // 손잡이가 아니라, 앱 아이콘과 이름이 든 작은 카드가 끌려가는 모양으로 보인다 (시안)
    if (typeof event.dataTransfer.setDragImage === "function") {
      const ghost = buildGhost(tile, bookmark);
      document.body.appendChild(ghost);
      event.dataTransfer.setDragImage(ghost, 36, 36);
      // 크롬은 dragstart 안에서 모양을 찍어 두므로 바로 치워도 된다
      setTimeout(() => ghost.remove(), 0);
    }
  }
  // F17-06: 끄는 앱의 원래 자리를 흐리게, 놓을 수 있는 폴더에 점선 테두리
  tile.classList.add("dnd-source");
  for (const entry of [...targets]) {
    if (!entry.tile.isConnected) {
      targets.delete(entry);
      continue;
    }
    if (canDropInto(entry)) entry.tile.classList.add("dnd-candidate");
  }
  document.addEventListener("dragover", autoScroll);

  // F17-10 '끄는 중' 표시: <html>에 is-dragging. render.js·folders.js는 이게 붙어 있으면 다시 그리기를 미룬다
  document.documentElement.classList.add(DRAGGING_CLASS);
  // 끝나는 때: dragend(손잡이), document의 drop, 그리고 끄던 칸이 DOM에서 빠져 dragend가 오지 않을 때를 위해 끌기 뒤 첫 pointerdown
  document.addEventListener("drop", finish);
  document.addEventListener("pointerdown", finish, { capture: true, once: true });
}

// 끄는 동안 마우스를 따라다니는 카드: 손잡이 점 + 앱 아이콘 + 이름 (시안). 화면 밖에 잠깐 그려 모양만 찍는다
// 아이콘은 칸에 이미 그려진 것을 복사한다(파비콘을 다시 받지 않게). 없으면 새로 그린다. 이름은 textContent로만 넣는다
function buildGhost(tile, bookmark) {
  const ghost = document.createElement("div");
  ghost.className = "dnd-ghost";
  const grip = document.createElement("span");
  grip.className = "dnd-ghost__grip";
  const drawn = tile.querySelector(".app-icon");
  const iconEl = drawn && typeof drawn.cloneNode === "function" ? drawn.cloneNode(true) : appIcon(bookmark, 48);
  const name = document.createElement("span");
  name.className = "dnd-ghost__name";
  name.textContent = bookmark.title || bookmark.url || "";
  ghost.append(grip, iconEl, name);
  return ghost;
}

// 끌기가 끝나면(놓기·Esc·취소) 모든 표시를 지운다 (F17-06)
// 여러 번 불려도 된다(놓기 → dragend → drop 순으로 겹쳐 온다). '끄는 중'을 뗄 때 한 번만 dnd:end를 보낸다 (F17-10)
function finish() {
  if (drag) drag.tile.classList.remove("dnd-source");
  drag = null;
  for (const entry of [...targets]) {
    entry.tile.classList.remove("dnd-candidate", "dnd-over");
    delete entry.tile.dataset.dropLabel;
    if (!entry.tile.isConnected) targets.delete(entry);
  }
  for (const list of document.querySelectorAll(".dnd-sortable")) clearBar(list);
  document.removeEventListener("dragover", autoScroll);
  document.removeEventListener("drop", finish);
  document.removeEventListener("pointerdown", finish, { capture: true });

  const root = document.documentElement;
  if (root.classList.contains(DRAGGING_CLASS)) {
    root.classList.remove(DRAGGING_CLASS);
    document.dispatchEvent(new CustomEvent("dnd:end"));
  }
}

// 지금 끄는 앱을 이 폴더에 넣을 수 있는지. 이미 들어 있는 폴더면 옮기지 않는다 (F17-05)
function canDropInto(entry) {
  return Boolean(drag) && String(drag.bookmark.parentId) !== entry.folderId;
}

function folderName(entry) {
  if (entry.name) return entry.name;
  const label = entry.tile.querySelector(".folder__name");
  return (label && label.textContent.trim()) || "폴더";
}

function clearOver() {
  for (const entry of targets) {
    entry.tile.classList.remove("dnd-over");
    delete entry.tile.dataset.dropLabel;
  }
}

function insideTarget(node, listEl) {
  let el = node;
  while (el && el !== listEl) {
    if (el.classList && el.classList.contains("dnd-target")) return true;
    el = el.parentNode;
  }
  return false;
}

// 마우스가 있는 앱 칸과, 그 앞인지 뒤인지 { tile, bookmark, after }
// 칸은 가로로 놓이므로 칸 가운데보다 왼쪽이면 앞, 오른쪽이면 뒤다
function spotAt(listEl, event) {
  let el = event.target;
  while (el && el !== listEl && !(el.classList && el.classList.contains("dnd-item"))) el = el.parentNode;
  if (!el || el === listEl) return null;
  const bookmark = items.get(el);
  if (!bookmark || typeof bookmark.index !== "number") return null;
  const rect = el.getBoundingClientRect();
  return { tile: el, bookmark, after: event.clientX > rect.left + rect.width / 2 };
}

// 놓을 자리 바로 오른쪽의 앱 칸 (명세 v22 F17-02·N36). 칸 앞에 놓으면 그 칸, 칸 뒤에 놓으면 목록에서 다음 앱 칸, 맨 끝이면 null
// 앱 칸(.dnd-item)만 센다. 하위 폴더 타일과 되돌리기 칸(.bookmark--removed)은 앱이 아니므로 건너뛴다
// 팝업은 하위 폴더를 앞에 따로 그리므로 화면 순번이 아니라 이 앱의 크롬 index를 기준으로 삼는다
function rightApp(listEl, spot) {
  if (!spot.after) return spot.bookmark;
  const cells = [...listEl.querySelectorAll(".dnd-item")];
  const next = cells[cells.indexOf(spot.tile) + 1];
  return next ? items.get(next) ?? null : null;
}

// moveBookmark(N03)에 넘길 '옮긴 뒤 위치'. undefined면 index 없이 부른다(맨 뒤)
// 오른쪽 앱 X가 있으면: 끄는 앱이 같은 폴더에 있고 그 index가 X.index보다 작으면 X.index - 1, 아니면 X.index
// 같은 폴더 뒤쪽으로 옮길 때 크롬이 번호를 하나 더 받는 것은 moveBookmark가 맞춘다 (F17-02 비고)
// 예: [A0,B1,C2,D3]에서 A를 B와 C 사이에 놓으면 오른쪽 앱 C(2) → 2 - 1 = 1 → [B,A,C,D]
function finalIndex(bookmark, folderId, listEl, spot) {
  const right = rightApp(listEl, spot);
  if (!right || typeof right.index !== "number") return undefined;
  if (String(bookmark.parentId) === folderId && bookmark.index < right.index) return right.index - 1;
  return right.index;
}

// 순서가 그대로인 자리면 true (계산한 값이 지금 index와 같으면 부르지 않는다)
// 맨 끝(오른쪽 앱 없음)은 끄는 앱이 이미 목록의 마지막 앱일 때 그대로다
function isSameSpot(listEl, spot, folderId) {
  if (!drag) return true;
  const bookmark = drag.bookmark;
  if (String(spot.bookmark.id) === String(bookmark.id)) return true;
  if (String(bookmark.parentId) !== folderId) return false;
  const right = rightApp(listEl, spot);
  if (!right) {
    const cells = [...listEl.querySelectorAll(".dnd-item")];
    const last = items.get(cells[cells.length - 1]);
    return Boolean(last) && String(last.id) === String(bookmark.id);
  }
  return String(right.id) === String(bookmark.id) || finalIndex(bookmark, folderId, listEl, spot) === bookmark.index;
}

// F17-08: 놓일 자리에 세로 막대
function showBar(listEl, spot) {
  const cls = spot.after ? "dnd-insert-after" : "dnd-insert-before";
  if (spot.tile.classList.contains(cls)) return;
  clearBar(listEl);
  spot.tile.classList.add(cls);
}

function clearBar(listEl) {
  for (const el of listEl.querySelectorAll(".dnd-insert-before, .dnd-insert-after")) {
    el.classList.remove("dnd-insert-before", "dnd-insert-after");
  }
}

// 끄는 동안 화면 위·아래 가장자리에 가면 그쪽으로 굴린다 (F17-01 비고)
function autoScroll(event) {
  const height = window.innerHeight;
  if (event.clientY < EDGE_PX) window.scrollBy(0, -SCROLL_STEP);
  else if (event.clientY > height - EDGE_PX) window.scrollBy(0, SCROLL_STEP);
}

// 크롬 북마크를 옮긴다. 실패하면 안내만 띄운다 (화면은 onMoved 알림으로 다시 그려지므로 직접 고치지 않는다)
async function move(bookmark, folderId, index, near) {
  try {
    await moveBookmark(bookmark.id, folderId, index);
  } catch (error) {
    console.warn("북마크를 옮기지 못했어요", error);
    // 팝업 안에서 놓았으면 그 팝업 안에 띄운다 (#toast는 showModal 배경 뒤에 가려진다)
    const dialog = near && typeof near.closest === "function" ? near.closest("dialog") : null;
    showToast("북마크를 옮기지 못했어요", { container: dialog && dialog.open ? dialog : null });
  }
}
