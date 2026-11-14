// 담당: 팀원 C · 이슈 #13 · 명세: N41 (F03, F15)
// 화면 파일끼리는 서로 부르지 않는다 (공통 조각은 ui.js). 크롬은 bookmarks.js를 거친다.

import { createFolder, deleteFolderKeepChildren, moveBookmark, openBookmark, renameFolder } from "../bookmarks.js";
import { load, pin, unpin } from "../store.js";
import { appIcon, icon, showToast } from "../ui.js";

const SLOT_ID = "folder-list";
const DIALOG_HOST_ID = "dialogs";
const POPUP_ID = "dialog-folder";
const POPUP_TITLE_ID = "dialog-folder-title";
const PREVIEW_COUNT = 4;
const PREVIEW_ICON_SIZE = 40;
const POPUP_ICON_SIZE = 48;
// 우클릭 메뉴가 화면 가장자리와 띄울 거리(px). 위치 계산에만 쓴다
const MENU_MARGIN = 8;
// 팝업이 닫힌 뒤 실패를 알리는 안내는 문구가 길어서 오래 보여 준다
const ERROR_TOAST_MS = 5000;

// showFolders가 받은 가장 최근 tree. openFolderPopup(folderId)이 폴더를 찾을 때 쓴다 (render.js는 폴더 ID만 넘긴다)
let latestTree = null;
// 지금 팝업에 보이는 폴더 ID. 닫히면 null
let openFolderId = null;
// 팝업 상태. 다시 그려도(showFolders) 지우지 않고, 폴더를 새로 열거나 팝업을 닫으면 되돌린다
// mode: "view"(보기) | "rename"(이름 바꾸는 중) | "delete"(삭제 확인 중) | "create"(새 폴더 만들기)
// draft: 입력 칸에 친 글자 · message: 팝업 안 안내 줄 { text, error } 또는 null · busy: 크롬 북마크를 바꾸는 중
// focusKey: 다음에 그릴 때 포커스할 요소의 data-focus-key. 쓰고 나면 null
// job: busy를 건 작업 번호 (없으면 0). 팝업을 닫고 다른 작업을 시작했을 때 앞 작업이 끝나며 뒤 작업의 busy를 풀지 않게 한다
let popup = { mode: "view", draft: "", message: null, busy: false, focusKey: null, job: 0 };
// 마지막으로 시작한 작업 번호 (0부터 1씩 늘린다)
let lastJob = 0;
// 지금 열려 있는 우클릭 메뉴. 한 번에 하나. 닫히면 null
// { el, bookmark, container, page: "main" | "folders", x, y, busy, returnFocus, returnKey, cleanup, pinned }
// returnKey: returnFocus가 우리 폴더 팝업의 앱 타일이면 그 data-focus-key. 다시 그려져 타일이 바뀌어도 새 타일을 찾는다
// pinned: 독에 고정돼 있는가. true | false | null(아직 모름). 메인 화면을 다시 그릴 때 이 값을 쓴다 (다시 읽지 않는다)
let menu = null;

// 팝업 상태를 기본값으로 되돌린다
function resetPopup() {
  popup.mode = "view";
  popup.draft = "";
  popup.message = null;
  popup.busy = false;
  popup.focusKey = null;
  popup.job = 0;
}

// 크롬 북마크를 바꾸는 작업을 시작한다: 새 작업 번호로 busy를 건다. 그 번호를 돌려준다
function startJob() {
  lastJob += 1;
  popup.busy = true;
  popup.job = lastJob;
  return lastJob;
}

// 작업이 끝났을 때: busy를 건 작업이 이 작업이면 busy를 풀고 true
// 그사이 팝업을 닫거나(resetPopup) 다른 작업이 busy를 걸었으면 아무것도 바꾸지 않고 false
function finishJob(job) {
  if (popup.job !== job) return false;
  popup.busy = false;
  popup.job = 0;
  return true;
}

// 팝업이 닫힌 뒤(또는 다른 작업으로 바뀐 뒤) 끝난 작업의 결과를 알린다
// showModal()로 연 팝업은 #toast를 어두운 배경 뒤에 가리므로, 그사이 다른 팝업을 열었으면 그 안에 띄운다
// container 옵션은 ui.js showToast에 있다 (#65, forgottenFolder.js의 showNotice와 같은 방식)
function notifyAfterClose(text, error = false) {
  const openDialog = document.querySelector("dialog[open]");
  const options = {};
  if (openDialog) options.container = openDialog;
  if (error) options.duration = ERROR_TOAST_MS;
  showToast(text, options);
}

// 줄에 보일 폴더: 최상위 폴더(북마크바·기타·모바일) 바로 아래의 폴더. 순서는 tree.folders 그대로 (F03-02)
// 최상위 폴더 자체는 tree.folders에 없으므로 보이지 않는다. 하위 폴더도 보이지 않는다
function topFolders(tree) {
  const folders = Array.isArray(tree?.folders) ? tree.folders : [];
  return folders.filter((folder) => folder.parentId === folder.rootId);
}

// 폴더 바로 아래의 북마크를 index 순으로 (하위 폴더 안의 북마크는 넣지 않는다)
function bookmarksIn(tree, folderId) {
  const bookmarks = Array.isArray(tree?.bookmarks) ? tree.bookmarks : [];
  const id = String(folderId);
  return bookmarks
    .filter((bookmark) => bookmark.parentId === id)
    .sort((a, b) => a.index - b.index);
}

// 폴더 바로 아래의 하위 폴더를 index 순으로 (filter로 만든 새 배열만 정렬한다)
function foldersIn(tree, folderId) {
  const folders = Array.isArray(tree?.folders) ? tree.folders : [];
  const id = String(folderId);
  return folders
    .filter((folder) => folder.parentId === id)
    .sort((a, b) => a.index - b.index);
}

// 폴더 하나: 미리보기 앱 아이콘(최대 4개) + 이름 + 개수. 누르면 폴더 팝업을 연다
function folderTile(folder, items) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "folder";
  button.dataset.folderId = folder.id;

  const thumb = document.createElement("span");
  thumb.className = "folder__thumb";
  for (const bookmark of items.slice(0, PREVIEW_COUNT)) {
    const tile = appIcon(bookmark, PREVIEW_ICON_SIZE);
    // 미리보기 칸 크기에 맞춘다
    tile.style.width = "100%";
    tile.style.height = "auto";
    thumb.appendChild(tile);
  }

  // 폴더 이름은 textContent로만 넣는다 (innerHTML 금지)
  const name = document.createElement("span");
  name.className = "folder__name";
  name.textContent = folder.title || "이름 없는 폴더";

  const count = document.createElement("span");
  count.className = "folder__count";
  count.textContent = `${items.length}개`;

  button.append(thumb, name, count);
  button.addEventListener("click", () => openFolderPopup(folder.id));
  return button;
}

// 내 폴더 줄 끝의 [새 폴더] 칸. 누르면 폴더 만들기 팝업을 연다 (F03-04)
// 확정 시안에 폴더 만들기 버튼이 없어 추천안으로 만든다. PR에서 팀원 D 의견을 받는다
// 폴더가 아니므로 data-folder-id와 개수(.folder__count)는 넣지 않는다
function newFolderTile() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "folder";
  button.dataset.action = "new-folder";
  button.setAttribute("aria-label", "새 폴더 만들기");

  const thumb = document.createElement("span");
  thumb.className = "folder__thumb";
  // plus 아이콘을 칸 가운데에 둔다
  thumb.style.display = "flex";
  thumb.style.alignItems = "center";
  thumb.style.justifyContent = "center";
  thumb.style.color = "var(--color-text-faint)";
  thumb.appendChild(icon("plus", 28));

  const name = document.createElement("span");
  name.className = "folder__name";
  name.textContent = "새 폴더";

  button.append(thumb, name);
  button.addEventListener("click", () => openCreatePopup());
  return button;
}

// N41: 내 폴더 줄을 #folder-list 칸에 그린다 (render.js가 부른다)
// 여러 번 불려도 결과가 같다. 칸을 비우고 다시 그린다. 열려 있는 팝업은 닫지 않는다
export function showFolders(tree) {
  latestTree = tree ?? null;

  const slot = document.getElementById(SLOT_ID);
  if (slot) {
    // 비우면 포커스가 body로 빠지므로, 포커스가 이 칸 안에 있었으면 어느 타일이었는지 읽어 둔다
    const active = document.activeElement;
    let focusSelector = null;
    if (active && slot.contains(active)) {
      if (active.dataset.folderId) focusSelector = `[data-folder-id="${CSS.escape(active.dataset.folderId)}"]`;
      else if (active.dataset.action) focusSelector = `[data-action="${CSS.escape(active.dataset.action)}"]`;
    }

    slot.replaceChildren();
    for (const folder of topFolders(tree)) {
      slot.appendChild(folderTile(folder, bookmarksIn(tree, folder.id)));
    }
    // 북마크바를 찾지 못하면 만들 곳이 없으므로 [새 폴더] 칸을 그리지 않는다
    if (tree?.roots?.bar) slot.appendChild(newFolderTile());

    if (focusSelector) slot.querySelector(focusSelector)?.focus({ preventScroll: true });
  }

  // 팝업(#dialog-folder)이 열려 있으면 닫지 않고 내용만 다시 그린다
  // 만들기 중이면 만들기 패널을 다시 그린다 (입력하던 글자는 popup.draft에 남아 있다)
  // 폴더를 보는 중이면 새 tree에서 같은 폴더를 다시 찾는다. 그 폴더가 사라졌으면 팝업을 이전 내용 그대로 둔다
  const dialog = document.getElementById(POPUP_ID);
  if (dialog?.open) redrawPopup(dialog);
}

// 지금 팝업 상태(popup.mode, openFolderId)로 가장 최근 tree에서 다시 그린다
// 보던 폴더가 tree에 없으면(지워지는 중 등) 이전 내용 그대로 둔다
function redrawPopup(dialog) {
  if (popup.mode === "create") {
    drawPopup(dialog, null);
    return;
  }
  if (openFolderId === null) return;
  const info = findFolder(latestTree, openFolderId);
  if (info) drawPopup(dialog, info);
}

// 팝업에 보일 폴더를 찾는다: { id, title, items, folder, subfolders, subfolderItems, parentFolder }. 없는 폴더면 null
// 줄에 없는 하위 폴더나 최상위 폴더(북마크바 등)의 ID로도 찾는다 (잊고 있던 북마크의 [어디 있는지 보기])
// 북마크 없이 하위 폴더만 있는 폴더도 tree.folders에 있으므로 찾는다
// folder: tree.folders의 항목. 최상위 폴더면 null
// subfolderItems: 하위 폴더 ID → 그 폴더 바로 아래 북마크 (하위 폴더 타일의 미리보기·개수에 쓴다)
// parentFolder: 부모가 앱 폴더면 { id, title }. 부모가 최상위 폴더면 null (최상위 폴더는 앱 폴더가 아님, F03-02)
function findFolder(tree, folderId) {
  if (!tree) return null;
  const id = String(folderId);
  const items = bookmarksIn(tree, id);

  const folders = Array.isArray(tree.folders) ? tree.folders : [];
  const roots = Object.values(tree.roots ?? {}).filter(Boolean);
  const folder = folders.find((item) => item.id === id) ?? null;
  const found = folder ?? roots.find((root) => root.id === id);

  // 이름: 폴더 → 최상위 폴더 → 바로 아래 북마크의 folderTitle. 어디에도 없으면 없는 폴더다
  let title;
  if (found) title = found.title || "이름 없는 폴더";
  else if (items.length > 0) title = items[0].folderTitle || "이름 없는 폴더";
  else return null;

  const subfolders = foldersIn(tree, id);
  const subfolderItems = new Map(subfolders.map((sub) => [sub.id, bookmarksIn(tree, sub.id)]));

  let parentFolder = null;
  const parent = folder ? folders.find((item) => item.id === folder.parentId) : null;
  if (parent) parentFolder = { id: parent.id, title: parent.title || "이름 없는 폴더" };

  return { id, title, items, folder, subfolders, subfolderItems, parentFolder };
}

// 주소의 도메인 (www.는 뺀다). 해석하지 못하면 주소 그대로
function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || url;
  } catch {
    return url;
  }
}

// 북마크를 연다. javascript: 주소면 안내만 띄우고, 오류가 나도 화면은 멈추지 않는다 (F02-02, F02-05, N06)
function openApp(bookmark, newTab) {
  openBookmark(bookmark, { newTab })
    .then((result) => {
      if (result === false) showToast("이 북마크는 새 탭에서 실행할 수 없어요");
    })
    .catch((error) => {
      console.warn("북마크를 열지 못했어요", error);
    });
}

// 팝업의 앱 타일 하나: render.js의 모든 북마크 타일과 같은 모양
// dialog: 이 타일이 들어 있는 팝업. 우클릭 메뉴를 그 안에 붙인다 (F15-09)
function appTile(dialog, bookmark) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "bookmark";
  button.dataset.focusKey = `bookmark:${bookmark.id}`;

  // 제목·주소는 textContent로만 넣는다 (innerHTML 금지)
  const name = document.createElement("span");
  name.className = "bookmark__name";
  name.textContent = bookmark.title || bookmark.url || "";

  const url = document.createElement("span");
  url.className = "bookmark__url";
  url.textContent = domainOf(bookmark.url || "");

  button.append(appIcon(bookmark, POPUP_ICON_SIZE), name, url);

  // Ctrl(맥은 Cmd)을 누른 채 누르면 새 탭, 아니면 현재 탭
  button.addEventListener("click", (event) => {
    openApp(bookmark, event.ctrlKey || event.metaKey);
  });
  // 가운데 클릭은 새 탭
  button.addEventListener("auxclick", (event) => {
    if (event.button === 1) openApp(bookmark, true);
  });
  button.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    showContextMenu(bookmark, { x: event.clientX, y: event.clientY, container: dialog });
  });
  return button;
}

// 팝업 내용을 새로 그린다. mode가 "create"면 만들기 패널(info는 쓰지 않음), 아니면 폴더 패널
// 패널만 바꾼다. F15의 우클릭 메뉴는 이 <dialog> 안 패널 옆에 붙으므로 다시 그려도 지워지지 않는다
function drawPopup(dialog, info) {
  const creating = popup.mode === "create";
  const sameFolder = !creating && info.id === openFolderId;
  if (!creating) openFolderId = info.id;

  const oldPanel = dialog.querySelector(":scope > .dialog__panel");
  // 옛 패널을 떼면 그 안의 포커스가 body로 빠진다. 바꾸기 전에 포커스가 패널 안이었는지와 그 요소의 키를 읽어 둔다
  const active = document.activeElement;
  const hadFocus = Boolean(oldPanel && active && oldPanel.contains(active));
  const oldKey = hadFocus ? (active.closest("[data-focus-key]")?.dataset.focusKey ?? null) : null;

  const panel = creating ? createPanel(dialog) : folderPanel(dialog, info);
  if (oldPanel) {
    // 떼어 낸 요소의 scrollTop은 0이 되므로 바꾸기 전에 읽는다
    const scrollTop = oldPanel.scrollTop;
    oldPanel.replaceWith(panel);
    // 같은 폴더를 다시 그리면 보던 자리를 유지한다. 다른 폴더면 맨 위
    if (sameFolder) panel.scrollTop = scrollTop;
  } else {
    dialog.appendChild(panel);
  }
  restorePanelFocus(panel, hadFocus, oldKey);
}

// 새 패널에서 포커스를 되살린다
// 이름 입력 칸이 있으면(만들기·이름 바꾸기) 입력 칸이 먼저. 그다음 popup.focusKey, 없으면 옛 패널에서 읽어 둔 키
// 그 요소가 없거나 누를 수 없으면(옮겨서 타일이 빠짐, 바꾸는 중이라 꺼짐 등) 닫기 버튼
// 포커스가 패널 밖(우클릭 메뉴, body 등)에 있었고 focusKey도 없으면 건드리지 않는다 (메뉴의 포커스를 뺏지 않게)
function restorePanelFocus(panel, hadFocus, oldKey) {
  const wanted = popup.focusKey ?? oldKey;
  popup.focusKey = null;
  if (popup.mode === "create" || popup.mode === "rename") {
    focusNameInput(panel);
    if (panel.contains(document.activeElement)) return;
  }
  if (!wanted && !hadFocus) return;
  const target = wanted ? panel.querySelector(`[data-focus-key="${CSS.escape(wanted)}"]`) : null;
  const next = target && !target.disabled ? target : panel.querySelector('[data-focus-key="close"]');
  next?.focus({ preventScroll: true });
}

// 입력 칸에 커서를 두고 글자 끝으로 옮긴다 (다시 그려져도 이어서 칠 수 있게)
// 닫힌 <dialog> 안에서는 focus가 되지 않으므로 showModal 뒤에도 한 번 더 부른다
function focusNameInput(container) {
  const input = container.querySelector("input");
  if (!input || input.disabled) return;
  input.focus();
  const end = input.value.length;
  input.setSelectionRange(end, end);
}

// 폴더 만들기 팝업을 연다 (F03-04). 폴더 팝업과 같은 #dialog-folder를 쓴다 (팝업은 하나)
function openCreatePopup() {
  const host = document.getElementById(DIALOG_HOST_ID);
  if (!host) return;

  const dialog = getPopup(host);
  // 만들기로 바뀌면 열려 있던 우클릭 메뉴를 닫는다
  closeMenu();
  openFolderId = null;
  resetPopup();
  popup.mode = "create";
  drawPopup(dialog, null);
  if (!dialog.open) dialog.showModal();
  focusNameInput(dialog);
}

// 만들기 패널: 머리말 + 이름 입력 칸 + 안내 줄 + [만들기] [취소]
function createPanel(dialog) {
  const panel = document.createElement("div");
  panel.className = "dialog__panel";

  const body = document.createElement("div");
  body.className = "dialog__body";
  const form = document.createElement("form");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitCreate(dialog);
  });

  const message = messageLine();
  if (message) form.append(nameInput(), message);
  else form.append(nameInput());
  form.appendChild(actionRow("만들기", () => dialog.close()));
  body.appendChild(form);

  panel.append(dialogHeader(dialog, "새 폴더 만들기", "북마크바 맨 뒤에 새 폴더를 만들어요."), body);
  return panel;
}

// 폴더 이름 입력 칸. 친 글자는 popup.draft에 둔다 (다시 그리지는 않는다)
// newtab.css에 입력 칸 클래스가 없어 공통 값만 인라인으로 둔다 (팀원 D에게 클래스 부탁)
function nameInput(label = "폴더 이름") {
  const input = document.createElement("input");
  input.type = "text";
  input.setAttribute("aria-label", label);
  input.placeholder = "폴더 이름";
  input.value = popup.draft;
  input.disabled = popup.busy;
  input.style.width = "100%";
  input.style.boxSizing = "border-box";
  input.style.border = "0";
  input.style.borderRadius = "var(--radius-md)";
  input.style.padding = "var(--space-3) var(--space-4)";
  input.style.background = "var(--color-bg)";
  input.style.font = "inherit";
  input.style.fontSize = "var(--font-base)";
  input.style.color = "var(--color-text)";
  input.addEventListener("input", () => {
    popup.draft = input.value;
  });
  return input;
}

// 팝업 안 안내 줄. popup.message가 없으면 null
function messageLine() {
  if (!popup.message) return null;
  const line = document.createElement("p");
  line.className = "dialog__subtitle";
  line.setAttribute("role", "status");
  line.textContent = popup.message.text;
  // newtab.css에 붉은 글자 값이 없어 안내 글자색을 씀. 팀원 D에게 --color-danger 부탁
  if (popup.message.error) line.style.color = "var(--color-amber-text)";
  return line;
}

// 버튼 줄: [확인] [취소]. 바꾸는 중(busy)이면 누를 수 없다
// onSubmit이 없으면 확인은 form의 submit 버튼, 있으면 누를 때 onSubmit을 부르는 버튼
function actionRow(submitLabel, onCancel, onSubmit) {
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "var(--space-2)";
  row.style.justifyContent = "flex-end";
  row.style.marginTop = "var(--space-4)";

  const submit = document.createElement("button");
  submit.type = onSubmit ? "button" : "submit";
  submit.className = "btn btn--primary";
  submit.dataset.focusKey = "submit";
  submit.textContent = submitLabel;
  submit.disabled = popup.busy;
  if (onSubmit) submit.addEventListener("click", onSubmit);

  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "btn btn--ghost";
  cancel.dataset.focusKey = "cancel";
  cancel.textContent = "취소";
  cancel.disabled = popup.busy;
  cancel.addEventListener("click", onCancel);

  row.append(submit, cancel);
  return row;
}

// 만들기를 확인했을 때: 북마크바 맨 뒤에 폴더를 만든다 (F03-04, F03-07)
async function submitCreate(dialog) {
  if (popup.busy) return;
  // 그사이 사용자가 닫았거나 다른 팝업으로 바꿨으면 다시 그리지 않는다
  const stillCreating = () => dialog.isConnected && dialog.open && popup.mode === "create";

  const name = popup.draft.trim();
  if (!name) {
    // 빈 이름·공백뿐이면 createFolder를 부르지 않는다 (F03-07)
    popup.message = { text: "폴더 이름을 입력해 주세요", error: true };
    drawPopup(dialog, null);
    return;
  }

  const bar = latestTree?.roots?.bar;
  if (!bar) {
    popup.message = { text: "폴더를 만들지 못했어요", error: true };
    drawPopup(dialog, null);
    return;
  }

  // createFolder(N02)는 같은 이름이면 새로 만들지 않고 그 폴더를 돌려줘서, 막지 않으면 아무 일도 안 일어난 것처럼 보임
  const folders = Array.isArray(latestTree.folders) ? latestTree.folders : [];
  if (folders.some((folder) => folder.parentId === bar.id && folder.title === name)) {
    popup.message = { text: "북마크바에 같은 이름의 폴더가 이미 있어요", error: true };
    drawPopup(dialog, null);
    return;
  }

  const job = startJob();
  popup.message = null;
  drawPopup(dialog, null);
  try {
    await createFolder(name, bar.id);
  } catch (error) {
    console.warn("폴더를 만들지 못했어요", error);
    if (!finishJob(job) || !stillCreating()) {
      notifyAfterClose("폴더를 만들지 못했어요", true);
      return;
    }
    popup.message = { text: "폴더를 만들지 못했어요", error: true };
    drawPopup(dialog, null);
    return;
  }

  // 팝업을 먼저 닫아야 #toast가 어두운 배경 뒤에 깔리지 않는다
  // 새 폴더는 render.js가 크롬 알림을 받아 showFolders를 다시 부르면 줄 끝에 생긴다. 다시 그리라고 부르지 않는다
  if (finishJob(job) && stillCreating()) dialog.close();
  notifyAfterClose(`'${name}' 폴더를 만들었어요`);
}

// 팝업 패널 하나: 머리말 + 본문
function folderPanel(dialog, info) {
  const panel = document.createElement("div");
  panel.className = "dialog__panel";
  if (info.parentFolder) panel.appendChild(popupBreadcrumb(info.parentFolder));
  panel.append(popupHeader(dialog, info), popupBody(dialog, info));
  return panel;
}

// 돌아가기: 상위 앱 폴더로 같은 팝업 안에서 돌아간다 (F03-08)
// 내 폴더 줄의 폴더(부모가 최상위 폴더)와 북마크바·기타 북마크 팝업에는 두지 않는다
function popupBreadcrumb(parentFolder) {
  const breadcrumb = document.createElement("div");
  breadcrumb.className = "folder-breadcrumb is-visible";

  const back = document.createElement("button");
  back.type = "button";
  back.className = "back btn btn--ghost";
  back.dataset.focusKey = "back";
  back.setAttribute("aria-label", "상위 폴더로 돌아가기");
  // ui.js에 왼쪽 화살표가 없어 오른쪽 화살표(chevron)를 뒤집어 쓴다
  const arrow = icon("chevron", 16);
  arrow.style.transform = "rotate(180deg)";
  const name = document.createElement("span");
  name.textContent = parentFolder.title;
  back.append(arrow, name);
  back.disabled = popup.busy;
  back.addEventListener("click", () => openFolderPopup(parentFolder.id));

  breadcrumb.appendChild(back);
  return breadcrumb;
}

// 머리말: 폴더 이름 · 개수 · 닫기 버튼
function popupHeader(dialog, info) {
  const subtitle =
    info.subfolders.length > 0
      ? `폴더 ${info.subfolders.length}개와 북마크 ${info.items.length}개가 이 폴더에 저장되어 있어요.`
      : `${info.items.length}개의 북마크가 이 폴더에 저장되어 있어요.`;
  return dialogHeader(dialog, info.title, subtitle, editArea(dialog, info));
}

// 편집할 수 있는 폴더: 앱 폴더(북마크바·기타 북마크·모바일 북마크 자체는 아님)이고 관리자가 정한 폴더가 아님
// 관리자가 정한 폴더는 크롬이 못 바꾸게 하고 N04·N05가 오류를 낸다
function canEdit(info) {
  return Boolean(info.folder) && info.folder.rootType !== "managed";
}

// 머리말 부제목 아래의 편집 자리. popup.mode에 따라 버튼 줄 · 이름 입력 · 삭제 확인을 그린다
function editArea(dialog, info) {
  if (popup.mode === "rename" && canEdit(info)) return [renameForm(dialog, info)];
  if (popup.mode === "delete" && canEdit(info)) return deleteConfirm(dialog, info);

  const nodes = [];
  if (canEdit(info)) nodes.push(editButtons(dialog));
  // 안내 줄 (예: 하위 폴더를 지운 뒤 결과 안내). 다른 폴더로 가거나 닫으면 resetPopup으로 지워진다
  const message = messageLine();
  if (message) nodes.push(message);
  return nodes;
}

// 보기 모드의 버튼 줄: [이름 바꾸기] [폴더 삭제]
function editButtons(dialog) {
  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "var(--space-2)";
  row.style.marginTop = "var(--space-3)";

  const rename = document.createElement("button");
  rename.type = "button";
  rename.className = "btn btn--ghost";
  rename.dataset.focusKey = "rename";
  rename.textContent = "이름 바꾸기";
  rename.disabled = popup.busy;
  rename.addEventListener("click", () => {
    const info = findFolder(latestTree, openFolderId);
    popup.mode = "rename";
    popup.draft = info?.folder?.title ?? "";
    popup.message = null;
    redrawPopup(dialog);
  });

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "btn btn--ghost";
  remove.dataset.focusKey = "delete";
  remove.textContent = "폴더 삭제";
  remove.disabled = popup.busy;
  remove.addEventListener("click", () => {
    popup.mode = "delete";
    popup.message = null;
    redrawPopup(dialog);
  });

  row.append(rename, remove);
  return row;
}

// 편집을 끝내고 보기 모드로 돌아간다. focusKey: 돌아간 뒤 포커스할 버튼 ("rename" | "delete")
function backToView(dialog, focusKey = null) {
  popup.focusKey = focusKey;
  popup.mode = "view";
  popup.message = null;
  redrawPopup(dialog);
}

// 이름 바꾸기 모드: 입력 칸 + 안내 줄 + [저장] [취소] (F03-05, F03-07)
function renameForm(dialog, info) {
  const form = document.createElement("form");
  form.style.marginTop = "var(--space-3)";
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitRename(dialog, info);
  });
  form.appendChild(nameInput("새 폴더 이름"));
  const message = messageLine();
  if (message) form.appendChild(message);
  form.appendChild(actionRow("저장", () => backToView(dialog, "rename")));
  return form;
}

// 상위 폴더 이름 (북마크바 같은 최상위 폴더도 찾아진다). 못 찾으면 "상위 폴더"
function parentTitleOf(info) {
  return findFolder(latestTree, info.folder.parentId)?.title ?? "상위 폴더";
}

// 삭제 확인 모드: 문구 + [지우기] [취소] (F03-06)
// 확인을 한 번 묻는다. 북마크 삭제(F15)는 6초 되돌리기가 있지만 폴더 삭제(N05)는 되돌리는 함수가 없다
function deleteConfirm(dialog, info) {
  const what =
    info.subfolders.length > 0
      ? `북마크 ${info.items.length}개와 폴더 ${info.subfolders.length}개는`
      : `북마크 ${info.items.length}개는`;
  const text = document.createElement("p");
  text.className = "dialog__subtitle";
  text.textContent = `'${info.title}' 폴더를 지울까요? 안의 ${what} '${parentTitleOf(info)}'에 옮겨지고, 북마크는 지워지지 않아요.`;
  return [text, actionRow("지우기", () => backToView(dialog, "delete"), () => submitDelete(dialog, info))];
}

// await 뒤: 팝업이 아직 열려 있고 같은 폴더를 보고 있는가
function stillOn(dialog, info) {
  return dialog.isConnected && dialog.open && openFolderId === info.id;
}

// 이름 바꾸기를 확인했을 때 (F03-05, F03-07). 다른 폴더와 이름이 같아도 막지 않는다 (크롬도 허용)
async function submitRename(dialog, info) {
  if (popup.busy) return;
  const name = popup.draft.trim();
  if (!name) {
    // 빈 이름·공백뿐이면 renameFolder를 부르지 않는다 (F03-07)
    popup.message = { text: "폴더 이름을 입력해 주세요", error: true };
    redrawPopup(dialog);
    return;
  }
  if (name === info.folder.title) {
    backToView(dialog, "rename");
    return;
  }

  const job = startJob();
  popup.message = null;
  redrawPopup(dialog);
  try {
    await renameFolder(info.id, name);
  } catch (error) {
    console.warn("이름을 바꾸지 못했어요", error);
    if (!finishJob(job) || !stillOn(dialog, info)) {
      notifyAfterClose("이름을 바꾸지 못했어요", true);
      return;
    }
    popup.message = { text: "이름을 바꾸지 못했어요", error: true };
    redrawPopup(dialog);
    return;
  }

  // 팝업이 닫혔으면 알리지 않는다. 바뀐 이름은 내 폴더 줄에 들어온다
  if (!finishJob(job) || !stillOn(dialog, info)) return;
  // 바뀐 이름은 render.js가 크롬 알림(onChanged)을 받아 showFolders를 다시 부르면 줄과 팝업 제목에 함께 들어온다
  backToView(dialog, "rename");
}

// 삭제를 확인했을 때: 안의 북마크를 상위 폴더로 꺼낸 뒤 폴더만 지운다 (F03-06)
async function submitDelete(dialog, info) {
  if (popup.busy) return;
  const title = info.title;
  const parentId = info.folder.parentId;
  const parentTitle = parentTitleOf(info);
  // 하위 폴더를 지우면 같은 팝업에서 상위 폴더로 간다
  const backToParent = info.parentFolder !== null;

  const job = startJob();
  popup.message = null;
  redrawPopup(dialog);
  let moved;
  try {
    moved = await deleteFolderKeepChildren(info.id);
  } catch (error) {
    console.warn("폴더를 지우지 못했어요", error);
    if (!finishJob(job) || !stillOn(dialog, info)) {
      notifyAfterClose("폴더를 지우지 못했어요. 일부 북마크는 이미 상위 폴더로 옮겨졌을 수 있어요", true);
      return;
    }
    // N05는 중간에 실패하면 일부만 꺼낸 채 오류를 던진다
    popup.mode = "view";
    popup.message = { text: "폴더를 지우지 못했어요. 일부 북마크는 이미 상위 폴더로 옮겨졌을 수 있어요", error: true };
    redrawPopup(dialog);
    return;
  }

  const doneText = `'${title}' 폴더를 지우고 북마크 ${moved}개를 '${parentTitle}'에 꺼냈어요`;
  if (!finishJob(job) || !stillOn(dialog, info)) {
    // 그사이 사용자가 팝업을 닫았으면 지금 팝업은 건드리지 않고 결과만 알린다
    notifyAfterClose(doneText);
    return;
  }

  // 지운 폴더 타일은 render.js가 크롬 알림을 받아 showFolders를 다시 부르면 사라진다
  const parentInfo = backToParent ? findFolder(latestTree, parentId) : null;
  if (parentInfo) {
    resetPopup();
    popup.message = { text: `'${title}' 폴더를 지우고 북마크 ${moved}개를 꺼냈어요`, error: false };
    drawPopup(dialog, parentInfo);
    return;
  }

  // 팝업이 열려 있으면 #toast가 어두운 배경 뒤에 깔린다. F15-09와 같은 문제
  dialog.close();
  showToast(doneText);
}

// 팝업 머리말 공통: 폴더 아이콘 + 제목 · 부제목 · 닫기 버튼 (폴더 팝업과 만들기 팝업이 같이 쓴다)
// extras: 부제목 아래에 붙일 요소들 (폴더 팝업의 편집 자리)
// 제목은 textContent로만 넣는다 (innerHTML 금지)
function dialogHeader(dialog, titleText, subtitleText, extras = []) {
  const header = document.createElement("div");
  header.className = "dialog__header";
  const headText = document.createElement("div");
  const title = document.createElement("div");
  title.className = "dialog__title";
  const titleSpan = document.createElement("span");
  titleSpan.id = POPUP_TITLE_ID;
  titleSpan.textContent = titleText;
  title.append(icon("folder", 20), titleSpan);
  const subtitle = document.createElement("div");
  subtitle.className = "dialog__subtitle";
  subtitle.textContent = subtitleText;
  headText.append(title, subtitle, ...extras);

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "btn btn--icon";
  closeButton.dataset.focusKey = "close";
  closeButton.setAttribute("aria-label", "창 닫기");
  closeButton.appendChild(icon("close", 20));
  closeButton.addEventListener("click", () => dialog.close());
  header.append(headText, closeButton);
  return header;
}

// 팝업 안의 격자 하나 (한 줄 4개)
// newtab.css에 팝업 격자 모양이 없어 공통 값만 써서 인라인으로 둔다 (팀원 D에게 클래스 부탁)
function gridOf(tiles) {
  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(4, minmax(0, 1fr))";
  grid.style.gap = "var(--space-3)";
  grid.append(...tiles);
  return grid;
}

// 본문: 하위 폴더 격자 + 앱 타일 격자
function popupBody(dialog, info) {
  const body = document.createElement("div");
  body.className = "dialog__body";

  // 하위 폴더를 먼저 둔다. 폴더 타일이 앱 타일보다 커서 섞으면 줄 높이가 들쭉날쭉하다
  // 하위 폴더 타일은 내 폴더 줄과 같은 .folder 모양이다 (.bookmark를 쓰지 않는다). 누르면 같은 팝업에서 그 폴더로 들어간다
  if (info.subfolders.length > 0) {
    const folderTiles = info.subfolders.map((sub) => {
      const tile = folderTile(sub, info.subfolderItems.get(sub.id) ?? []);
      tile.dataset.focusKey = `folder:${sub.id}`;
      // 바꾸는 중에는 다른 폴더로 가지 않는다
      tile.disabled = popup.busy;
      return tile;
    });
    body.appendChild(gridOf(folderTiles));
  }

  const grid = gridOf(info.items.map((bookmark) => appTile(dialog, bookmark)));
  if (info.subfolders.length > 0) grid.style.marginTop = "var(--space-6)";
  body.appendChild(grid);
  return body;
}

// #dialog-folder를 하나만 두고 다시 쓴다. 처음 만들 때만 이벤트를 단다
function getPopup(host) {
  let dialog = document.getElementById(POPUP_ID);
  if (dialog) return dialog;

  dialog = document.createElement("dialog");
  dialog.id = POPUP_ID;
  dialog.className = "dialog";
  // 화면 낭독기가 팝업 이름으로 폴더 이름을 읽게 한다
  dialog.setAttribute("aria-labelledby", POPUP_TITLE_ID);
  // 바깥(어두운 곳)을 누르면 닫는다 (F12-04). Esc는 <dialog>의 기본 동작
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  // Esc: 이름 바꾸기·삭제 확인 중이면 팝업은 닫지 않고 편집만 끝낸다. 바꾸는 중(busy)이면 그대로 둔다
  // 보기·만들기 중이면 지금처럼 닫힌다
  dialog.addEventListener("cancel", (event) => {
    if (popup.mode !== "rename" && popup.mode !== "delete") return;
    event.preventDefault();
    if (popup.busy) return;
    // 이름 바꾸기에서 나오면 [이름 바꾸기], 삭제 확인에서 나오면 [폴더 삭제]에 포커스 (mode와 키 이름이 같다)
    backToView(dialog, popup.mode);
  });
  dialog.addEventListener("close", () => {
    // close 이벤트는 close() 뒤에 늦게 온다. 그사이 다른 폴더로 다시 열었으면 지우지 않는다
    if (dialog.open) return;
    closeMenu();
    openFolderId = null;
    resetPopup();
    dialog.remove();
  });
  host.appendChild(dialog);
  return dialog;
}

// N41: 폴더 팝업(폴더 안의 폴더 포함), 폴더 만들기 · 이름 바꾸기 · 삭제
// 동기 함수다. 부른 직후 #dialogs 안에 열린 <dialog>가 있다. 이미 열려 있으면 내용만 바꾼다
export function openFolderPopup(folderId) {
  const host = document.getElementById(DIALOG_HOST_ID);
  if (!host) return;

  const info = findFolder(latestTree, folderId);
  if (!info) {
    console.warn("폴더를 찾지 못했어요", folderId);
    return;
  }

  const dialog = getPopup(host);
  // 다른 폴더로 가면 열려 있던 우클릭 메뉴를 닫는다
  closeMenu();
  // 사용자가 폴더를 새로 여는 것이므로 이전 상태(입력 중인 글자 등)를 지운다
  resetPopup();
  drawPopup(dialog, info);
  if (!dialog.open) dialog.showModal();
}

// N41: 우클릭 메뉴 (F15). 앱을 우클릭하면 브라우저 기본 메뉴 대신 연다
// x, y: 우클릭 위치(clientX·clientY). 없으면 화면 가운데 · container: 메뉴를 붙일 요소. 없으면 document.body
// 동기 함수다. 부른 직후 메뉴가 화면에 있다. 이미 열려 있으면 이전 메뉴를 닫고 새로 연다
export function showContextMenu(bookmark, { x, y, container } = {}) {
  if (!bookmark?.id || !bookmark.url) return;
  closeMenu();

  // 팝업은 showModal()이라 팝업 밖에 붙이면 어두운 배경 뒤에 깔린다 (F15-09). 붙일 곳은 부르는 쪽이 container로 넘긴다
  const host = container?.isConnected ? container : document.body;

  // newtab.css에 메뉴 모양이 없어 공통 값만 인라인 (팀원 D에게 .context-menu 클래스 부탁)
  const el = document.createElement("div");
  el.className = "context-menu";
  el.setAttribute("role", "menu");
  el.setAttribute("aria-label", "북마크 메뉴");
  el.style.position = "fixed";
  el.style.zIndex = "60";
  el.style.minWidth = "calc(var(--space-10) * 5)";
  el.style.padding = "var(--space-2)";
  el.style.background = "var(--color-surface-strong)";
  el.style.borderRadius = "var(--radius-lg)";
  el.style.boxShadow = "var(--shadow-lg)";
  el.style.display = "flex";
  el.style.flexDirection = "column";
  el.style.gap = "var(--space-1)";
  // 메뉴 위에서의 우클릭은 브라우저 기본 메뉴를 띄우지 않는다
  el.addEventListener("contextmenu", (event) => event.preventDefault());

  menu = {
    el,
    bookmark,
    container: host,
    page: "main",
    x,
    y,
    busy: false,
    returnFocus: document.activeElement,
    returnKey: popupTileKey(document.activeElement),
    cleanup: null,
    pinned: null,
  };
  buildMainPage();
  host.appendChild(el);
  placeMenu();
  menu.cleanup = listenWhileOpen(host);
  focusMenuItem(0);
  // 이 함수는 동기라서 메뉴를 먼저 그리고, 고정 상태는 읽은 뒤에 채운다
  loadPinned(menu);
}

// 메뉴를 닫는다. restoreFocus면 열 때 포커스가 있던 곳으로 돌려준다 (아직 문서에 붙어 있을 때만)
function closeMenu({ restoreFocus = false } = {}) {
  if (!menu) return;
  const closing = menu;
  menu = null;
  closing.cleanup?.();
  closing.el.remove();
  if (!restoreFocus) return;
  if (closing.returnFocus?.isConnected) {
    closing.returnFocus.focus({ preventScroll: true });
    return;
  }
  // 그사이 팝업이 다시 그려져 타일이 바뀌었으면 같은 키의 새 타일, 없으면 그 팝업의 닫기 버튼
  // 다른 파일의 칸(모든 북마크 영역 등)의 요소였으면 건드리지 않는다
  if (!closing.returnKey) return;
  const dialog = document.getElementById(POPUP_ID);
  if (!dialog?.open) return;
  const tile = dialog.querySelector(`[data-focus-key="${CSS.escape(closing.returnKey)}"]`);
  const next = tile ?? dialog.querySelector('[data-focus-key="close"]');
  next?.focus({ preventScroll: true });
}

// 요소가 우리 폴더 팝업(#dialog-folder) 안의 앱 타일이면 그 data-focus-key, 아니면 null
function popupTileKey(element) {
  if (!(element instanceof HTMLElement)) return null;
  if (!element.closest(`#${POPUP_ID}`)) return null;
  const key = element.dataset.focusKey;
  return key?.startsWith("bookmark:") ? key : null;
}

// 메뉴가 열려 있는 동안 문서에 다는 이벤트. 뗄 함수를 돌려준다
// capture 단계로 달아서 다른 처리(팝업의 바깥 클릭·Esc 등)보다 먼저 받는다
function listenWhileOpen(host) {
  const inMenu = (target) => Boolean(menu) && target instanceof Node && menu.el.contains(target);

  // 바깥 클릭은 메뉴만 닫고 그 클릭은 먹는다. 안 먹으면 팝업 바깥(어두운 곳) 클릭으로 팝업까지 닫히거나 앱이 열린다
  const onClick = (event) => {
    if (inMenu(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    closeMenu();
  };
  // 메뉴 밖 우클릭은 닫기만 한다 (막지 않는다. 다른 앱 우클릭이면 그 앱의 메뉴가 새로 열린다)
  const onContextMenu = (event) => {
    if (!inMenu(event.target)) closeMenu();
  };
  const onKeydown = (event) => {
    if (!menu) return;
    if (event.key === "Escape") {
      // keydown을 막아야 팝업(<dialog>)의 Esc 닫기가 일어나지 않는다. Esc 한 번은 메뉴만, 두 번째 Esc가 팝업을 닫는다
      event.preventDefault();
      event.stopPropagation();
      if (menu.page === "folders") {
        // 폴더 목록 화면에서는 닫지 않고 메인 화면으로 돌아간다
        showMainPage("move");
      } else {
        closeMenu({ restoreFocus: true });
      }
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End") {
      event.preventDefault();
      moveMenuFocus(event.key);
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      closeMenu({ restoreFocus: true });
    }
    // Enter·Space는 버튼 기본 동작에 맡긴다
  };
  // 팝업 패널을 스크롤하면 닫고, 메뉴 안(폴더 목록)의 스크롤로는 닫지 않는다
  const onScroll = (event) => {
    if (!inMenu(event.target)) closeMenu();
  };
  const onWindowChange = () => closeMenu();

  document.addEventListener("click", onClick, true);
  document.addEventListener("contextmenu", onContextMenu, true);
  document.addEventListener("keydown", onKeydown, true);
  document.addEventListener("scroll", onScroll, true);
  window.addEventListener("resize", onWindowChange);
  window.addEventListener("blur", onWindowChange);
  // 메뉴를 붙인 팝업이 닫히면(다른 사람의 팝업이어도) 메뉴도 닫는다
  const dialog = host instanceof HTMLDialogElement ? host : null;
  if (dialog) dialog.addEventListener("close", onWindowChange);

  return () => {
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("contextmenu", onContextMenu, true);
    document.removeEventListener("keydown", onKeydown, true);
    document.removeEventListener("scroll", onScroll, true);
    window.removeEventListener("resize", onWindowChange);
    window.removeEventListener("blur", onWindowChange);
    if (dialog) dialog.removeEventListener("close", onWindowChange);
  };
}

// 메뉴 안의 누를 수 있는 항목들
function menuItems() {
  if (!menu) return [];
  return [...menu.el.querySelectorAll('[role="menuitem"]')].filter((item) => !item.disabled);
}

// index번째 항목에 포커스 (없으면 그대로)
function focusMenuItem(index) {
  const items = menuItems();
  items[index]?.focus({ preventScroll: true });
}

// 화살표·Home·End로 항목 사이를 옮긴다. 끝에서 처음으로 돈다
function moveMenuFocus(key) {
  const items = menuItems();
  if (items.length === 0) return;
  const current = items.indexOf(document.activeElement);
  let next;
  if (key === "Home") next = 0;
  else if (key === "End") next = items.length - 1;
  else if (key === "ArrowDown") next = (current + 1) % items.length;
  else next = current <= 0 ? items.length - 1 : current - 1;
  items[next].focus({ preventScroll: true });
}

// 메뉴를 놓는다. 붙인 뒤 크기를 재서 화면 안에 들어오게 한다. 내용이 바뀌면 처음의 x, y 기준으로 다시 부른다
// position fixed라 팝업(<dialog>) 안에 붙여도 화면 좌표 그대로 쓴다 (.dialog에 transform이 없다)
function placeMenu() {
  if (!menu) return;
  const { el, x, y } = menu;
  const { width, height } = el.getBoundingClientRect();
  let left;
  let top;
  if (Number.isFinite(x) && Number.isFinite(y)) {
    left = x;
    top = y;
    // 오른쪽이 넘치면 왼쪽으로 당기고, 아래가 넘치면 위로 펼친다
    if (left + width > window.innerWidth - MENU_MARGIN) left = window.innerWidth - width - MENU_MARGIN;
    if (top + height > window.innerHeight - MENU_MARGIN) top = y - height;
  } else {
    // 위치를 받지 못하면 화면 가운데
    left = window.innerWidth / 2 - width / 2;
    top = window.innerHeight / 2 - height / 2;
  }
  // 그래도 넘치면 여백 자리로
  el.style.left = `${Math.max(MENU_MARGIN, left)}px`;
  el.style.top = `${Math.max(MENU_MARGIN, top)}px`;
}

// 메뉴 항목 하나. 고르는 중(busy)이면 눌러도 무시한다
function menuItem(label, onSelect) {
  const item = document.createElement("button");
  item.type = "button";
  item.setAttribute("role", "menuitem");
  item.className = "btn btn--ghost context-menu__item";
  item.style.width = "100%";
  item.style.justifyContent = "flex-start";
  item.style.textAlign = "left";
  item.style.fontSize = "var(--font-sm)";
  item.textContent = label;
  item.addEventListener("click", () => {
    if (!menu || menu.busy) return;
    onSelect();
  });
  return item;
}

// 메뉴 맨 아래 안내 줄. 하나만 두고 글자를 바꾼다. 메뉴는 닫지 않는다
// 팝업 안에서는 #toast가 어두운 배경 뒤라 안 보이므로 실패 안내는 메뉴 안에 쓴다
function menuMessage(text) {
  if (!menu) return;
  let line = menu.el.querySelector(":scope > .context-menu__message");
  if (!line) {
    line = document.createElement("p");
    line.className = "context-menu__message";
    line.setAttribute("role", "alert");
    line.style.margin = "0";
    line.style.color = "var(--color-amber-text)";
    line.style.fontSize = "var(--font-sm)";
    line.style.padding = "var(--space-2) var(--space-3)";
    menu.el.appendChild(line);
  }
  line.textContent = text;
  // 안내 줄이 생기면 크기가 달라지므로 다시 놓는다
  placeMenu();
}

// 메인 화면: 메뉴 내용을 비우고 항목을 순서대로 채운다
function buildMainPage() {
  menu.page = "main";
  menu.el.replaceChildren(menuItem("새 탭에서 열기", openInNewTab), pinItem());
  // F15-02 폴더로 이동. 관리자가 정한 북마크(F15-10)이거나 아직 tree가 없으면 그리지 않는다
  if (canChange(menu.bookmark) && latestTree) menu.el.appendChild(moveItem());
  // F15-06 삭제: 팀원 A의 removeBookmark(N48)가 main에 들어오면 여기 맨 아래에 구분선과 함께 붉은 글자로 붙인다 (F15-10이면 숨김)
}

// 메인 화면으로 돌아간다 (고정 상태는 menu.pinned를 그대로 쓴다). focusKey 항목에 포커스, 없으면 첫 항목
function showMainPage(focusKey) {
  buildMainPage();
  placeMenu();
  const target = focusKey ? menu.el.querySelector(`[data-menu-item="${focusKey}"]`) : null;
  if (target && !target.disabled) target.focus({ preventScroll: true });
  else focusMenuItem(0);
}

// 관리자가 정한 북마크는 크롬이 옮기거나 지우지 못하게 한다(move·remove 오류). 명세 v19는 N01의 unmodifiable로 가리지만
// 지금 loadTree는 아직 붙이지 않아서 rootType "managed"로도 가린다. 관리자 북마크는 모두 관리자 폴더 아래에 있다
// 삭제(F15-06)도 나중에 이 함수를 쓴다
function canChange(bookmark) {
  return !bookmark.unmodifiable && bookmark.rootType !== "managed";
}

// 메인 화면의 "폴더로 이동" 항목. 누르면 같은 메뉴 안이 폴더 목록 화면으로 바뀐다
function moveItem() {
  const item = menuItem("폴더로 이동", showFoldersPage);
  item.dataset.menuItem = "move";
  item.setAttribute("aria-haspopup", "menu");
  const arrow = icon("chevron", 16);
  arrow.style.marginLeft = "auto";
  item.appendChild(arrow);
  return item;
}

// 옮겨 넣을 수 있는 폴더: [{ id, title, depth }]. 크롬 북마크 관리자와 같은 순서
// 북마크바 → 기타 북마크 → 모바일 북마크 순으로, 최상위 폴더(depth 0) 다음에 그 아래 폴더를 index 순으로 깊이 우선
// 고르지 않은 쪽(rootChosen false)과 관리자 폴더(managed)는 넣지 않는다. 입력 tree는 고치지 않는다
function destinationsOf(tree) {
  const folders = Array.isArray(tree?.folders) ? tree.folders : [];
  const byParent = new Map();
  for (const folder of folders) {
    if (folder.rootChosen === false || folder.rootType === "managed") continue;
    if (!byParent.has(folder.parentId)) byParent.set(folder.parentId, []);
    byParent.get(folder.parentId).push(folder);
  }

  const result = [];
  const walk = (parentId, depth) => {
    // byParent의 배열은 여기서 만든 새 배열이라 정렬해도 입력이 바뀌지 않는다
    const children = (byParent.get(parentId) ?? []).sort((a, b) => a.index - b.index);
    for (const child of children) {
      result.push({ id: child.id, title: child.title || "이름 없는 폴더", depth });
      walk(child.id, depth + 1);
    }
  };
  const roots = tree?.roots ?? {};
  for (const key of ["bar", "other", "mobile"]) {
    const root = roots[key];
    if (!root) continue;
    result.push({ id: root.id, title: root.title || "이름 없는 폴더", depth: 0 });
    walk(root.id, 1);
  }
  return result;
}

// 북마크가 지금 들어 있는 폴더 ID. 넘겨받은 bookmark가 오래됐을 수 있어 가장 최근 tree에서 먼저 찾는다
function currentParentId(bookmark) {
  const bookmarks = Array.isArray(latestTree?.bookmarks) ? latestTree.bookmarks : [];
  const found = bookmarks.find((item) => item.id === String(bookmark.id));
  return found?.parentId ?? bookmark.parentId;
}

// 폴더 목록 화면으로 바꾸고, 지금 폴더가 아닌 첫 폴더에 포커스
function showFoldersPage() {
  buildFoldersPage();
  placeMenu();
  const first = menu.el.querySelector('[role="group"] [role="menuitem"]:not([aria-current]):not(:disabled)');
  if (first) first.focus({ preventScroll: true });
  else focusMenuItem(0);
}

// 폴더 목록 화면: 맨 위 돌아가기 + 옮길 폴더 목록
function buildFoldersPage() {
  menu.page = "folders";

  const back = menuItem("폴더로 이동", () => showMainPage("move"));
  back.setAttribute("aria-label", "메뉴로 돌아가기");
  // ui.js에 왼쪽 화살표가 없어 오른쪽 화살표(chevron)를 뒤집어 쓴다
  const arrow = icon("chevron", 16);
  arrow.style.transform = "rotate(180deg)";
  back.prepend(arrow);

  const group = document.createElement("div");
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", "옮길 폴더");
  group.style.maxHeight = "50vh";
  group.style.overflow = "auto";
  group.style.display = "flex";
  group.style.flexDirection = "column";
  group.style.gap = "var(--space-1)";

  const parentId = currentParentId(menu.bookmark);
  for (const folder of destinationsOf(latestTree)) {
    // 폴더 이름은 menuItem이 textContent로 넣는다
    const item = menuItem(folder.title, () => moveTo(folder));
    item.style.paddingLeft = `calc(var(--space-3) + var(--space-4) * ${folder.depth})`;
    if (folder.id === parentId) {
      item.setAttribute("aria-current", "true");
      const here = document.createElement("span");
      here.style.color = "var(--color-text-muted)";
      here.textContent = "지금 폴더";
      item.append(icon("check", 14), here);
    }
    group.appendChild(item);
  }

  menu.el.replaceChildren(back, group);
}

// 폴더를 골랐을 때 (F15-02, F15-05)
// manualMoves는 서비스 워커(팀원 B, N33)가 onMoved를 받아 기록한다(F15-02).
// setPending을 부르면 우리 정리의 이동으로 보고 기록하지 않는다
// 옮긴 뒤 다시 그리라고 부르지 않는다. render.js가 크롬 알림을 받아 showFolders를 다시 부르면 타일과 개수가 바뀐다
async function moveTo(folder) {
  const current = menu;
  const ctx = current.container;
  // 지금 폴더를 고르면 옮기지 않는다 (F15-05). 그래서 manualMoves에도 기록되지 않는다
  if (folder.id === currentParentId(current.bookmark)) {
    closeMenu({ restoreFocus: true });
    notify(ctx, "이미 이 폴더에 있어요");
    return;
  }

  current.busy = true;
  let moved;
  try {
    // index를 넘기지 않아 그 폴더 맨 뒤로 옮긴다
    moved = await moveBookmark(current.bookmark.id, folder.id);
  } catch (error) {
    console.warn("옮기지 못했어요", error);
    if (menu !== current) return;
    current.busy = false;
    menuMessage("옮기지 못했어요");
    return;
  }
  // 그사이 메뉴가 닫혔거나 다른 메뉴로 바뀌었으면 아무것도 하지 않는다
  if (menu !== current) return;
  current.busy = false;
  if (!moved) {
    // 그사이 북마크가 지워졌다 (N03은 null을 돌려준다)
    menuMessage("북마크를 찾지 못했어요");
    return;
  }
  closeMenu({ restoreFocus: true });
  notify(ctx, `'${folder.title}' 폴더로 옮겼어요`);
}

// "새 탭에서 열기" (F15-03). 연 시각 기록은 openBookmark(N06)가 한다
async function openInNewTab() {
  const current = menu;
  current.busy = true;
  let result;
  try {
    result = await openBookmark(current.bookmark, { newTab: true });
  } catch (error) {
    console.warn("북마크를 열지 못했어요", error);
    // 그사이 메뉴가 닫혔거나 다른 메뉴로 바뀌었으면 아무것도 하지 않는다
    if (menu !== current) return;
    current.busy = false;
    menuMessage("북마크를 열지 못했어요");
    return;
  }
  if (menu !== current) return;
  current.busy = false;
  if (result === false) {
    menuMessage("이 북마크는 새 탭에서 실행할 수 없어요");
    return;
  }
  closeMenu({ restoreFocus: true });
}

// "고정하기" / "고정 해제" 항목 (F15-04). 고정 상태를 모르는 동안(pinned가 null)은 누를 수 없다
function pinItem() {
  const item = menuItem("고정하기", togglePin);
  item.dataset.menuItem = "pin";
  applyPinState(item);
  return item;
}

// menu.pinned에 맞춰 항목의 글자와 누를 수 있는지를 바꾼다
function applyPinState(item) {
  item.textContent = menu.pinned === true ? "고정 해제" : "고정하기";
  item.disabled = menu.pinned === null;
}

// 저장 항목에서 고정 상태를 읽어 메뉴에 채운다. 오류를 밖으로 던지지 않는다
async function loadPinned(current) {
  let pinned = false;
  try {
    const stored = await load();
    pinned = Array.isArray(stored.pinned) && stored.pinned.includes(String(current.bookmark.id));
  } catch (error) {
    // 읽지 못하면 "고정하기"로 둔다. pin(N11)은 이미 고정돼 있으면 다시 넣지 않으므로 괜찮다
    console.warn("고정 상태를 읽지 못했어요", error);
  }
  // 그사이 메뉴가 닫혔거나 다른 메뉴로 바뀌었으면 아무것도 하지 않는다
  if (menu !== current) return;
  current.pinned = pinned;
  // 폴더 목록 화면이면 메인 화면으로 돌아올 때 이 값으로 그린다
  if (current.page !== "main") return;
  const item = current.el.querySelector('[data-menu-item="pin"]');
  if (item) applyPinState(item);
}

// 고정하기 / 고정 해제를 눌렀을 때 (F15-04, F08-06)
// 독은 render.js가 저장소 변경 알림을 받아 다시 그린다. 다시 그리라고 부르지 않는다
async function togglePin() {
  const current = menu;
  const id = current.bookmark.id;
  const wasPinned = current.pinned === true;
  current.busy = true;
  let added = true;
  try {
    if (wasPinned) await unpin(id);
    else added = await pin(id);
  } catch (error) {
    console.warn("고정하지 못했어요", error);
    if (menu !== current) return;
    current.busy = false;
    menuMessage("고정하지 못했어요");
    return;
  }
  if (menu !== current) return;
  current.busy = false;
  if (!added) {
    // N11은 이미 8개면 넣지 않고 false를 돌려준다. 메뉴는 닫지 않는다
    menuMessage("고정은 8개까지 할 수 있어요");
    return;
  }
  const ctx = current.container;
  closeMenu({ restoreFocus: true });
  notify(ctx, wasPinned ? "고정을 해제했어요" : "독에 고정했어요");
}

// 메뉴를 닫은 뒤의 성공 안내. 메뉴를 붙였던 곳에 맞춰 보여 준다
function notify(container, text) {
  // 우리 폴더 팝업이면 F03의 팝업 안 안내 줄을 쓴다
  if (container instanceof HTMLDialogElement && container.id === POPUP_ID && container.open) {
    popup.message = { text, error: false };
    redrawPopup(container);
    return;
  }
  // 화면 본문(document.body)이면 #toast
  if (!container || container === document.body) {
    showToast(text);
    return;
  }
  // 다른 화면 파일의 팝업 안에 글을 넣지 않는다. 그 팝업 안 안내는 F15-09 되돌리기 줄(삭제 PR)에서 팀원 B와 함께 정한다. 팝업 안에서는 #toast가 배경 뒤에 깔려 보이지 않는다
}
