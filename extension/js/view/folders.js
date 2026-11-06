// 담당: 팀원 C · 이슈 #13 · 명세: N41 (F03, F15)
// 화면 파일끼리는 서로 부르지 않는다 (공통 조각은 ui.js). 크롬은 bookmarks.js를 거친다.

import { openBookmark } from "../bookmarks.js";
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
  }

  // 팝업(#dialog-folder)이 열려 있으면 닫지 않고, 새 tree에서 같은 폴더를 다시 찾아 내용만 다시 채운다
  // 그 폴더가 사라졌으면 팝업을 이전 내용 그대로 둔다
  const dialog = document.getElementById(POPUP_ID);
  if (dialog?.open && openFolderId !== null) {
    const info = findFolder(tree, openFolderId);
    if (info) fillPopup(dialog, info);
  }
}

// 팝업에 보일 폴더를 찾는다: { id, title, items }. 없는 폴더면 null
// 줄에 없는 하위 폴더나 최상위 폴더(북마크바 등)의 ID로도 찾는다 (잊고 있던 북마크의 [어디 있는지 보기])
function findFolder(tree, folderId) {
  if (!tree) return null;
  const id = String(folderId);
  const items = bookmarksIn(tree, id);

  const folders = Array.isArray(tree.folders) ? tree.folders : [];
  const roots = Object.values(tree.roots ?? {}).filter(Boolean);
  const found = folders.find((folder) => folder.id === id) ?? roots.find((root) => root.id === id);

  // 이름: 폴더 → 최상위 폴더 → 바로 아래 북마크의 folderTitle. 어디에도 없으면 없는 폴더다
  let title;
  if (found) title = found.title || "이름 없는 폴더";
  else if (items.length > 0) title = items[0].folderTitle || "이름 없는 폴더";
  else return null;

  return { id, title, items };
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

// 팝업 내용을 전부 새로 그린다: 머리말(폴더 이름 · 개수 · 닫기) + 앱 타일 격자
function fillPopup(dialog, info) {
  openFolderId = info.id;
  dialog.replaceChildren();

  const panel = document.createElement("div");
  panel.className = "dialog__panel";

  const header = document.createElement("div");
  header.className = "dialog__header";
  const headText = document.createElement("div");
  const title = document.createElement("div");
  title.className = "dialog__title";
  const titleText = document.createElement("span");
  titleText.id = POPUP_TITLE_ID;
  titleText.textContent = info.title;
  title.append(icon("folder", 20), titleText);
  const subtitle = document.createElement("div");
  subtitle.className = "dialog__subtitle";
  subtitle.textContent = `${info.items.length}개의 북마크가 이 폴더에 저장되어 있어요.`;
  headText.append(title, subtitle);

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "btn btn--icon";
  closeButton.setAttribute("aria-label", "창 닫기");
  closeButton.appendChild(icon("close", 20));
  closeButton.addEventListener("click", () => dialog.close());
  header.append(headText, closeButton);

  const body = document.createElement("div");
  body.className = "dialog__body";
  const grid = document.createElement("div");
  // newtab.css에 팝업 격자 모양이 없어 공통 값만 써서 인라인으로 둔다 (팀원 D에게 클래스 부탁)
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(4, minmax(0, 1fr))";
  grid.style.gap = "var(--space-3)";
  for (const bookmark of info.items) {
    grid.appendChild(appTile(bookmark));
  }
  body.appendChild(grid);

  panel.append(header, body);
  dialog.appendChild(panel);
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
  dialog.addEventListener("close", () => {
    // close 이벤트는 close() 뒤에 늦게 온다. 그사이 다른 폴더로 다시 열었으면 지우지 않는다
    if (dialog.open) return;
    openFolderId = null;
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
  fillPopup(dialog, info);
  if (!dialog.open) dialog.showModal();
}

// N41: 우클릭 메뉴 (F15는 P2. 다음 PR에서 만든다)
export function showContextMenu(bookmark) {}
