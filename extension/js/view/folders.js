// 담당: 팀원 C · 이슈 #13 · 명세: N41 (F03, F15)
// 화면 파일끼리는 서로 부르지 않는다 (공통 조각은 ui.js). 크롬은 bookmarks.js를 거친다.

import { createFolder, deleteFolderKeepChildren, openBookmark, renameFolder } from "../bookmarks.js";
import { appIcon, icon, showToast } from "../ui.js";

const SLOT_ID = "folder-list";
const DIALOG_HOST_ID = "dialogs";
const POPUP_ID = "dialog-folder";
const POPUP_TITLE_ID = "dialog-folder-title";
const PREVIEW_COUNT = 4;
const PREVIEW_ICON_SIZE = 40;
const POPUP_ICON_SIZE = 48;

// showFolders가 받은 가장 최근 tree. openFolderPopup(folderId)이 폴더를 찾을 때 쓴다 (render.js는 폴더 ID만 넘긴다)
let latestTree = null;
// 지금 팝업에 보이는 폴더 ID. 닫히면 null
let openFolderId = null;
// 팝업 상태. 다시 그려도(showFolders) 지우지 않고, 폴더를 새로 열거나 팝업을 닫으면 되돌린다
// mode: "view"(보기) | "rename"(이름 바꾸는 중) | "delete"(삭제 확인 중) | "create"(새 폴더 만들기)
// draft: 입력 칸에 친 글자 · message: 팝업 안 안내 줄 { text, error } 또는 null · busy: 크롬 북마크를 바꾸는 중
let popup = { mode: "view", draft: "", message: null, busy: false };

// 팝업 상태를 기본값으로 되돌린다
function resetPopup() {
  popup.mode = "view";
  popup.draft = "";
  popup.message = null;
  popup.busy = false;
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
    slot.replaceChildren();
    for (const folder of topFolders(tree)) {
      slot.appendChild(folderTile(folder, bookmarksIn(tree, folder.id)));
    }
    // 북마크바를 찾지 못하면 만들 곳이 없으므로 [새 폴더] 칸을 그리지 않는다
    if (tree?.roots?.bar) slot.appendChild(newFolderTile());
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
function appTile(bookmark) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "bookmark";

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
    showContextMenu(bookmark);
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
  if (creating || popup.mode === "rename") focusNameInput(panel);
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
  submit.textContent = submitLabel;
  submit.disabled = popup.busy;
  if (onSubmit) submit.addEventListener("click", onSubmit);

  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "btn btn--ghost";
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

  popup.busy = true;
  popup.message = null;
  drawPopup(dialog, null);
  try {
    await createFolder(name, bar.id);
  } catch (error) {
    console.warn("폴더를 만들지 못했어요", error);
    if (!stillCreating()) return;
    popup.busy = false;
    popup.message = { text: "폴더를 만들지 못했어요", error: true };
    drawPopup(dialog, null);
    return;
  }

  // 팝업을 먼저 닫아야 #toast가 어두운 배경 뒤에 깔리지 않는다
  // 새 폴더는 render.js가 크롬 알림을 받아 showFolders를 다시 부르면 줄 끝에 생긴다. 다시 그리라고 부르지 않는다
  if (stillCreating()) dialog.close();
  showToast(`'${name}' 폴더를 만들었어요`);
}

// 팝업 패널 하나: 머리말 + 본문
function folderPanel(dialog, info) {
  const panel = document.createElement("div");
  panel.className = "dialog__panel";
  if (info.parentFolder) panel.appendChild(popupBreadcrumb(info.parentFolder));
  panel.append(popupHeader(dialog, info), popupBody(info));
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

// 편집을 끝내고 보기 모드로 돌아간다
function backToView(dialog) {
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
  form.appendChild(actionRow("저장", () => backToView(dialog)));
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
  return [text, actionRow("지우기", () => backToView(dialog), () => submitDelete(dialog, info))];
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
    backToView(dialog);
    return;
  }

  popup.busy = true;
  popup.message = null;
  redrawPopup(dialog);
  try {
    await renameFolder(info.id, name);
  } catch (error) {
    console.warn("이름을 바꾸지 못했어요", error);
    popup.busy = false;
    if (!stillOn(dialog, info)) return;
    popup.message = { text: "이름을 바꾸지 못했어요", error: true };
    redrawPopup(dialog);
    return;
  }

  popup.busy = false;
  if (!stillOn(dialog, info)) return;
  // 바뀐 이름은 render.js가 크롬 알림(onChanged)을 받아 showFolders를 다시 부르면 줄과 팝업 제목에 함께 들어온다
  backToView(dialog);
}

// 삭제를 확인했을 때: 안의 북마크를 상위 폴더로 꺼낸 뒤 폴더만 지운다 (F03-06)
async function submitDelete(dialog, info) {
  if (popup.busy) return;
  const title = info.title;
  const parentId = info.folder.parentId;
  const parentTitle = parentTitleOf(info);
  // 하위 폴더를 지우면 같은 팝업에서 상위 폴더로 간다
  const backToParent = info.parentFolder !== null;

  popup.busy = true;
  popup.message = null;
  redrawPopup(dialog);
  let moved;
  try {
    moved = await deleteFolderKeepChildren(info.id);
  } catch (error) {
    console.warn("폴더를 지우지 못했어요", error);
    popup.busy = false;
    if (!stillOn(dialog, info)) return;
    // N05는 중간에 실패하면 일부만 꺼낸 채 오류를 던진다
    popup.mode = "view";
    popup.message = { text: "폴더를 지우지 못했어요. 일부 북마크는 이미 상위 폴더로 옮겨졌을 수 있어요", error: true };
    redrawPopup(dialog);
    return;
  }

  popup.busy = false;
  const doneText = `'${title}' 폴더를 지우고 북마크 ${moved}개를 '${parentTitle}'에 꺼냈어요`;
  if (!stillOn(dialog, info)) {
    // 그사이 사용자가 팝업을 닫았으면 결과만 알린다
    if (!dialog.open) showToast(doneText);
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
function popupBody(info) {
  const body = document.createElement("div");
  body.className = "dialog__body";

  // 하위 폴더를 먼저 둔다. 폴더 타일이 앱 타일보다 커서 섞으면 줄 높이가 들쭉날쭉하다
  // 하위 폴더 타일은 내 폴더 줄과 같은 .folder 모양이다 (.bookmark를 쓰지 않는다). 누르면 같은 팝업에서 그 폴더로 들어간다
  if (info.subfolders.length > 0) {
    const folderTiles = info.subfolders.map((sub) => {
      const tile = folderTile(sub, info.subfolderItems.get(sub.id) ?? []);
      // 바꾸는 중에는 다른 폴더로 가지 않는다
      tile.disabled = popup.busy;
      return tile;
    });
    body.appendChild(gridOf(folderTiles));
  }

  const grid = gridOf(info.items.map((bookmark) => appTile(bookmark)));
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
    backToView(dialog);
  });
  dialog.addEventListener("close", () => {
    // close 이벤트는 close() 뒤에 늦게 온다. 그사이 다른 폴더로 다시 열었으면 지우지 않는다
    if (dialog.open) return;
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
  // 사용자가 폴더를 새로 여는 것이므로 이전 상태(입력 중인 글자 등)를 지운다
  resetPopup();
  drawPopup(dialog, info);
  if (!dialog.open) dialog.showModal();
}

// N41: 우클릭 메뉴 (F15는 P2. 다음 PR에서 만든다)
export function showContextMenu(bookmark) {}
