// extension/js/plan.js 테스트 (팀원 C · 이슈 #11)
// 실행: node --test "tests/*.test.mjs"   (Node 20 이상. 따옴표가 필요하다)
// plan.js는 계산만 하므로 가짜 chrome 없이 바로 불러 쓴다.
// 크롬 콘솔 확인은 tests/console-checks.md C-N21

import { test } from "node:test";
import assert from "node:assert/strict";
import { pickPinCandidates as pick } from "../extension/js/plan.js";

// 시각은 Date.now() 대신 고정값을 쓴다
const NOW = Date.UTC(2026, 10, 12);
const DAY = 24 * 60 * 60 * 1000;

// 가짜 북마크와 저장 값
const bm = (id, url, extra = {}) => ({ id, title: id, url, parentId: "1", index: 0, dateAdded: NOW - 400 * DAY, ...extra });
const stored = (lastOpenedByUs = {}, pinned = []) => ({ pinned, lastOpenedByUs, dismissed: {}, handledNew: [] });
const ids = (r) => r.map((b) => b.id);
const top = (...urls) => urls.map((url) => ({ url, title: url }));

// 기본 입력 (tests/console-checks.md C-N21과 같다)
const BMS = [
  bm("g1", "https://github.com/a"),
  bm("y1", "https://www.youtube.com/x"),
  bm("n1", "https://naver.com/"),
  bm("c1", "https://www.coupang.com/"),
  bm("t1", "https://a.tistory.com/1"),
  bm("i1", "https://www.inflearn.com/"),
  bm("z1", "https://zz.example/"),
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
  const list = [bm("a", "https://a.tistory.com/1"), bm("b", "https://WWW.Example.com/x"), bm("p", "http://localhost:8080/")];
  assert.deepEqual(ids(pick(list, top("https://tistory.com/"), stored())), []);
  assert.deepEqual(ids(pick(list, top("https://example.com/"), stored())), ["b"]);
  assert.deepEqual(ids(pick(list, top("http://localhost:3000/"), stored())), ["p"]);
});

test("http·https가 아닌 주소와 잘못된 topSites 항목은 건너뛴다", () => {
  const list = [bm("e", "chrome-extension://abc/newtab.html"), bm("f", "file:///C:/a.html"), bm("g", "https://github.com/")];
  const sites = [{ url: "chrome-extension://abc/newtab.html" }, { url: "file:///C:/a.html" }, { url: "아무거나" }, {}, null, { url: "https://github.com/" }];
  assert.deepEqual(ids(pick(list, sites, stored())), ["g"]);
});

test("자주 방문한 사이트 단계(①)에서는 사이트 하나에 북마크 하나. 같은 호스트가 여럿이면 최근에 연 것, 나머지는 ②단계(최근에 연 순)에서 다시 들어올 수 있다", () => {
  const list = [bm("g1", "https://github.com/a"), bm("g2", "https://github.com/b"), bm("g3", "https://github.com/c"), bm("n1", "https://naver.com/")];
  const opened = { g1: NOW - 9 * DAY, g2: NOW - 2 * DAY, n1: NOW - 5 * DAY };
  assert.deepEqual(ids(pick(list, top("https://github.com/"), stored(opened))), ["g2", "n1", "g1"]);
  assert.deepEqual(ids(pick(list, top("https://github.com/", "https://www.github.com/x"), stored())), ["g1"]);
});

test("자주 방문한 사이트로 5개가 차면 최근에 연 것은 넣지 않는다", () => {
  const list = ["a", "b", "c", "d", "e", "f"].map((x) => bm(x, `https://${x}.example/`));
  const sites = top(...["f", "e", "d", "c", "b", "a"].map((x) => `https://${x}.example/`));
  assert.deepEqual(ids(pick(list, sites, stored({ a: NOW }))), ["f", "e", "d", "c", "b"]);
});

test("F04-03 dateLastUsed도 연 시각으로 보고, 둘 다 있으면 더 최근 값", () => {
  const list = [
    bm("bar", "https://a.example/", { dateLastUsed: NOW - 1 * DAY }),
    bm("ours", "https://b.example/"),
    bm("both", "https://c.example/", { dateLastUsed: NOW - 30 * DAY }),
  ];
  assert.deepEqual(ids(pick(list, [], stored({ ours: NOW - 2 * DAY, both: NOW - 3 * DAY }))), ["bar", "ours", "both"]);
  assert.deepEqual(ids(pick(list, [], stored())), ["bar", "both"]);
});

test("연 시각이 같으면 입력 순서", () => {
  const list = [bm("x", "https://x.example/"), bm("y", "https://y.example/"), bm("z", "https://z.example/")];
  assert.deepEqual(ids(pick(list, [], stored({ z: 5, y: 5, x: 5 }))), ["x", "y", "z"]);
});

test("이미 고정한 것, javascript: 북마크, 같은 id의 두 번째는 뺀다", () => {
  const list = [
    bm("p", "https://p.example/"),
    bm("js", " JavaScript:alert(1)"),
    bm("a", "https://a.example/"),
    bm("a", "https://a.example/dup"),
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
