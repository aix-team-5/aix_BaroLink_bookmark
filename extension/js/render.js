// 담당: 팀원 D · 이슈 #15 · 명세: N30 (F01~F04, F08, F12) · 크롬 API: C09~C12, C16
// 화면의 시작점. 크롬 북마크 알림과 저장소 알림은 이 파일만 받고, 화면 파일(view/*)의 그리기 함수를 부른다.

// 화면 연결 방식 (docs/file-structure.md 12번, 명세 v13)
// - 각 파일은 newtab.html의 자기 칸 안만 그린다. 이 파일의 칸: #header, #web-search, #all-bookmarks, #dock
// - 화면 파일끼리는 서로 부르지 않는다. 다른 화면 파일의 동작이 필요한 그리기 함수에는 동작 묶음(actions)을 넘긴다.
// - 북마크나 저장 항목이 바뀌면 renderAll을 다시 부른다. 그리기 함수는 자기 칸을 비우고 다시 그린다.

import { loadTree, openBookmark } from "./bookmarks.js";
import { load, markManualMove, cleanupMissing } from "./store.js";
import { getTargets, makePlan } from "./plan.js";
import { pickForgotten } from "./forgotten.js";
import { appIcon, icon, showToast } from "./ui.js";
import { runWebSearch, isUrlLike, searchBookmarks } from "./search.js";
import { showFolders, openFolderPopup, showContextMenu } from "./view/folders.js";
import { showForgotten } from "./view/forgottenFolder.js";
import { showResultNotice, showHistory } from "./view/history.js";
import { showFirstCard, showOrganizeDialog } from "./view/cards.js";

// 분류표는 이 파일이 읽어서 계산 파일(plan 등)에 넘긴다 (화면 파일·계산 파일은 fetch하지 않는다)
let categories = null;

// 가장 최근에 읽은 상태 (알림이 오면 다시 읽어 갱신한다)
let lastTree = null;

// 다시 그리기가 겹쳐서 여러 번 돌지 않도록 모은다
let rerenderScheduled = false;

// 분류표를 한 번 읽어 둔다
async function loadCategories() {
  if (categories) return categories;
  try {
    const response = await fetch(chrome.runtime.getURL("data/categories.json"));
    categories = await response.json();
  } catch (error) {
    console.warn("분류표를 읽지 못했어요", error);
    categories = { categories: [], noCategorySites: [] };
  }
  return categories;
}

// 다른 화면 파일의 동작이 필요할 때 쓰는 묶음. 화면 파일끼리 직접 부르지 않게 한다
const actions = {
  openFolder: (folderId) => openFolderPopup(folderId),
  showResultNotice: (entry) => showResultNotice(entry),
  showContextMenu: (bookmark) => showContextMenu(bookmark),
};

// 뼈대 확인용 문구를 지운다 (화면을 그리기 시작하면 필요 없다)
function removeSkeletonNote() {
  document.getElementById("skeleton-note")?.remove();
}

// N30: 화면의 시작점. 헤더·날짜·웹 검색·모든 북마크·고정됨(독)을 직접 그리고, 각 화면 파일의 그리기 함수를 부른다
export function renderAll(tree, stored) {
  lastTree = tree;
  removeSkeletonNote();

  const bookmarks = tree?.bookmarks ?? [];
  const now = Date.now();

  // 직접 그리는 칸
  renderHeader(stored);
  renderWebSearch();
  renderAllBookmarks(bookmarks, stored);
  renderDock(bookmarks, stored);

  // 화면 파일에 맡기는 칸
  // 내 폴더 줄 (folders.js)
  showFolders(tree);

  // 잊고 있던 북마크 (forgotten.js로 고르고, forgottenFolder.js가 그린다)
  const forgotten = safeCall(() => pickForgotten(bookmarks, stored, now), []);
  showForgotten(forgotten, actions);

  // 첫 정리 카드 (plan.js로 계획을 세우고, cards.js가 그린다). 이미 처리했으면 그리지 않는다
  const firstCardState = stored?.state?.firstCard ?? "pending";
  if (firstCardState === "pending" && categories) {
    const targets = safeCall(() => getTargets(tree, stored, {}, now), []);
    const plan = safeCall(() => makePlan(targets, categories), null);
    if (plan) showFirstCard(plan, actions);
  }
}

// 계산 함수(아직 뼈대일 수 있음)가 던져도 화면 전체가 멈추지 않게 감싼다
function safeCall(fn, fallback) {
  try {
    return fn();
  } catch (error) {
    console.warn("계산 중 오류", error);
    return fallback;
  }
}

// ----- #header -----
function renderHeader(stored) {
  const header = document.getElementById("header");
  if (!header) return;
  header.replaceChildren();

  const brand = document.createElement("div");
  brand.className = "brand";
  const logo = document.createElement("span");
  logo.className = "brand__logo";
  logo.appendChild(icon("bookmark", 24));
  const name = document.createElement("span");
  name.className = "brand__name";
  name.textContent = "바로링크";
  brand.append(logo, name);

  const groupActions = document.createElement("div");
  groupActions.className = "header__actions";

  // 이동 버튼 (좁은 화면에서는 숨긴다)
  const toFolders = makeHeaderButton("내 폴더", "folder", "hide-below-md", () => {
    document.getElementById("my-folders")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  const toAll = makeHeaderButton("모든 북마크", "grid", "hide-below-md", () => {
    document.getElementById("all-bookmarks")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  // [정리하기 · N] — 정리 안 된 새 북마크 수
  const newCount = Array.isArray(stored?.newBookmarks) ? stored.newBookmarks.length : 0;
  const organizeBtn = document.createElement("button");
  organizeBtn.type = "button";
  organizeBtn.className = "btn";
  organizeBtn.appendChild(icon("sparkles", 16));
  const label = document.createElement("span");
  label.className = "hide-below-sm";
  label.textContent = "정리하기";
  organizeBtn.appendChild(label);
  if (newCount > 0) {
    const badge = document.createElement("span");
    badge.className = "badge-count";
    badge.textContent = String(newCount);
    organizeBtn.appendChild(badge);
  }
  organizeBtn.addEventListener("click", () => {
    if (!lastTree || !categories) return;
    const targets = safeCall(() => getTargets(lastTree, currentStored(), {}, Date.now()), []);
    const plan = safeCall(() => makePlan(targets, categories), null);
    if (plan) showOrganizeDialog(plan, actions);
  });

  // 정리 기록 버튼
  const historyBtn = makeHeaderButton("", "history", "btn--icon", () => showHistory());
  historyBtn.setAttribute("aria-label", "정리 기록");

  groupActions.append(toFolders, toAll, organizeBtn, historyBtn);
  header.append(brand, groupActions);
}

function makeHeaderButton(text, iconName, extraClass, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = extraClass === "btn--icon" ? "btn btn--icon" : `btn btn--pill ${extraClass}`.trim();
  if (iconName) button.appendChild(icon(iconName, extraClass === "btn--icon" ? 20 : 16));
  if (text) button.appendChild(document.createTextNode(text));
  if (onClick) button.addEventListener("click", onClick);
  return button;
}

// 마지막으로 읽은 stored를 보관해 둔다 (버튼 핸들러에서 쓴다)
let lastStored = null;
function currentStored() {
  return lastStored ?? {};
}

// ----- #web-search -----
function renderWebSearch() {
  const section = document.getElementById("web-search");
  if (!section) return;
  section.replaceChildren();

  const date = document.createElement("div");
  date.className = "date";
  date.textContent = formatToday();

  const form = document.createElement("form");
  form.className = "search-box";
  form.setAttribute("role", "search");
  form.appendChild(icon("search", 20));
  const input = document.createElement("input");
  input.type = "search";
  input.name = "q";
  input.placeholder = "웹 검색";
  input.setAttribute("aria-label", "웹 검색");
  form.appendChild(input);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (text === "") return;
    runWebSearch(text);
  });

  section.append(date, form);
}

function formatToday() {
  const now = new Date();
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${now.getMonth() + 1}월 ${now.getDate()}일 ${days[now.getDay()]}요일`;
}

// ----- #all-bookmarks -----
function renderAllBookmarks(bookmarks, stored) {
  const section = document.getElementById("all-bookmarks");
  if (!section) return;
  section.replaceChildren();

  const head = document.createElement("div");
  head.className = "section-head";
  const headText = document.createElement("div");
  const title = document.createElement("div");
  title.className = "title";
  title.textContent = "모든 북마크";
  const desc = document.createElement("div");
  desc.className = "desc";
  desc.textContent = "폴더에 넣지 않은 북마크도 잊지 않게 보여드려요";
  headText.append(title, desc);
  head.append(headText);
  section.append(head);

  // 북마크 검색창
  const searchLabel = document.createElement("label");
  searchLabel.className = "bookmark-search";
  searchLabel.appendChild(icon("search", 16));
  const searchInput = document.createElement("input");
  searchInput.type = "search";
  searchInput.name = "bookmark-q";
  searchInput.placeholder = "북마크 제목 또는 주소로 검색";
  searchInput.setAttribute("aria-label", "북마크 검색");
  searchLabel.appendChild(searchInput);
  section.append(searchLabel);

  const grid = document.createElement("div");
  grid.className = "bookmark-grid";
  section.append(grid);

  // 북마크가 없으면 안내 문구 (F01-05)
  if (bookmarks.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "아직 북마크가 없어요. 크롬에서 별 버튼으로 저장하면 여기에 나타나요.";
    section.append(empty);
    return;
  }

  const drawGrid = (list) => {
    grid.replaceChildren();
    for (const bookmark of list) {
      grid.appendChild(renderBookmarkTile(bookmark));
    }
  };
  drawGrid(bookmarks);

  // 입력할 때마다 제목·주소 부분 일치로 거른다 (search.js)
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim();
    drawGrid(query === "" ? bookmarks : searchBookmarks(query, bookmarks));
  });
}

function renderBookmarkTile(bookmark) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "bookmark";
  button.appendChild(appIcon(bookmark, 56));
  const name = document.createElement("span");
  name.className = "bookmark__name";
  name.textContent = bookmark.title || bookmark.url || "";
  const url = document.createElement("span");
  url.className = "bookmark__url";
  url.textContent = shortHost(bookmark.url);
  button.append(name, url);
  button.addEventListener("click", () => openBookmark(bookmark));
  button.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    showContextMenu(bookmark);
  });
  return button;
}

function shortHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url || "";
  }
}

// ----- #dock (고정됨) -----
function renderDock(bookmarks, stored) {
  const dock = document.getElementById("dock");
  if (!dock) return;
  dock.replaceChildren();

  const pinnedIds = Array.isArray(stored?.pinned) ? stored.pinned : [];
  const byId = new Map(bookmarks.map((b) => [String(b.id), b]));
  const pinned = pinnedIds.map((id) => byId.get(String(id))).filter(Boolean);
  if (pinned.length === 0) return; // 비어 있으면 독을 숨긴다 (:empty)

  for (const bookmark of pinned) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "dock__item";
    item.setAttribute("aria-label", `${bookmark.title || bookmark.url} 열기`);
    item.appendChild(appIcon(bookmark, 48));
    item.addEventListener("click", () => openBookmark(bookmark));
    dock.appendChild(item);
  }
}

// ----- 시작과 다시 그리기 -----

// 알림이 몰려 와도 한 번만 다시 그린다
function scheduleRerender() {
  if (rerenderScheduled) return;
  rerenderScheduled = true;
  queueMicrotask(async () => {
    rerenderScheduled = false;
    await refresh();
  });
}

// 크롬 북마크와 저장 항목을 다시 읽어 화면을 그린다
async function refresh() {
  const [tree, stored] = await Promise.all([loadTree(), load()]);
  lastStored = stored;
  // 저장 항목에서 사라진 북마크 ID를 정리한다 (실패해도 화면은 그린다)
  try {
    await cleanupMissing(tree);
  } catch (error) {
    console.warn("저장 항목 정리 실패", error);
  }
  renderAll(tree, stored);
}

// 크롬 북마크 알림 → 다시 그린다 (F01-02). 새로고침이 필요 없다
function registerListeners() {
  chrome.bookmarks.onCreated.addListener((id, node) => {
    // 폴더 밖에 새로 저장된 북마크는 서비스 워커가 기록하지만, 새 탭이 열려 있으면 바로 반영한다
    scheduleRerender();
  });
  chrome.bookmarks.onChanged.addListener(() => scheduleRerender());
  chrome.bookmarks.onRemoved.addListener(() => scheduleRerender());
  chrome.bookmarks.onMoved.addListener((id, info) => {
    // 순서만 바뀌면(같은 폴더 안) 기록하지 않는다. 다른 폴더로 옮겼고 우리 정리가 아니면 '직접 옮김'으로 기록한다
    if (info.parentId !== info.oldParentId) {
      recordManualMoveIfNeeded(id, info.parentId);
    }
    scheduleRerender();
  });
  // 서비스 워커가 저장 항목을 바꾸면(새 북마크·직접 옮김) 새 탭이 알아챈다
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local") scheduleRerender();
  });
}

// 우리 정리가 옮긴 게 아니면(pendingMoves에 없음) 직접 옮김으로 기록한다. isPending 판단은 store.js가 한다
async function recordManualMoveIfNeeded(id, parentId) {
  try {
    const { isPending } = await import("./store.js");
    if (await isPending(id, parentId)) return; // 우리 정리가 옮기는 중
    await markManualMove(id);
  } catch (error) {
    console.warn("직접 옮김 기록 실패", error);
  }
}

// 화면 시작
async function start() {
  await loadCategories();
  registerListeners();
  await refresh();
}

start().catch((error) => {
  console.error("화면을 시작하지 못했어요", error);
  showToast("화면을 불러오지 못했어요");
});
