// 담당: 팀원 A · 이슈 #4 · 명세: N22, N23 (F07, F10, F13)
// 정리 적용과 되돌리기. 크롬 북마크를 실제로 바꾼다. bookmarks.js와 store.js를 거친다.

import { loadTree, createFolder, moveBookmark, deleteFolderKeepChildren } from "./bookmarks.js";
import { load, setPending, addHistory, markUndone, markHandledNew } from "./store.js";

const TYPES = ["first", "new"];
const FIRST_ONLY_ERROR = "첫 정리에서는 keep·folderId를 쓰지 않아요";

// applyPlan·undo를 한 줄로 세우는 큐. 같은 탭에서 두 번 눌러 겹치는 것을 막는다 (다른 탭까지는 막지 않는다)
let queue = Promise.resolve();

function enqueue(fn) {
  const task = queue.then(fn);
  // 실패한 작업이 큐를 막지 않게 한다 (오류는 부른 쪽이 받는다)
  queue = task.catch(() => {});
  return task;
}

// items의 한 항목은 북마크 객체({ id, … }) 또는 ID다. ID는 문자열로 맞춘다
function itemId(item) {
  const id = item !== null && typeof item === "object" ? item.id : item;
  if (id === undefined || id === null || id === "") throw new Error("정리 계획에 ID가 없는 북마크가 있어요");
  return String(id);
}

// 폴더 ID → 지금 자식 ID 목록(순서대로). 하위 폴더도 넣는다. 고르지 않은 루트(두 번째 기타 북마크 등)도 포함
function childrenByFolder(tree) {
  const groups = new Map();
  for (const node of [...tree.bookmarks, ...tree.folders]) {
    const parentId = String(node.parentId);
    if (!groups.has(parentId)) groups.set(parentId, []);
    groups.get(parentId).push(node);
  }
  const result = new Map();
  for (const [parentId, nodes] of groups) {
    result.set(parentId, nodes.sort((a, b) => a.index - b.index).map((node) => String(node.id)));
  }
  return result;
}

// 아무것도 바꾸기 전에 계획 전체를 검사하고, 목적지(기존 폴더 ID 또는 새 폴더 이름)별로 북마크 ID를 모은다
// N22 입력은 { folders: [{ folderId 또는 name, items }], keep? }라 type이 없어도 받는다. 있으면 "folders"여야 한다(N20 makePlan의 "pin" 등은 오류)
// 돌려주는 값: { groups: Map(목적지 키 → { folderId | name, ids }), keep: [북마크 ID] (중복 없음), seen: Set(folders에 나온 ID) }
function readPlan(plan, type) {
  if (!plan || typeof plan !== "object" || (plan.type !== undefined && plan.type !== "folders") || !Array.isArray(plan.folders)) {
    throw new Error("정리할 폴더 계획이 아니에요");
  }
  const rawKeep = plan.keep ?? [];
  if (!Array.isArray(rawKeep)) throw new Error("그대로 둘 북마크 목록(keep)이 배열이 아니에요");
  // 첫 정리에는 '그대로 두기'가 없다 (명세 v20)
  if (type === "first" && rawKeep.length > 0) throw new Error(FIRST_ONLY_ERROR);
  const keep = [...new Set(rawKeep.map(itemId))];

  const groups = new Map(); // 목적지 키 → { folderId | name, ids }. 같은 목적지는 합친다
  const seen = new Map(); // 북마크 ID → 처음 나온 목적지 이름(경고 문구용)
  for (const folder of plan.folders) {
    if (!folder || typeof folder !== "object") throw new Error("정리할 폴더 계획이 아니에요");
    const hasFolderId = folder.folderId !== undefined && folder.folderId !== null && folder.folderId !== "";
    if (hasFolderId && type === "first") throw new Error(FIRST_ONLY_ERROR);
    let key;
    let label;
    let target;
    if (hasFolderId) {
      // folderId와 name이 둘 다 있으면 folderId를 쓰고 name은 무시한다 (명세 v20)
      const folderId = String(folder.folderId);
      key = `id:${folderId}`;
      label = `폴더 ${folderId}`;
      target = { folderId };
    } else {
      const name = typeof folder.name === "string" ? folder.name.trim() : "";
      if (!name) throw new Error("폴더 이름이 비어 있어요");
      key = `name:${name}`;
      label = `"${name}"`;
      target = { name };
    }
    if (!Array.isArray(folder.items)) throw new Error(`${label} 폴더의 북마크 목록이 없어요`);
    if (!groups.has(key)) groups.set(key, { ...target, ids: [] });
    for (const item of folder.items) {
      const id = itemId(item);
      if (seen.has(id)) {
        console.warn(`북마크 ${id}가 ${seen.get(id)}와 ${label}에 함께 있어 처음 것만 써요`);
        continue;
      }
      seen.set(id, label);
      groups.get(key).ids.push(id);
    }
  }
  return { groups, keep, seen: new Set(seen.keys()) };
}

// N22: 폴더를 만들고 북마크를 옮긴 뒤 기록을 저장. type은 "first" | "new"
// 옮긴 것도 만든 폴더도 없으면 기록을 저장하지 않고 돌려주기만 한다(되돌릴 것이 없다)
// 결과: { id, at, type, createdFolderIds, moves, fromOrder, skipped, kept }. kept는 '그대로 두기'로 기록한 수("first"는 0)
export async function applyPlan(plan, type) {
  return enqueue(() => runApplyPlan(plan, type));
}

async function runApplyPlan(plan, type) {
  if (!TYPES.includes(type)) throw new Error(`정리 종류는 "first" 또는 "new"여야 해요 (지금: ${type})`);
  const { groups, keep, seen } = readPlan(plan, type);

  // ① 원래 폴더와 원래 순서를 첫 북마크를 옮기기 전에 한꺼번에 읽는다
  const tree = await loadTree();
  const bar = tree.roots.bar;
  if (!bar) throw new Error("북마크바를 찾을 수 없어요");
  const before = childrenByFolder(tree);
  const byId = new Map(tree.bookmarks.map((bookmark) => [String(bookmark.id), bookmark]));
  const barBefore = new Set(bar.childIds.map(String));
  // folderId로 쓸 수 있는 폴더: 폴더 목록과 최상위 폴더(북마크바·기타·모바일). 맨 위 루트("0")는 쓰지 않는다
  const folderIds = new Set(tree.folders.map((folder) => String(folder.id)));
  for (const root of Object.values(tree.roots)) if (root) folderIds.add(String(root.id));
  folderIds.delete("0");

  // ② 새 폴더는 북마크바 맨 뒤에 만든다. 같은 이름 폴더가 있으면 그 폴더를 쓴다 (F07-08)
  // 이미 지워진 북마크는 skipped에 세고, 남은 북마크가 없는 그룹은 폴더를 만들지 않는다
  // folderId의 폴더가 없으면 오류 없이 그 그룹의 북마크를 skipped에 센다 (명세 v20)
  let skipped = 0;
  const createdFolderIds = [];
  const targets = [];
  for (const group of groups.values()) {
    const alive = group.ids.filter((id) => byId.has(id));
    skipped += group.ids.length - alive.length;
    if (alive.length === 0) continue;
    if (group.folderId !== undefined) {
      if (!folderIds.has(group.folderId)) {
        skipped += alive.length;
        continue;
      }
      targets.push({ folderId: group.folderId, ids: alive });
      continue;
    }
    const folder = await createFolder(group.name, bar.id);
    const folderId = String(folder.id);
    if (!barBefore.has(folderId) && !createdFolderIds.includes(folderId)) createdFolderIds.push(folderId);
    targets.push({ folderId, ids: alive });
  }

  const planned = [];
  for (const { folderId, ids } of targets) {
    for (const id of ids) {
      const bookmark = byId.get(id);
      // 이미 그 폴더에 있으면 옮기지 않고 기록에도 넣지 않는다
      if (String(bookmark.parentId) === folderId) continue;
      planned.push({
        bookmarkId: id,
        title: bookmark.title,
        fromParentId: String(bookmark.parentId),
        fromIndex: bookmark.index,
        toParentId: folderId,
      });
    }
  }

  const id = crypto.randomUUID();
  const at = Date.now();

  // ③ 저장이 끝난 뒤에 옮긴다. 표시는 옮긴 뒤에 지우지 않는다(1분 뒤 만료)
  if (planned.length > 0) {
    await setPending(planned.map((move) => ({ id: move.bookmarkId, toParentId: move.toParentId })));
  }

  // ④ 옮기지 못한 북마크는 건너뛰고 skipped에 센다 (F07-09)
  const moves = [];
  for (const move of planned) {
    let result = null;
    try {
      result = await moveBookmark(move.bookmarkId, move.toParentId);
    } catch (error) {
      console.warn(`북마크 ${move.bookmarkId}를 옮기지 못했어요`, error);
    }
    if (result) moves.push(move);
    else skipped++;
  }

  // 원래 폴더는 비어도 지우지 않는다 (F07-04)
  const fromOrder = {};
  for (const move of moves) {
    fromOrder[move.fromParentId] ??= [...(before.get(move.fromParentId) ?? [])];
  }

  // '그대로 두기': keep에서 folders에 나온 ID와 지금 없는 북마크를 뺀 것 (첫 정리는 keep이 없어 0)
  const kept = keep.filter((keepId) => !seen.has(keepId) && byId.has(keepId));

  const entry = { id, at, type, createdFolderIds, moves, fromOrder, skipped, kept: kept.length };
  // ⑤ 옮긴 것만 기록한다. 저장하지 못하면 손으로 되돌릴 수 있게 기록 전체를 콘솔에 남기고 오류를 그대로 던진다
  if (moves.length > 0 || createdFolderIds.length > 0) {
    try {
      await addHistory(entry);
    } catch (error) {
      console.error("정리 기록을 저장하지 못했어요", entry);
      throw error;
    }
  }
  // ⑥ 기록을 저장한 뒤에 '그대로 두기'를 기록한다. 옮긴 북마크는 서비스 워커가 newBookmarks에서 지운다
  if (kept.length > 0) await markHandledNew(kept);
  return entry;
}

// N23: 원래 순서에서 바로 앞에 있던 이웃의 뒤에 끼워 넣어 되돌린다
export async function undo(historyId) {
  return enqueue(() => runUndo(historyId));
}

async function runUndo(historyId) {
  // markUndone은 없는 ID를 조용히 넘기므로 여기서 직접 확인한다
  const { history } = await load();
  const entry = history.find((item) => String(item.id) === String(historyId));
  if (!entry) throw new Error("정리 기록을 찾을 수 없어요");
  if (entry.undoneAt) return { restored: 0, skipped: 0, fallback: 0 };

  const tree = await loadTree();
  const children = childrenByFolder(tree);
  const parentOf = new Map();
  for (const [parentId, ids] of children) {
    for (const id of ids) parentOf.set(id, parentId);
  }
  // 원래 폴더가 지금 있는지: 폴더, 고른 루트, 북마크·폴더가 들어 있는 루트
  const existing = new Set(tree.folders.map((folder) => String(folder.id)));
  for (const root of Object.values(tree.roots)) if (root) existing.add(String(root.id));
  for (const node of [...tree.bookmarks, ...tree.folders]) existing.add(String(node.rootId));
  const other = tree.roots.other;

  const fromOrder = entry.fromOrder ?? {};
  const position = (move) => {
    const order = (fromOrder[move.fromParentId] ?? []).map(String);
    const index = order.indexOf(String(move.bookmarkId));
    return index === -1 ? move.fromIndex : index;
  };
  // 원래 폴더별로, 원래 순서가 앞인 것부터
  const folderOrder = [...new Set(entry.moves.map((move) => String(move.fromParentId)))];
  const sorted = entry.moves
    .map((move) => ({ ...move, bookmarkId: String(move.bookmarkId), fromParentId: String(move.fromParentId) }))
    .sort((a, b) => folderOrder.indexOf(a.fromParentId) - folderOrder.indexOf(b.fromParentId) || position(a) - position(b));

  // 북마크별 실제 목적지(원래 폴더 또는 기타 북마크)를 먼저 정한다
  let skipped = 0;
  const planned = [];
  for (const move of sorted) {
    const now = parentOf.get(move.bookmarkId);
    // 지워졌거나(F13-08) 정리 뒤에 사용자가 다른 곳으로 옮겼으면(F13-05) 건너뛴다
    if (now === undefined || now !== String(move.toParentId)) {
      skipped++;
      continue;
    }
    if (existing.has(move.fromParentId)) {
      planned.push({ move, parentId: move.fromParentId, fallback: false });
    } else if (other) {
      // 원래 폴더가 없으면 기타 북마크 맨 뒤로 (F13-07)
      planned.push({ move, parentId: String(other.id), fallback: true });
    } else {
      skipped++;
    }
  }

  if (planned.length > 0) {
    await setPending(planned.map(({ move, parentId }) => ({ id: move.bookmarkId, toParentId: parentId })));
  }

  let restored = 0;
  let fallback = 0;
  for (const { move, parentId, fallback: isFallback } of planned) {
    const list = children.get(parentId) ?? [];
    let index;
    if (!isFallback) {
      // 원래 순서에서 앞에 있던 것 중 지금 원래 폴더에 남아 있는 가장 가까운 것의 뒤. 없으면 맨 앞 (F13-06)
      const order = (fromOrder[move.fromParentId] ?? []).map(String);
      const own = order.indexOf(move.bookmarkId);
      index = own === -1 ? Math.min(move.fromIndex, list.length) : 0;
      for (let k = own - 1; k >= 0; k--) {
        const neighbor = list.indexOf(order[k]);
        if (neighbor !== -1) {
          index = neighbor + 1;
          break;
        }
      }
    }
    let result = null;
    try {
      result = await moveBookmark(move.bookmarkId, parentId, index);
    } catch (error) {
      console.warn(`북마크 ${move.bookmarkId}를 되돌리지 못했어요`, error);
    }
    if (!result) {
      skipped++;
      continue;
    }
    // 다음 북마크의 이웃을 찾을 수 있게 지금 순서를 코드 안에서 고친다
    const from = children.get(String(move.toParentId)) ?? [];
    const was = from.indexOf(move.bookmarkId);
    if (was !== -1) from.splice(was, 1);
    if (index === undefined) list.push(move.bookmarkId);
    else list.splice(index, 0, move.bookmarkId);
    children.set(parentId, list);
    restored++;
    if (isFallback) fallback++;
  }

  // 그 정리가 만든 폴더가 비었으면 지운다. 원래 있던 폴더는 비어도 남긴다 (F13-04)
  const created = (entry.createdFolderIds ?? []).map(String);
  if (created.length > 0) {
    const after = await loadTree();
    for (const folder of after.folders) {
      if (!created.includes(String(folder.id)) || folder.childIds.length > 0) continue;
      try {
        await deleteFolderKeepChildren(folder.id);
      } catch (error) {
        console.warn(`빈 폴더 ${folder.id}를 지우지 못했어요`, error);
      }
    }
  }

  await markUndone(entry.id);
  return { restored, skipped, fallback };
}
