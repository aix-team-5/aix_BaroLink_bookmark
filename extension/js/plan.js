// 담당: 팀원 C · 이슈 #11 · 명세: N19, N20, N21, N37 (F05, F06, F09, F10)
// 정리 대상과 폴더 계획. 계산만 한다 (크롬 API를 쓰지 않고, 필요한 값은 모두 입력으로 받는다).

import { classify } from "./classify.js";

// 크롬의 가져오기 폴더 이름. 크롬이 가져오기 폴더에 따로 표시를 남기지 않아 이름으로 판단한다 (F05-04).
// 북마크바·기타 북마크·모바일 북마크 바로 아래에 있는 폴더에만 적용한다.
// 범위(명세 v14): 한국어 크롬의 파일 가져오기("가져온 북마크")만 다룬다.
//   영어 크롬의 "Imported"나 다른 브라우저의 북마크를 가져왔을 때의 이름은 확인할 수 없어 넣지 않는다.
const IMPORT_FOLDER_NAMES = ["가져온 북마크"];

// 명세 v17: 북마크바에서 마지막으로 연 지 30일 "미만"이면 요즘 쓰는 북마크로 보고 뺀다
const RECENT_MS = 30 * 24 * 60 * 60 * 1000;

// 주소가 javascript: 또는 chrome:// 로 시작하는지. 앞뒤 공백과 대소문자는 무시한다
function isSkippedUrl(url) {
  const u = (url || "").trim().toLowerCase();
  return u.startsWith("javascript:") || u.startsWith("chrome://");
}

// 북마크바에 있고 dateLastUsed가 now 기준 30일 미만인 북마크
function isRecentBar(bookmark, now) {
  return bookmark.rootType === "bar" && bookmark.dateLastUsed != null && now - bookmark.dateLastUsed < RECENT_MS;
}

// 바로 아래의 북마크를 정리 대상으로 삼을 폴더의 ID를 모은다
function targetParentIds(tree, excludeBar, includeFolderIds) {
  const roots = tree.roots || {};
  const rootIds = [roots.bar, roots.other, roots.mobile].filter(Boolean).map((r) => r.id);
  const ids = new Set();

  // ① 최상위 폴더 바로 아래
  // 명세 v17: excludeBar는 북마크바 바로 아래만 뺀다 (북마크바 안의 가져오기 폴더는 그대로)
  for (const id of rootIds) {
    if (excludeBar && roots.bar && id === roots.bar.id) continue;
    ids.add(id);
  }

  const include = new Set(includeFolderIds);
  for (const f of tree.folders || []) {
    // ② 최상위 폴더 바로 아래의 가져오기 폴더. 그 안의 폴더는 사용자 폴더라 넣지 않는다
    if (rootIds.includes(f.parentId) && IMPORT_FOLDER_NAMES.includes(f.title)) ids.add(f.id);
    // ③ 사용자가 포함하기로 고른 폴더. 회사 관리 폴더와 고르지 않은 쪽 최상위 폴더 안의 것은 무시한다
    // 명세 v17: includeFolderIds는 그 폴더의 바로 아래 북마크만 넣는다 (하위 폴더는 넣지 않음)
    if (include.has(f.id) && f.rootType !== "managed" && f.rootChosen !== false) ids.add(f.id);
  }
  return ids;
}

// N19: 정리 대상 북마크를 고른다. options: { 북마크바 제외, 포함할 사용자 폴더 }
// 크롬의 가져오기 폴더 바로 아래의 북마크도 대상에 넣는다. 가져오기 폴더 안의 폴더는 사용자 폴더로 본다 (F05-04, v12)
/**
 * Select bookmarks for organization from a flattened tree returned by loadTree.
 * Candidates are direct children of the chosen roots, their "가져온 북마크"
 * import folders, or explicitly included folders; descendants are not included
 * recursively. Managed and unchosen-root bookmarks, IDs in stored.manualMoves,
 * and javascript: or chrome:// URLs (ignoring case and surrounding whitespace)
 * are excluded. Bar bookmarks with dateLastUsed less than 30 days before now,
 * including future timestamps, are excluded; exactly 30 days old is not
 * excluded by this rule.
 *
 * @param {object} tree Flattened roots, folders, and bookmarks from loadTree.
 * @param {object} stored Stored data; missing manualMoves is treated as empty.
 * @param {object} options excludeBar excludes only direct bar children;
 *   includeFolderIds adds direct children of eligible folders. Defaults are
 *   false and an empty list, respectively.
 * @param {number} now Current time in milliseconds since the Unix epoch.
 * @returns {Array} Eligible bookmarks in input order, once per ID.
 * @throws {TypeError} If inputs have invalid shapes, such as a non-iterable
 *   includeFolderIds or a truthy non-string URL on a candidate.
 */
export function getTargets(tree, stored, options, now) {
  // 명세 v17: options는 { excludeBar: false, includeFolderIds: [] }. 빠진 값은 기본값으로 채운다
  const { excludeBar = false, includeFolderIds = [] } = options || {};
  const manualMoves = (stored && stored.manualMoves) || {};
  const parentIds = targetParentIds(tree, excludeBar, includeFolderIds || []);

  // tree.bookmarks의 순서를 그대로 두고, 같은 북마크는 한 번만 넣는다
  const seen = new Set();
  return (tree.bookmarks || []).filter((b) => {
    if (seen.has(b.id) || !parentIds.has(b.parentId)) return false;
    if (b.rootType === "managed" || b.rootChosen === false) return false;
    if (isRecentBar(b, now)) return false;
    if (isSkippedUrl(b.url)) return false;
    if (Object.hasOwn(manualMoves, b.id)) return false;
    seen.add(b.id);
    return true;
  });
}

// 대상 수에 따른 폴더 수 상한: 10~29개 → 3, 30~59개 → 4, 60~99개 → 5, 100개 이상 → 6
function folderLimit(count) {
  if (count >= 100) return 6;
  if (count >= 60) return 5;
  if (count >= 30) return 4;
  return 3;
}

// N20: 폴더 계획을 세운다
// 출력: { type: "folders", folders: [{ name, items, reasons }], rest } 또는 { type: "pin", reason }
/**
 * Plan folders from classified targets, or return a pin suggestion reason.
 * Fewer than 10 targets yields "tooFew"; otherwise, no eligible category with
 * at least three targets yields "noGroup". Unclassified targets and "기타"
 * are not grouped. Eligible groups are ordered by size, with ties following the
 * category table order, and capped at 3, 4, 5, or 6 folders for 10–29, 30–59,
 * 60–99, or at least 100 targets, respectively.
 *
 * @param {Array} targets Bookmarks to classify, in the desired item order.
 * @param {object} categories Classification table used by classify.
 * @returns {object} A pin result with reason, or a folders result with each
 *   folder's name, items, and corresponding { bookmarkId, step, rule,
 *   needsCheck } reasons; rest counts targets not placed in those folders.
 * @throws {TypeError} Invalid target or category data can throw during
 *   classification or grouping when there are at least 10 targets. Invalid
 *   or hostless URLs are instead treated as unclassified by classify.
 */
export function makePlan(targets, categories) {
  // 명세 v17: pin의 reason은 코드 "tooFew"(대상 10개 미만) · "noGroup"(3개 이상 모인 카테고리 없음). 화면 문구는 cards.js가 만든다
  if (targets.length < 10) return { type: "pin", reason: "tooFew" };

  // 카테고리별로 모은다. targets 순서대로 넣으므로 items도 targets의 순서를 따른다
  // 분류되지 않은 북마크와 "기타" 카테고리는 폴더로 만들지 않는다
  const groups = new Map();
  for (const b of targets) {
    const r = classify(b, categories);
    if (r.category === null || r.category === "기타") continue;
    if (!groups.has(r.category)) groups.set(r.category, { name: r.category, items: [], reasons: [] });
    const g = groups.get(r.category);
    g.items.push(b);
    // 명세 v17: reasons는 items와 같은 순서·같은 길이이고, 각 칸은 { bookmarkId, step, rule, needsCheck }
    g.reasons.push({ bookmarkId: b.id, step: r.step, rule: r.rule, needsCheck: r.needsCheck });
  }

  // 3개 이상인 카테고리만 후보. 개수가 많은 것부터, 같으면 분류표에 먼저 적힌 것부터
  const order = new Map(categories.categories.map((c, i) => [c.name, i]));
  const candidates = [...groups.values()]
    .filter((g) => g.items.length >= 3)
    .sort((a, b) => b.items.length - a.items.length || order.get(a.name) - order.get(b.name));
  if (candidates.length === 0) return { type: "pin", reason: "noGroup" };

  const folders = candidates.slice(0, folderLimit(targets.length));
  const placed = folders.reduce((sum, f) => sum + f.items.length, 0);
  // 명세 v17: rest는 어느 폴더에도 들어가지 않은 대상의 개수(숫자)
  return { type: "folders", folders, rest: targets.length - placed };
}

// N21: 고정 후보 최대 5개. 자주 방문한 사이트와 호스트가 같은 북마크 먼저, 부족하면 최근에 연 순
export function pickPinCandidates(bookmarks, topSites, stored) {
  return [];
}

// N37: 폴더 밖에 같은 카테고리가 3개 이상 모이면 새 폴더를 제안. 출력: [{ name, items }]
export function suggestNewFolders(tree, stored, categories) {
  return [];
}
