// 담당: 팀원 D · 이슈 #15 · 명세: N30 (F01~F04, F08, F12) · 크롬 API: C09~C12, C16
// 화면의 시작점. 크롬 북마크 알림과 저장소 알림은 이 파일만 받고, 화면 파일(view/*)의 그리기 함수를 부른다.

// 화면 연결 방식 (docs/file-structure.md 12번, 명세 v13)
// - 각 파일은 newtab.html의 자기 칸 안만 그린다. 이 파일의 칸: #header, #web-search, #all-bookmarks, #dock
// - 화면 파일끼리는 서로 부르지 않는다. 다른 화면 파일의 동작이 필요한 그리기 함수에는 동작 묶음(actions)을 넘긴다.
// - 북마크나 저장 항목이 바뀌면 renderAll을 다시 부른다. 그리기 함수는 자기 칸을 비우고 다시 그린다.

import { loadTree, openBookmark } from "./bookmarks.js";
import { load, cleanupMissing, unpin } from "./store.js";
import { getTargets, makePlan, suggestNewFolders } from "./plan.js";
import { suggestForNew } from "./classify.js";
import { pickForgotten } from "./forgotten.js";
import { appIcon, icon, showToast } from "./ui.js";
import { runWebSearch, searchBookmarks } from "./search.js";
import { makeDraggable } from "./dnd.js";
import { showFolders, openFolderPopup, showContextMenu } from "./view/folders.js";
import { showForgotten } from "./view/forgottenFolder.js";
import { showResultNotice, showHistory } from "./view/history.js";
import { showFirstCard, showOrganizeDialog, showPinPicker } from "./view/cards.js";

// 고정됨(독)에 넣을 수 있는 최대 개수. store.js의 MAX_PINNED와 같다 (F08-06)
const DOCK_MAX = 8;

// 분류표는 이 파일이 읽어서 계산 파일(plan 등)에 넘긴다 (화면 파일·계산 파일은 fetch하지 않는다)
let categories = null;

// 가장 최근에 읽은 상태 (알림이 오면 다시 읽어 갱신한다)
let lastTree = null;

// 다시 그리기가 겹쳐서 여러 번 돌지 않도록 모은다
let rerenderTimer = null;
const RERENDER_DELAY_MS = 100;

// 읽기가 겹쳐 시작되면 가장 나중에 시작한 것만 화면에 그린다 (옛 결과가 새 결과를 덮지 않게)
let refreshSeq = 0;

// 지금 칸에 그려 둔 첫 정리 카드의 계획 요약. 같으면 다시 그리지 않는다 (깜빡임 방지)
let drawnFirstCardKey = null;

// 우리 정리가 옮기는 중이라는 표시(pendingMoves)가 남아 있는 시간. store.js의 PENDING_TTL(1분)과 같다
const PENDING_WINDOW_MS = 60000;

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
  // { x, y, container }를 그대로 넘긴다 (명세 v19 N30·N41). 잊고 있던 북마크 팝업 안의 우클릭은 container로 그 팝업을 준다 (F15-09)
  showContextMenu: (bookmark, options) => showContextMenu(bookmark, options),
  // F06-04 북마크바 제외·사용자 폴더 포함: 범위를 바꿔 첫 정리 계획을 다시 세운다. cards.js는 plan.js를 부르지 않으므로 여기서 세운다
  replan: (options) => replanFirst(options),
};

// actions.replan(options) → { plan, folders }
// options: getTargets(N19)의 { excludeBar, includeFolderIds }. plan: makePlan(N20) 결과 (folders 또는 pin), 세울 수 없으면 null
// folders: 범위에 넣을 수 있는 사용자 폴더 [{ id, title, path, count }]. count는 그 폴더를 넣으면 늘어나는 정리 대상 수
function replanFirst(options) {
  if (!lastTree || !categories) return null;
  const now = Date.now();
  const stored = currentStored();
  const scope = {
    excludeBar: Boolean(options?.excludeBar),
    includeFolderIds: Array.isArray(options?.includeFolderIds) ? options.includeFolderIds.map(String) : [],
  };
  const targets = safeCall(() => getTargets(lastTree, stored, scope, now), []);
  const plan = safeCall(() => makePlan(targets, categories), null);
  return { plan, folders: includableFolders(stored, now) };
}

// 범위에 넣을 수 있는 사용자 폴더: 넣으면 정리 대상이 하나 이상 늘어나는 폴더만 (관리자 폴더·고르지 않은 루트·가져오기 폴더는 빠진다)
// 무엇이 늘어나는지는 getTargets로 직접 세서, 가져오기 폴더처럼 이미 대상인 폴더나 고를 북마크가 없는 폴더가 목록에 나오지 않게 한다
function includableFolders(stored, now) {
  const base = new Set(safeCall(() => getTargets(lastTree, stored, {}, now), []).map((bookmark) => String(bookmark.id)));
  const folders = [];
  for (const folder of lastTree.folders) {
    if (folder.rootType === "managed" || folder.rootChosen === false) continue;
    const added = safeCall(() => getTargets(lastTree, stored, { includeFolderIds: [String(folder.id)] }, now), [])
      .filter((bookmark) => !base.has(String(bookmark.id))).length;
    if (added > 0) folders.push({ id: String(folder.id), title: folder.title, path: folder.path ?? [], count: added });
  }
  return folders;
}

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

  // 첫 정리 카드 (plan.js로 계획을 세우고, cards.js가 그린다)
  renderFirstCard(tree, stored, now);
}

// 우리 정리가 북마크를 옮기는 중이거나 막 끝났는지. pendingMoves에 1분 안의 표시가 있으면 true다
// 옮길 때마다 알림이 와서 다시 그려지는데, 그때마다 남은 북마크로 계획을 새로 세우면 카드가 깜빡이고
// 정리가 끝난 뒤에도 두 번째 카드가 남는다 (상태가 "done"이 되기 전에 시작된 다시 그리기가 "pending"으로 읽음)
function isOrganizing(stored, now) {
  const pending = stored?.pendingMoves;
  if (!pending || typeof pending !== "object") return false;
  return Object.values(pending).some((entry) => entry && now - entry.at < PENDING_WINDOW_MS);
}

// 계획의 요약 열쇠: 폴더 이름·개수와 나머지 수. 이게 같으면 카드를 다시 그릴 필요가 없다
function planKey(plan) {
  if (plan.type !== "folders") return `${plan.type}:${plan.reason ?? ""}`;
  const folders = plan.folders.map((folder) => `${folder.name}:${folder.items.length}`).join("|");
  return `folders:${folders}:${plan.rest}`;
}

function renderFirstCard(tree, stored, now) {
  const firstCardState = stored?.state?.firstCard ?? "pending";
  // 이미 처리했거나(done·later) 분류표가 아직 없으면 그리지 않는다
  if (firstCardState !== "pending" || !categories) return;
  // 정리가 진행 중이거나 막 끝났으면 카드를 건드리지 않는다. 카드는 cards.js가 정리를 끝내며 스스로 지운다
  if (isOrganizing(stored, now)) return;

  const targets = safeCall(() => getTargets(tree, stored, {}, now), []);
  const plan = safeCall(() => makePlan(targets, categories), null);
  if (!plan) return;

  // 카드가 이미 칸에 있고 계획 요약이 같으면 다시 그리지 않는다. [나중에] 등으로 칸이 비었으면 다시 그린다
  const slot = document.getElementById("organize-suggestion");
  const key = planKey(plan);
  if (slot && slot.childElementCount > 0 && key === drawnFirstCardKey) return;

  showFirstCard(plan, actions);
  drawnFirstCardKey = key;
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

  // [정리하기 · N] — 정리 안 된 새 북마크 수 (F10-02). '그대로 두기'로 둔 것은 빼고 센다 (F10-05)
  const newCount = newBookmarkIds(lastTree?.bookmarks ?? [], stored).size;
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
    const now = Date.now();
    // 정리가 진행 중이거나 막 끝났으면(pendingMoves 1분) 열지 않고 이유를 알린다. 눌러도 반응이 없으면 고장으로 보인다 (리뷰 반영)
    if (isOrganizing(currentStored(), now)) {
      showToast("정리하는 중이에요. 잠시 뒤에 다시 눌러 주세요");
      return;
    }
    // 첫 정리를 마친 뒤의 [정리하기 · N]은 새 북마크 정리 창을 연다 (F10-04)
    if (currentStored()?.state?.firstCard === "done") {
      openNewOrganize();
      return;
    }
    const targets = safeCall(() => getTargets(lastTree, currentStored(), {}, now), []);
    const plan = safeCall(() => makePlan(targets, categories), null);
    if (!plan) return;
    // [나중에]로 닫았던 첫 정리 카드를 다시 연다 (F06-06). 창을 바로 열지 않는다
    showFirstCard(plan, actions);
    drawnFirstCardKey = planKey(plan);
    // 아래로 내린 상태에서 눌러도 카드가 보이게 한다
    document.getElementById("organize-suggestion")?.scrollIntoView({ behavior: "smooth", block: "center" });
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

// "새로"로 보이는 북마크 ID = newBookmarks에서 handledNew('그대로 두기')를 뺀 것 (data-structure.txt 10번)
// 크롬에서 이미 지워진 북마크는 세지 않는다
function newBookmarkIds(bookmarks, stored) {
  const handled = new Set((Array.isArray(stored?.handledNew) ? stored.handledNew : []).map(String));
  const alive = new Set(bookmarks.map((bookmark) => String(bookmark.id)));
  const ids = new Set();
  for (const id of Array.isArray(stored?.newBookmarks) ? stored.newBookmarks : []) {
    const key = String(id);
    if (alive.has(key) && !handled.has(key)) ids.add(key);
  }
  return ids;
}

// 새 북마크 정리 창을 연다 (F10-04). 창에 넘기는 값은 file-structure.md 12번(명세 v20)의 형태다
function openNewOrganize() {
  const stored = currentStored();
  const ids = newBookmarkIds(lastTree.bookmarks, stored);
  if (ids.size === 0) {
    // 정리할 새 북마크가 없을 때의 안내 (P2 계획 D5 제안 문구)
    showToast("정리할 새 북마크가 없어요");
    return;
  }
  const newBookmarks = lastTree.bookmarks.filter((bookmark) => ids.has(String(bookmark.id)));
  const suggestions = safeCall(() => suggestForNew(newBookmarks, lastTree.folders, categories), []);
  const folderOf = new Map(suggestions.map((suggestion) => [String(suggestion.bookmarkId), suggestion.folderId ?? null]));
  const plan = {
    type: "new",
    items: newBookmarks.map((bookmark) => ({ bookmark, folderId: folderOf.get(String(bookmark.id)) ?? null })),
    folders: lastTree.folders,
    newFolders: safeCall(() => suggestNewFolders(lastTree, stored, categories), []),
  };
  showOrganizeDialog(plan, actions);
}

// ----- #web-search -----
// 검색창은 한 번만 만든다. 북마크가 바뀌어 다시 그릴 때 검색창을 새로 만들면 입력 중이던 글자가 지워진다.
function renderWebSearch() {
  const section = document.getElementById("web-search");
  if (!section) return;

  // 날짜는 매번 갱신해도 되지만, 검색창(form)이 이미 있으면 그대로 둔다
  let date = section.querySelector(".date");
  if (!date) {
    date = document.createElement("div");
    date.className = "date";
    section.appendChild(date);
  }
  date.textContent = formatToday();

  if (section.querySelector(".search-box")) return; // 검색창이 이미 있으면 다시 만들지 않는다

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

  section.appendChild(form);
}

function formatToday() {
  const now = new Date();
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${now.getMonth() + 1}월 ${now.getDate()}일 ${days[now.getDay()]}요일`;
}

// ----- #all-bookmarks -----
// 북마크 검색(F14)이 찾는 북마크 목록. 다시 그릴 때마다 최신 목록으로 바꾼다
let searchPool = [];

function renderAllBookmarks(bookmarks, stored) {
  const section = document.getElementById("all-bookmarks");
  if (!section) return;
  searchPool = bookmarks;

  // 제목·검색창·결과 칸은 한 번만 만든다. 다시 그릴 때 새로 만들면 입력 중이던 글자가 지워진다 (웹 검색창과 같은 방식)
  if (!section.querySelector(".bookmark-grid")) buildAllBookmarks(section);

  const grid = section.querySelector(".bookmark-grid");
  grid.replaceChildren();
  // 새로 저장된 북마크에는 "새로" 표시를 붙인다 (F10-01). 정리하거나 '그대로 두기'로 두면 빠진다 (F10-05)
  const newIds = newBookmarkIds(bookmarks, stored);
  for (const bookmark of bookmarks) {
    grid.appendChild(renderBookmarkTile(bookmark, newIds.has(String(bookmark.id))));
  }

  // 결과 리스트는 다시 그린 북마크 목록으로 새로 찾는다 (검색 중에 북마크가 바뀌어도 맞게)
  updateBookmarkSearch(section);
}

// #all-bookmarks 안의 고정 부분: 제목, 북마크 검색창, 검색 결과 칸, 북마크 격자, 북마크가 없을 때의 안내
function buildAllBookmarks(section) {
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

  // 북마크 검색창. 글자를 입력할 때마다 결과를 갱신한다 (F14-01). 웹 검색창과는 연동하지 않는다
  const searchLabel = document.createElement("label");
  searchLabel.className = "bookmark-search";
  searchLabel.appendChild(icon("search", 16));
  const searchInput = document.createElement("input");
  searchInput.type = "search";
  searchInput.name = "bookmark-q";
  searchInput.placeholder = "북마크 제목 또는 주소로 검색";
  searchInput.setAttribute("aria-label", "북마크 검색");
  searchInput.addEventListener("input", () => updateBookmarkSearch(section));
  searchLabel.appendChild(searchInput);
  section.append(searchLabel);

  // 검색 결과 리스트 (검색창 바로 아래). 검색어가 없으면 숨긴다 (F14-06)
  const results = document.createElement("div");
  results.className = "search-results list hidden";
  results.setAttribute("aria-live", "polite");
  section.append(results);

  const grid = document.createElement("div");
  grid.className = "bookmark-grid";
  section.append(grid);

  // 북마크가 없으면 보이는 안내 문구 (F01-05)
  const empty = document.createElement("p");
  empty.className = "empty-note all-empty hidden";
  empty.textContent = "아직 북마크가 없어요. 주소창의 별 버튼으로 저장해 보세요";
  section.append(empty);
}

// 검색창의 글자에 맞춰 결과 리스트와 격자를 바꾼다
// - 글자가 있으면: 결과 리스트를 보이고 격자는 숨긴다. 일치하는 북마크가 없으면 안내 문구 (F14-05)
// - 글자가 없으면(공백만 있어도): 결과 리스트를 닫고 격자를 다시 보인다 (F14-06)
function updateBookmarkSearch(section) {
  const input = section.querySelector(".bookmark-search input");
  const results = section.querySelector(".search-results");
  const grid = section.querySelector(".bookmark-grid");
  const emptyAll = section.querySelector(".all-empty");
  if (!input || !results || !grid || !emptyAll) return;

  const query = input.value;
  const searching = query.trim() !== "";

  results.replaceChildren();
  results.classList.toggle("hidden", !searching);
  grid.classList.toggle("hidden", searching);
  emptyAll.classList.toggle("hidden", searching || searchPool.length > 0);
  if (!searching) return;

  const matches = searchBookmarks(query, searchPool);
  if (matches.length === 0) {
    const none = document.createElement("p");
    none.className = "empty-note";
    none.textContent = "일치하는 북마크가 없어요";
    results.appendChild(none);
    return;
  }
  for (const bookmark of matches) {
    results.appendChild(renderSearchResultRow(bookmark));
  }
}

// 검색 결과 한 줄: 사이트 아이콘, 제목, 주소, 들어 있는 폴더 이름 (F14-03)
// 누르면 그 페이지를 연다. 연 시각은 openBookmark가 기록한다 (F14-04)
function renderSearchResultRow(bookmark) {
  const row = document.createElement("button");
  row.type = "button";
  row.className = "list__row";
  row.appendChild(appIcon(bookmark, 44));

  const text = document.createElement("div");
  text.className = "list__text";
  const title = document.createElement("span");
  title.className = "title";
  title.textContent = bookmark.title || bookmark.url || "";
  const meta = document.createElement("span");
  meta.className = "meta";
  meta.textContent = bookmark.url || "";
  text.append(title, meta);
  row.appendChild(text);

  if (bookmark.folderTitle) {
    const folder = document.createElement("span");
    folder.className = "search-result__folder";
    folder.textContent = bookmark.folderTitle;
    row.appendChild(folder);
  }

  row.addEventListener("click", () => openWithNotice(bookmark));
  return row;
}

// F02-05: javascript: 북마크는 열지 않고(openBookmark가 false를 돌려준다) 안내를 띄운다
// 북마크를 여는 곳(모든 북마크, 독)은 이 함수를 쓴다
async function openWithNotice(bookmark) {
  const opened = await openBookmark(bookmark);
  if (opened === false) showToast("이 북마크는 새 탭에서 실행할 수 없어요");
}

// 모든 북마크의 앱 한 칸. 앱 버튼 옆에 끌기 손잡이를 붙이므로 칸(div)으로 감싼다 (F17-01)
// 손잡이는 버튼 안에 넣지 않는다: 버튼 안의 요소는 크롬에서 끌기를 시작하지 못한다
function renderBookmarkTile(bookmark, isNew = false) {
  const cell = document.createElement("div");
  cell.className = "bookmark-cell";
  cell.appendChild(renderBookmarkButton(bookmark, isNew));
  // 관리자가 정한 북마크에는 손잡이를 붙이지 않는다 (F17-04는 makeDraggable이 본다)
  makeDraggable(cell, bookmark);
  return cell;
}

function renderBookmarkButton(bookmark, isNew) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "bookmark";
  if (isNew) {
    const badge = document.createElement("span");
    badge.className = "badge-new bookmark__new";
    badge.textContent = "new"; // 팀 합의로 영문 표시 (명세 F10-01의 "새로" 표시)
    button.appendChild(badge);
  }
  button.appendChild(appIcon(bookmark, 56));
  const name = document.createElement("span");
  name.className = "bookmark__name";
  name.textContent = bookmark.title || bookmark.url || "";
  const url = document.createElement("span");
  url.className = "bookmark__url";
  url.textContent = shortHost(bookmark.url);
  button.append(name, url);
  button.addEventListener("click", () => openWithNotice(bookmark));
  button.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    // 메뉴를 누른 자리에 띄운다 (N41 { x, y }). 모든 북마크는 팝업 밖이라 container는 넘기지 않는다 (document.body)
    showContextMenu(bookmark, { x: event.clientX, y: event.clientY });
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

  for (const bookmark of pinned) {
    const label = bookmark.title || bookmark.url || "";
    // 앱 하나와 [고정 해제] 버튼을 한 칸에 묶는다. 해제 버튼은 마우스를 올리거나 키보드로 가면 보인다 (F08-04)
    const slot = document.createElement("div");
    slot.className = "dock__slot";

    const item = document.createElement("button");
    item.type = "button";
    item.className = "dock__item";
    item.setAttribute("aria-label", `${label} 열기`);
    item.title = label;
    item.appendChild(appIcon(bookmark, 48));
    item.addEventListener("click", () => openWithNotice(bookmark));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "dock__remove";
    remove.setAttribute("aria-label", `${label} 고정 해제`);
    remove.appendChild(icon("close", 12));
    // 독은 저장이 바뀌면 render.js가 알림을 받아 다시 그린다. 여기서는 unpin만 부른다
    remove.addEventListener("click", () => {
      unpin(bookmark.id).catch((error) => {
        console.warn("고정을 해제하지 못했어요", error);
        showToast("고정을 해제하지 못했어요");
      });
    });

    slot.append(item, remove);
    dock.appendChild(slot);
  }

  // 8개가 되면 [+]를 숨긴다 (F09-06). 비어 있어도 [+]는 보여서 첫 고정을 할 수 있다 (시안)
  if (pinned.length < DOCK_MAX) {
    if (pinned.length > 0) {
      const divider = document.createElement("span");
      divider.className = "dock__divider";
      dock.appendChild(divider);
    }
    const add = document.createElement("button");
    add.type = "button";
    add.className = "dock__item dock__add";
    add.setAttribute("aria-label", "고정 북마크 추가");
    add.appendChild(icon("plus", 20));
    add.addEventListener("click", openDockPicker);
    dock.appendChild(add);
  }
}

// 독의 [+]: 고정할 북마크 고르기 창을 연다 (F09-06). 폴더 안의 북마크까지 고를 수 있다
// 이미 고정한 북마크와 javascript: 북마크는 뺀다. 남은 자리까지만 고르게 한다 (F08-06)
function openDockPicker() {
  const pinnedNow = new Set((Array.isArray(currentStored().pinned) ? currentStored().pinned : []).map(String));
  const candidates = (lastTree?.bookmarks ?? []).filter(
    (bookmark) => !pinnedNow.has(String(bookmark.id)) && !isScriptUrl(bookmark.url),
  );
  showPinPicker(candidates, {
    max: Math.max(0, DOCK_MAX - pinnedNow.size),
    limitMessage: "고정은 8개까지 할 수 있어요",
  });
}

function isScriptUrl(url) {
  return typeof url === "string" && url.trim().toLowerCase().startsWith("javascript:");
}

// ----- 시작과 다시 그리기 -----

// 알림이 몰려 와도 한 번만 다시 그린다. 정리 중에는 북마크가 하나씩 옮겨질 때마다 알림이 오므로
// 100ms 동안 모아서 한 번만 읽는다 (알림 수십 번이 몇 번으로 줄어든다)
function scheduleRerender() {
  if (rerenderTimer !== null) return;
  rerenderTimer = setTimeout(() => {
    rerenderTimer = null;
    refresh().catch((error) => console.warn("다시 그리기 실패", error));
  }, RERENDER_DELAY_MS);
}

// 크롬 북마크와 저장 항목을 다시 읽어 화면을 그린다
async function refresh() {
  const seq = ++refreshSeq;
  const [tree, stored] = await Promise.all([loadTree(), load()]);
  // 읽는 동안 더 나중에 시작한 읽기가 있으면, 이 결과는 낡았으니 그리지 않는다
  if (seq !== refreshSeq) return;
  lastStored = stored;
  // 저장 항목에서 사라진 북마크 ID를 정리한다 (실패해도 화면은 그린다)
  try {
    await cleanupMissing(tree);
  } catch (error) {
    console.warn("저장 항목 정리 실패", error);
  }
  // 정리하는 동안에도 더 나중의 읽기가 시작됐을 수 있다
  if (seq !== refreshSeq) return;
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
  // 직접 옮김 기록(manualMoves)은 서비스 워커(background.js)만 한다. 새 탭은 화면만 다시 그린다
  chrome.bookmarks.onMoved.addListener(() => scheduleRerender());
  // 서비스 워커가 저장 항목을 바꾸면(새 북마크·직접 옮김) 새 탭이 알아챈다
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local") scheduleRerender();
  });
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
