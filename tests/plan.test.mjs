// extension/js/plan.js 테스트 (팀원 C · 이슈 #11)
// 실행: node --test "tests/*.test.mjs"   (Node 20 이상. 따옴표가 필요하다)
// plan.js는 크롬 API를 쓰지 않으므로 진짜 categories.json과 정답지로 바로 확인한다.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getTargets, makePlan, suggestNewFolders } from "../extension/js/plan.js";

const categories = JSON.parse(readFileSync(new URL("../extension/data/categories.json", import.meta.url), "utf8"));
const answerKey = JSON.parse(readFileSync(new URL("./answer-key-100.json", import.meta.url), "utf8"));

// 카테고리별로 분류표 sites에서 고른 사이트
const SITES = {
  "학교": "everytime.kr",
  "영상": "youtube.com",
  "온라인 강의": "inflearn.com",
  "블로그·글": "velog.io",
  "문서·협업": "docs.google.com",
  "개발": "github.com",
  "취업": "saramin.co.kr",
  "쇼핑": "coupang.com",
  "커뮤니티": "reddit.com",
};

// 북마크. category가 null이면 분류되지 않는 주소
let seq = 0;
function bm(category, parentId = "1", extra = {}) {
  seq += 1;
  const url = category === null ? `https://zz-unknown.example/${seq}` : `https://${SITES[category]}/p${seq}`;
  return { id: "b" + seq, title: "x" + seq, url, parentId, rootType: "bar", rootId: "1", rootChosen: true, ...extra };
}

// 같은 카테고리 북마크 여러 개
function many(category, count, parentId = "1", extra = {}) {
  return Array.from({ length: count }, () => bm(category, parentId, extra));
}

function fd(id, title, parentId = "1", extra = {}) {
  return { id, title, parentId, rootType: "bar", rootId: "1", rootChosen: true, ...extra };
}

function tree(bookmarks, folders = []) {
  return { roots: { bar: { id: "1" }, other: { id: "2" }, mobile: null }, bookmarks, folders };
}

// 결과를 [이름, 개수]로 줄인다
const short = (r) => r.map((x) => [x.name, x.items.length]);

// 기록 하나짜리 stored
const withHistory = (...idLists) => ({
  history: idLists.map((ids, i) => ({ id: "h" + i, at: 0, type: "first", createdFolderIds: ids, moves: [], fromOrder: {}, skipped: 0 })),
});

test("suggestNewFolders: tree나 stored가 없어도 오류 없이 빈 배열", () => {
  assert.deepEqual(suggestNewFolders({}, null, categories), []);
  assert.deepEqual(suggestNewFolders(undefined, undefined, categories), []);
  assert.deepEqual(suggestNewFolders({}, undefined, categories), []);
  assert.deepEqual(suggestNewFolders(undefined, null, categories), []);
});

test("suggestNewFolders: 북마크바 바로 아래 개발 3개 → 제안. items는 같은 객체·같은 순서, 키는 name·items뿐", () => {
  const t = tree(many("개발", 3));
  const r = suggestNewFolders(t, {}, categories);
  assert.deepEqual(short(r), [["개발", 3]]);
  assert.deepEqual(Object.keys(r[0]).sort(), ["items", "name"]);
  r[0].items.forEach((item, i) => assert.equal(item, t.bookmarks[i]));
});

test("suggestNewFolders: 3개 미만이거나 분류되지 않으면 제안하지 않는다", () => {
  assert.deepEqual(suggestNewFolders(tree(many("개발", 2)), {}, categories), []);
  assert.deepEqual(suggestNewFolders(tree(many(null, 3)), {}, categories), []);
});

test("suggestNewFolders: 사용자 폴더 안은 대상이 아니고, 가져오기 폴더 바로 아래는 대상이다", () => {
  assert.deepEqual(suggestNewFolders(tree(many("개발", 3, "f1"), [fd("f1", "내 폴더")]), {}, categories), []);
  assert.deepEqual(short(suggestNewFolders(tree(many("개발", 3, "imp"), [fd("imp", "가져온 북마크")]), {}, categories)), [["개발", 3]]);
});

test("suggestNewFolders: manualMoves에 있는 북마크와 고르지 않은 쪽 북마크는 빠진다", () => {
  const bs = many("개발", 3);
  assert.deepEqual(suggestNewFolders(tree(bs), { manualMoves: { [bs[0].id]: "x" } }, categories), []);
  const other = many("개발", 3, "3", { rootType: "other", rootId: "3", rootChosen: false });
  assert.deepEqual(suggestNewFolders(tree(other), {}, categories), []);
});

test("suggestNewFolders: now 입력이 없어 북마크바 최근 30일 보호를 하지 않는다 (dateLastUsed가 있어도 대상)", () => {
  assert.deepEqual(short(suggestNewFolders(tree(many("개발", 3, "1", { dateLastUsed: 1 })), {}, categories)), [["개발", 3]]);
});

test("suggestNewFolders: 같은 이름 폴더는 관리자 폴더만 빼고 찾는다 (N24 suggestForNew와 같은 기준)", () => {
  const bs = () => [...many("개발", 3), ...many("영상", 3)];
  // 다른 폴더 안 깊은 곳의 일반 폴더
  const deep = [fd("a", "상위"), fd("b", "중간", "a"), fd("c", "개발", "b")];
  assert.deepEqual(short(suggestNewFolders(tree(bs(), deep), {}, categories)), [["영상", 3]]);
  // 관리자 폴더만 있으면 같은 이름으로 치지 않는다
  const managed = [fd("m", "개발", "9", { rootType: "managed", rootId: "9" })];
  assert.deepEqual(short(suggestNewFolders(tree(bs(), managed), {}, categories)), [["영상", 3], ["개발", 3]]);
  // 고르지 않은 쪽 폴더는 N24도 추천하므로 같은 이름으로 친다
  const unchosen = [fd("u", "개발", "3", { rootType: "other", rootId: "3", rootChosen: false })];
  assert.deepEqual(short(suggestNewFolders(tree(bs(), unchosen), {}, categories)), [["영상", 3]]);
});

test("suggestNewFolders: 개수가 많은 순, 같으면 분류표 순서", () => {
  const t = tree([...many("쇼핑", 3), ...many("개발", 3), ...many("영상", 4)]);
  assert.deepEqual(short(suggestNewFolders(t, {}, categories)), [["영상", 4], ["개발", 3], ["쇼핑", 3]]);
});

test("suggestNewFolders: 우리가 만든 폴더 수만큼 상한에서 뺀다 (대상 12개 → 상한 3)", () => {
  const t = tree(
    [...many("쇼핑", 3), ...many("개발", 3), ...many("영상", 3), ...many("학교", 3)],
    [fd("o1", "우리1"), fd("o2", "우리2"), fd("o3", "우리3")],
  );
  const all = [["학교", 3], ["영상", 3], ["개발", 3]];
  assert.deepEqual(short(suggestNewFolders(t, {}, categories)), all);
  assert.deepEqual(short(suggestNewFolders(t, withHistory(["o1", "o2"]), categories)), [["학교", 3]]);
  assert.deepEqual(suggestNewFolders(t, withHistory(["o1", "o2", "o3"]), categories), []);
  // 지워진 폴더(tree에 없는 ID)는 세지 않는다
  assert.deepEqual(short(suggestNewFolders(t, withHistory(["x1", "x2", "x3"]), categories)), all);
  // 여러 기록에 같은 ID가 있어도 한 번만 센다
  assert.deepEqual(short(suggestNewFolders(t, withHistory(["o1"], ["o1"]), categories)), [["학교", 3], ["영상", 3]]);
});

test("suggestNewFolders: 우리 폴더 바로 아래 북마크도 상한 계산에 들어간다", () => {
  const outside = () => Object.keys(SITES).flatMap((c) => many(c, 3));
  const folders = [fd("o1", "우리 폴더")];
  const stored = withHistory(["o1"]);
  // 27개 → 상한 3 − 우리 폴더 1 = 2
  assert.deepEqual(short(suggestNewFolders(tree(outside(), folders), stored, categories)), [["학교", 3], ["영상", 3]]);
  // 27 + 3 = 30개 → 상한 4 − 1 = 3
  const t = tree([...outside(), ...many(null, 3, "o1")], folders);
  assert.deepEqual(short(suggestNewFolders(t, stored, categories)), [["학교", 3], ["영상", 3], ["온라인 강의", 3]]);
});

// 정답지 100개의 location으로 트리를 만든다
function answerTree() {
  const parentOf = {
    "북마크바": "1",
    "가져온 북마크": "f-imp",
    "가져온 북마크/자취템": "f-ja",
    "졸업프로젝트": "f-jol",
    "알바·취준": "f-al",
  };
  const bookmarks = answerKey.map((a) => {
    assert.ok(Object.hasOwn(parentOf, a.location), a.location);
    return { id: String(a.id), title: a.title, url: a.url, parentId: parentOf[a.location], rootType: "bar", rootId: "1", rootChosen: true };
  });
  const folders = [fd("f-imp", "가져온 북마크"), fd("f-jol", "졸업프로젝트"), fd("f-al", "알바·취준"), fd("f-ja", "자취템", "f-imp")];
  return tree(bookmarks, folders);
}

test("suggestNewFolders: 정답지 100개 → makePlan과 같은 폴더, 우리 폴더가 있으면 그만큼 줄어든다", () => {
  const t = answerTree();
  const r = short(suggestNewFolders(t, {}, categories));
  assert.deepEqual(r, [["학교", 12], ["영상", 12], ["블로그·글", 10], ["개발", 10], ["온라인 강의", 9]]);
  const plan = makePlan(getTargets(t, {}, {}, 0), categories);
  assert.deepEqual(r, plan.folders.map((f) => [f.name, f.items.length]));

  const names = (stored) => suggestNewFolders(t, stored, categories).map((x) => x.name);
  assert.deepEqual(names(withHistory(["f-jol", "f-al"])), ["학교", "영상", "블로그·글"]);
  assert.deepEqual(names(withHistory(["f-jol", "f-al", "f-ja", "f-imp"])), ["학교", "영상"]);
});

test("suggestNewFolders: 같은 입력이면 같은 결과이고 입력을 바꾸지 않는다", () => {
  const t = answerTree();
  const stored = { ...withHistory(["f-jol"]), manualMoves: { 1: "x" } };
  const tBefore = structuredClone(t);
  const sBefore = structuredClone(stored);
  const first = JSON.stringify(suggestNewFolders(t, stored, categories));
  const second = JSON.stringify(suggestNewFolders(t, stored, categories));
  assert.equal(first, second);
  assert.deepEqual(t, tBefore);
  assert.deepEqual(stored, sBefore);
});
