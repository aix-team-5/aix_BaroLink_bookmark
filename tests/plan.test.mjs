// extension/js/plan.js 테스트 (팀원 C · 이슈 #11)
// 실행: node --test "tests/*.test.mjs"   (Node 20 이상. 따옴표가 필요하다)
// plan.js는 크롬 API를 쓰지 않으므로 진짜 categories.json과 정답지로 바로 확인한다.
// N21 pickPinCandidates 크롬 콘솔 확인은 tests/console-checks.md C-N21

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getTargets, makePlan, suggestNewFolders, pickPinCandidates as pick } from "../extension/js/plan.js";

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

// ===== N21 pickPinCandidates (#58) =====

// 시각은 Date.now() 대신 고정값을 쓴다
const NOW = Date.UTC(2026, 10, 12);
const DAY = 24 * 60 * 60 * 1000;

// 가짜 북마크와 저장 값
const pinBm = (id, url, extra = {}) => ({ id, title: id, url, parentId: "1", index: 0, dateAdded: NOW - 400 * DAY, ...extra });
const stored = (lastOpenedByUs = {}, pinned = []) => ({ pinned, lastOpenedByUs, dismissed: {}, handledNew: [] });
const ids = (r) => r.map((b) => b.id);
const top = (...urls) => urls.map((url) => ({ url, title: url }));

// 기본 입력 (tests/console-checks.md C-N21과 같다)
const BMS = [
  pinBm("g1", "https://github.com/a"),
  pinBm("y1", "https://www.youtube.com/x"),
  pinBm("n1", "https://naver.com/"),
  pinBm("c1", "https://www.coupang.com/"),
  pinBm("t1", "https://a.tistory.com/1"),
  pinBm("i1", "https://www.inflearn.com/"),
  pinBm("z1", "https://zz.example/"),
];
const OPENED = { g1: NOW - 5 * DAY, n1: NOW - 1 * DAY, c1: NOW - 3 * DAY, t1: NOW - 10 * DAY, i1: NOW - 20 * DAY };
const TOP = top("https://youtube.com/", "chrome-extension://abc/newtab.html", "https://github.com/");

test("F09-03 자주 방문한 사이트와 호스트가 같은 것 먼저, 모자라면 최근에 연 순, 최대 5개", () => {
  assert.deepEqual(ids(pick(BMS, TOP, stored(OPENED))), ["y1", "g1", "n1", "c1", "t1"]);
});

test("F09-08 자주 방문한 사이트가 비면 최근에 연 순만", () => {
  assert.deepEqual(ids(pick(BMS, [], stored(OPENED))), ["n1", "c1", "g1", "t1", "i1"]);
});

test("F09-09 고를 것이 없으면 빈 배열", () => {
  assert.deepEqual(pick(BMS, [], stored()), []);
  assert.deepEqual(pick(BMS, top("https://none.example/"), stored()), []);
  assert.deepEqual(pick([], TOP, stored(OPENED)), []);
});

test("입력이 빠져도 오류 없이 배열", () => {
  assert.deepEqual(pick(BMS, undefined, undefined), []);
  assert.deepEqual(pick(undefined, undefined, undefined), []);
  assert.deepEqual(ids(pick(BMS, null, { lastOpenedByUs: { n1: 1 } })), ["n1"]);
});

test("연 적 없어도 자주 방문한 사이트와 호스트가 같으면 후보", () => {
  assert.deepEqual(ids(pick(BMS, top("https://zz.example/home"), stored())), ["z1"]);
});

test("호스트 비교: 하위 도메인은 다른 사이트, www.·대소문자 무시, 포트는 보지 않음", () => {
  const list = [pinBm("a", "https://a.tistory.com/1"), pinBm("b", "https://WWW.Example.com/x"), pinBm("p", "http://localhost:8080/")];
  assert.deepEqual(ids(pick(list, top("https://tistory.com/"), stored())), []);
  assert.deepEqual(ids(pick(list, top("https://example.com/"), stored())), ["b"]);
  assert.deepEqual(ids(pick(list, top("http://localhost:3000/"), stored())), ["p"]);
});

test("http·https가 아닌 주소와 잘못된 topSites 항목은 건너뛴다", () => {
  const list = [pinBm("e", "chrome-extension://abc/newtab.html"), pinBm("f", "file:///C:/a.html"), pinBm("g", "https://github.com/")];
  const sites = [{ url: "chrome-extension://abc/newtab.html" }, { url: "file:///C:/a.html" }, { url: "아무거나" }, {}, null, { url: "https://github.com/" }];
  assert.deepEqual(ids(pick(list, sites, stored())), ["g"]);
});

test("자주 방문한 사이트 단계(①)에서는 사이트 하나에 북마크 하나. 같은 호스트가 여럿이면 최근에 연 것, 나머지는 ②단계(최근에 연 순)에서 다시 들어올 수 있다", () => {
  const list = [pinBm("g1", "https://github.com/a"), pinBm("g2", "https://github.com/b"), pinBm("g3", "https://github.com/c"), pinBm("n1", "https://naver.com/")];
  const opened = { g1: NOW - 9 * DAY, g2: NOW - 2 * DAY, n1: NOW - 5 * DAY };
  assert.deepEqual(ids(pick(list, top("https://github.com/"), stored(opened))), ["g2", "n1", "g1"]);
  assert.deepEqual(ids(pick(list, top("https://github.com/", "https://www.github.com/x"), stored())), ["g1"]);
});

test("자주 방문한 사이트로 5개가 차면 최근에 연 것은 넣지 않는다", () => {
  const list = ["a", "b", "c", "d", "e", "f"].map((x) => pinBm(x, `https://${x}.example/`));
  const sites = top(...["f", "e", "d", "c", "b", "a"].map((x) => `https://${x}.example/`));
  assert.deepEqual(ids(pick(list, sites, stored({ a: NOW }))), ["f", "e", "d", "c", "b"]);
});

test("F04-03 dateLastUsed도 연 시각으로 보고, 둘 다 있으면 더 최근 값", () => {
  const list = [
    pinBm("bar", "https://a.example/", { dateLastUsed: NOW - 1 * DAY }),
    pinBm("ours", "https://b.example/"),
    pinBm("both", "https://c.example/", { dateLastUsed: NOW - 30 * DAY }),
  ];
  assert.deepEqual(ids(pick(list, [], stored({ ours: NOW - 2 * DAY, both: NOW - 3 * DAY }))), ["bar", "ours", "both"]);
  assert.deepEqual(ids(pick(list, [], stored())), ["bar", "both"]);
});

test("연 시각이 같으면 입력 순서", () => {
  const list = [pinBm("x", "https://x.example/"), pinBm("y", "https://y.example/"), pinBm("z", "https://z.example/")];
  assert.deepEqual(ids(pick(list, [], stored({ z: 5, y: 5, x: 5 }))), ["x", "y", "z"]);
});

test("이미 고정한 것, javascript: 북마크, 같은 id의 두 번째는 뺀다", () => {
  const list = [
    pinBm("p", "https://p.example/"),
    pinBm("js", " JavaScript:alert(1)"),
    pinBm("a", "https://a.example/"),
    pinBm("a", "https://a.example/dup"),
  ];
  const r = pick(list, top("https://p.example/"), stored({ p: NOW, js: NOW, a: NOW - 1 * DAY }, ["p"]));
  assert.deepEqual(ids(r), ["a"]);
  assert.equal(r[0].url, "https://a.example/");
});

test("입력 객체를 그대로 담고, 입력을 바꾸지 않고, 같은 입력은 같은 결과", () => {
  const s = stored(OPENED);
  const before = JSON.stringify([BMS, TOP, s]);
  const r = pick(BMS, TOP, s);
  assert.equal(r[0], BMS[1]);
  assert.equal(JSON.stringify([BMS, TOP, s]), before);
  assert.deepEqual(ids(pick(BMS, TOP, s)), ids(r));
});
