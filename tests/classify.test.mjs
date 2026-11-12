// extension/js/classify.js 테스트 (팀원 B · 이슈 #7)
// 실행: node --test "tests/*.test.mjs"   (Node 20 이상. 따옴표가 필요하다)
// classify.js는 크롬 API를 쓰지 않으므로 진짜 categories.json과 정답지로 바로 확인한다.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { classify, measure, suggestForNew } from "../extension/js/classify.js";

const categories = JSON.parse(readFileSync(new URL("../extension/data/categories.json", import.meta.url), "utf8"));
const answerKey = JSON.parse(readFileSync(new URL("./answer-key-100.json", import.meta.url), "utf8"));

const GITHUB = { id: "1", url: "https://github.com/", title: "GitHub" };
const DEV = classify(GITHUB, categories).category;

test("measure: 정답지 100개 → 적용률 0.89, 정확도 1, 틀린 것 61번 (answer-key-100.md 목표)", () => {
  const { coverage, accuracy, wrong } = measure(answerKey, answerKey, categories);
  assert.equal(coverage, 0.89);
  assert.equal(accuracy, 1);
  assert.deepEqual(wrong.map((w) => w.id), [61]);
});

test("classify: http·https가 아닌 주소는 제목 키워드가 맞아도 분류하지 않는다", () => {
  const title = "개발 코딩 쇼핑 GitHub";
  for (const url of ["chrome://settings", "javascript:alert(1)", "file:///C:/a.html", "chrome-extension://abc/x.html", "ftp://github.com/", "about:blank", "주소 아님"]) {
    assert.deepEqual(classify({ url, title }, categories), { category: null }, url);
  }
});

test("classify: http와 https는 같은 결과", () => {
  assert.deepEqual(classify({ url: "http://github.com/x", title: "" }, categories), classify({ url: "https://github.com/", title: "" }, categories));
});

test("suggestForNew: 분류된 카테고리와 이름이 같은 폴더를 추천하고, 없으면 null (N24, F10-07)", () => {
  const folders = [
    { id: "f1", title: DEV, rootType: "bar" },
    { id: "f3", title: "다른 이름", rootType: "bar" },
  ];
  const newBookmarks = [
    GITHUB,
    { id: "2", url: "https://namu.wiki/", title: "나무위키" }, // 분류하지 않는 사이트
    { id: "3", url: "https://example.invalid/", title: "아무거나" }, // 분류 안 됨
    { id: "4", url: "chrome://settings", title: "개발 설정" }, // http·https 아님
  ];
  assert.deepEqual(suggestForNew(newBookmarks, folders, categories), [
    { bookmarkId: "1", folderId: "f1" },
    { bookmarkId: "2", folderId: null },
    { bookmarkId: "3", folderId: null },
    { bookmarkId: "4", folderId: null },
  ]);
});

test("suggestForNew: 같은 이름 폴더가 여럿이면 앞의 것, 관리자 폴더는 추천하지 않는다", () => {
  const folders = [
    { id: "m1", title: DEV, rootType: "managed" },
    { id: "f1", title: DEV, rootType: "bar" },
    { id: "f2", title: DEV, rootType: "other" },
  ];
  assert.deepEqual(suggestForNew([GITHUB], folders, categories), [{ bookmarkId: "1", folderId: "f1" }]);
  assert.deepEqual(suggestForNew([GITHUB], [folders[0]], categories), [{ bookmarkId: "1", folderId: null }]);
});

test("suggestForNew: 폴더 이름이 다르거나 폴더가 없으면 null, 새 북마크가 없으면 빈 배열", () => {
  assert.deepEqual(suggestForNew([GITHUB], [{ id: "f1", title: `${DEV} 공부`, rootType: "bar" }], categories), [{ bookmarkId: "1", folderId: null }]);
  assert.deepEqual(suggestForNew([GITHUB], [], categories), [{ bookmarkId: "1", folderId: null }]);
  assert.deepEqual(suggestForNew([], [{ id: "f1", title: DEV, rootType: "bar" }], categories), []);
});

test("suggestForNew: 입력 순서를 지키고 입력을 바꾸지 않는다", () => {
  const newBookmarks = [
    { id: "3", url: "https://example.invalid/", title: "아무거나" },
    GITHUB,
  ];
  const before = JSON.stringify(newBookmarks);
  const result = suggestForNew(newBookmarks, [{ id: "f1", title: DEV, rootType: "bar" }], categories);
  assert.deepEqual(result.map((r) => r.bookmarkId), ["3", "1"]);
  assert.equal(JSON.stringify(newBookmarks), before);
});
