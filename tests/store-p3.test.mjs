// extension/js/store.js P3 테스트 (팀원 A · 이슈 #3 · 명세: N51~N53, F18-12·14)
// 실행: node --test "tests/*.test.mjs"   (Node 20 이상. 따옴표가 필요하다)
// store.test.mjs와 같은 가짜 chrome.storage.local을 쓴다. 여기에 remove와, 부르면 기록되는 storage.sync를 더했다.
// 쓰는 쪽: globalThis.document가 있으면 새 탭, 없으면 서비스 워커로 본다.

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

let data = {};
// 다음 set에서 낼 오류 (저장 공간 부족 흉내)
let failNextSet = null;
// storage.sync를 부른 기록 (F18-12: 한 번도 부르면 안 된다)
const syncCalls = [];
const delay = () => new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 4)));

const syncArea = {};
for (const name of ["get", "set", "remove", "clear", "getBytesInUse"]) {
  syncArea[name] = async (...args) => {
    syncCalls.push(name);
    return {};
  };
}

globalThis.chrome = {
  storage: {
    local: {
      async get(keys) {
        await delay();
        let list;
        if (keys === undefined || keys === null) list = Object.keys(data);
        else if (typeof keys === "string") list = [keys];
        else if (Array.isArray(keys)) list = keys;
        else list = Object.keys(keys);
        const out = {};
        for (const key of list) {
          if (Object.hasOwn(data, key)) out[key] = structuredClone(data[key]);
        }
        return out;
      },
      async set(items) {
        await delay();
        if (failNextSet) {
          const error = failNextSet;
          failNextSet = null;
          throw error;
        }
        for (const [key, value] of Object.entries(items)) data[key] = structuredClone(value);
      },
      async remove(keys) {
        await delay();
        for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key];
      },
    },
    sync: syncArea,
  },
};

const store = await import("../extension/js/store.js");

const asNewTab = () => { globalThis.document = {}; };
const asWorker = () => { delete globalThis.document; };

const DEFAULT_APPEARANCE = { accent: "violet", wallpaper: "cloud", font: "system", avatarPreset: null };
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQ==";

beforeEach(() => {
  data = {};
  failNextSet = null;
  asNewTab();
});

// 1. load의 appearance (F18-14)
test("load: appearance가 없으면 기본값", async () => {
  const all = await store.load();
  assert.deepEqual(all.appearance, DEFAULT_APPEARANCE);
});

test("load: appearance가 문자열·배열·null이면 오류 없이 기본값", async () => {
  for (const broken of ["x", ["rose"], null, 7]) {
    data.appearance = broken;
    const all = await store.load();
    assert.deepEqual(all.appearance, DEFAULT_APPEARANCE, `저장된 값: ${JSON.stringify(broken)}`);
  }
});

test("load: 키가 빠지면 기본값으로 채우고, 네 키 밖의 키는 버린다", async () => {
  data.appearance = { accent: "rose", extra: 1 };
  const all = await store.load();
  assert.deepEqual(all.appearance, { ...DEFAULT_APPEARANCE, accent: "rose" });
});

test("load: 목록에 없는 값도 그대로 둔다 (목록 검사는 applyAppearance가 한다, N51)", async () => {
  data.appearance = { accent: "gold", wallpaper: "deleted", font: "comic", avatarPreset: "a9" };
  const all = await store.load();
  assert.deepEqual(all.appearance, { accent: "gold", wallpaper: "deleted", font: "comic", avatarPreset: "a9" });
});

test("load: 돌려받은 appearance를 고쳐도 기본값은 그대로", async () => {
  const first = await store.load();
  first.appearance.accent = "ink";
  const second = await store.load();
  assert.deepEqual(second.appearance, DEFAULT_APPEARANCE);
});

// 2. setAppearance (N51)
test("setAppearance: 넘긴 키만 바꾸고 나머지는 그대로, 저장된 전체 값을 돌려준다", async () => {
  const first = await store.setAppearance({ accent: "rose" });
  assert.deepEqual(first, { ...DEFAULT_APPEARANCE, accent: "rose" });
  const second = await store.setAppearance({ wallpaper: "photo", font: "serif" });
  assert.deepEqual(second, { accent: "rose", wallpaper: "photo", font: "serif", avatarPreset: null });
  assert.deepEqual(data.appearance, second);
  assert.deepEqual((await store.load()).appearance, second);
});

test("setAppearance: 모르는 키와 undefined 값은 버린다", async () => {
  const result = await store.setAppearance({ accent: "teal", color: "red", font: undefined });
  assert.deepEqual(result, { ...DEFAULT_APPEARANCE, accent: "teal" });
  assert.deepEqual(data.appearance, result);
});

test("setAppearance: avatarPreset을 null로 되돌릴 수 있다", async () => {
  await store.setAppearance({ avatarPreset: "a1" });
  const result = await store.setAppearance({ avatarPreset: null });
  assert.equal(result.avatarPreset, null);
});

test("setAppearance: 저장된 값이 망가져 있으면(\"x\") 기본값 위에 합친다", async () => {
  data.appearance = "x";
  const result = await store.setAppearance({ accent: "rose" });
  assert.deepEqual(result, { ...DEFAULT_APPEARANCE, accent: "rose" });
  assert.deepEqual(data.appearance, result);
});

test("setAppearance: 저장된 값에 모르는 키가 있으면 버리고 저장한다", async () => {
  data.appearance = { accent: "blue", old: true };
  const result = await store.setAppearance({ font: "gothic" });
  assert.deepEqual(result, { ...DEFAULT_APPEARANCE, accent: "blue", font: "gothic" });
  assert.deepEqual(data.appearance, result);
});

test("setAppearance: 동시에 불러도 바꾼 키가 모두 남는다", async () => {
  await Promise.all([
    store.setAppearance({ accent: "navy" }),
    store.setAppearance({ wallpaper: "mint" }),
    store.setAppearance({ font: "serif" }),
    store.setAppearance({ avatarPreset: "a2" }),
  ]);
  assert.deepEqual(data.appearance, { accent: "navy", wallpaper: "mint", font: "serif", avatarPreset: "a2" });
});

test("setAppearance: patch가 객체가 아니면 오류이고 저장하지 않는다", async () => {
  for (const bad of [undefined, null, "rose", 1, ["rose"]]) {
    await assert.rejects(() => store.setAppearance(bad), /setAppearance/, `patch: ${JSON.stringify(bad)}`);
  }
  assert.equal(Object.hasOwn(data, "appearance"), false);
});

test("setAppearance: 서비스 워커에서 부르면 오류이고 저장하지 않는다", async () => {
  asWorker();
  await assert.rejects(() => store.setAppearance({ accent: "rose" }), /새 탭만/);
  assert.equal(Object.hasOwn(data, "appearance"), false);
});

// 3. setPhoto (N52)
test("setPhoto: profile → profilePhoto, wallpaper → wallpaperPhoto", async () => {
  await store.setPhoto("profile", PNG);
  await store.setPhoto("wallpaper", JPEG);
  assert.equal(data.profilePhoto, PNG);
  assert.equal(data.wallpaperPhoto, JPEG);
});

test("setPhoto: 새로 올리면 앞의 사진을 바꾼다", async () => {
  await store.setPhoto("wallpaper", PNG);
  await store.setPhoto("wallpaper", JPEG);
  assert.equal(data.wallpaperPhoto, JPEG);
});

test("setPhoto: null이면 키를 지우지 않고 null을 저장한다. 다른 사진은 그대로", async () => {
  await store.setPhoto("profile", PNG);
  await store.setPhoto("wallpaper", JPEG);
  await store.setPhoto("profile", null);
  assert.equal(Object.hasOwn(data, "profilePhoto"), true);
  assert.equal(data.profilePhoto, null);
  assert.equal(data.wallpaperPhoto, JPEG);
});

test("setPhoto: 잘못된 kind면 오류이고 저장하지 않는다", async () => {
  for (const bad of ["avatar", "Profile", "", undefined, null]) {
    await assert.rejects(() => store.setPhoto(bad, PNG), /kind/, `kind: ${bad}`);
  }
  assert.deepEqual(data, {});
});

test("setPhoto: data:image/로 시작하지 않으면 오류이고 저장하지 않는다", async () => {
  const bads = ["", "x", "data:text/plain;base64,aGk=", "https://example.com/a.png", undefined, 123, {}];
  for (const bad of bads) {
    await assert.rejects(() => store.setPhoto("profile", bad), /data:image/, `dataUrl: ${String(bad)}`);
  }
  assert.deepEqual(data, {});
});

test("setPhoto: 저장 공간 부족으로 저장에 실패하면 그 오류가 그대로 전달되고 값은 그대로", async () => {
  await store.setPhoto("wallpaper", PNG);
  const quota = new Error("QUOTA_BYTES quota exceeded");
  failNextSet = quota;
  await assert.rejects(() => store.setPhoto("wallpaper", JPEG), (error) => error === quota);
  assert.equal(data.wallpaperPhoto, PNG);
  // 실패한 뒤에도 다음 저장은 된다
  await store.setPhoto("wallpaper", JPEG);
  assert.equal(data.wallpaperPhoto, JPEG);
});

test("setPhoto: 서비스 워커에서 부르면 오류이고 저장하지 않는다", async () => {
  asWorker();
  await assert.rejects(() => store.setPhoto("profile", PNG), /새 탭만/);
  assert.deepEqual(data, {});
});

// 4. load에는 사진이 없다 (N08·N53)
test("load: setPhoto 뒤에도 결과에 사진 키가 없다", async () => {
  await store.setPhoto("profile", PNG);
  await store.setPhoto("wallpaper", JPEG);
  const all = await store.load();
  assert.equal(Object.hasOwn(all, "profilePhoto"), false);
  assert.equal(Object.hasOwn(all, "wallpaperPhoto"), false);
  assert.equal(Object.keys(all).length, 11);
});

test("load: 사진 키를 저장소에서 읽지 않는다 (넘긴 키에 사진 키가 없고, 전부 읽기도 아니다)", async () => {
  await store.setPhoto("profile", PNG);
  await store.setPhoto("wallpaper", JPEG);
  const original = chrome.storage.local.get;
  const asked = [];
  chrome.storage.local.get = async (keys) => {
    asked.push(keys);
    return original(keys);
  };
  try {
    await store.load();
  } finally {
    chrome.storage.local.get = original;
  }
  assert.equal(asked.length, 1);
  const keys = asked[0];
  assert.notEqual(keys, null);
  assert.notEqual(keys, undefined);
  assert.ok(Array.isArray(keys), "키 배열을 넘겨야 한다");
  assert.equal(keys.includes("profilePhoto"), false);
  assert.equal(keys.includes("wallpaperPhoto"), false);
  assert.equal(keys.includes("appearance"), true);
});

// 5. loadPhotos (N53)
test("loadPhotos: 둘 다 없으면 둘 다 null", async () => {
  assert.deepEqual(await store.loadPhotos(), { profilePhoto: null, wallpaperPhoto: null });
});

test("loadPhotos: 하나만 있으면 다른 하나는 null", async () => {
  await store.setPhoto("wallpaper", JPEG);
  assert.deepEqual(await store.loadPhotos(), { profilePhoto: null, wallpaperPhoto: JPEG });
});

test("loadPhotos: setPhoto(kind, null) 뒤에는 null", async () => {
  await store.setPhoto("profile", PNG);
  await store.setPhoto("profile", null);
  assert.deepEqual(await store.loadPhotos(), { profilePhoto: null, wallpaperPhoto: null });
});

test("loadPhotos: await 없이 setPhoto를 부른 바로 뒤에도 새 사진을 읽는다", async () => {
  store.setPhoto("profile", PNG);
  assert.deepEqual(await store.loadPhotos(), { profilePhoto: PNG, wallpaperPhoto: null });
});

test("loadPhotos: 사진 두 키만 읽는다 (load()를 부르지 않는다)", async () => {
  const original = chrome.storage.local.get;
  const asked = [];
  chrome.storage.local.get = async (keys) => {
    asked.push(keys);
    return original(keys);
  };
  try {
    await store.loadPhotos();
  } finally {
    chrome.storage.local.get = original;
  }
  assert.deepEqual(asked, [["profilePhoto", "wallpaperPhoto"]]);
});

// 6. WRITER 표
test("update: appearance·profilePhoto·wallpaperPhoto는 새 탭에서 쓸 수 있고, 서비스 워커에서는 오류", async () => {
  await store.update("appearance", (appearance) => ({ ...appearance, font: "gothic" }));
  await store.update("profilePhoto", () => PNG);
  await store.update("wallpaperPhoto", () => null);
  assert.equal(data.appearance.font, "gothic");
  assert.equal(data.profilePhoto, PNG);
  assert.equal(data.wallpaperPhoto, null);
  asWorker();
  for (const key of ["appearance", "profilePhoto", "wallpaperPhoto"]) {
    await assert.rejects(() => store.update(key, () => null), /새 탭만/);
  }
});

// 6-1. 키를 도는 다른 함수가 꾸미기·사진을 건드리지 않는다
test("snapshotStored·restoreStored(삭제 되돌리기)는 appearance와 사진을 지우거나 되돌리지 않는다", async () => {
  await store.setAppearance({ accent: "rose", wallpaper: "photo" });
  await store.setPhoto("profile", PNG);
  await store.setPhoto("wallpaper", JPEG);
  await store.pin("10");
  await store.recordOpened("10");
  const snap = await store.snapshotStored("10");
  // 지운 뒤 꾸미기를 바꾸고, 그다음 되돌린다
  await store.setAppearance({ font: "serif" });
  await store.setPhoto("profile", null);
  await store.restoreStored("20", snap);
  assert.deepEqual(data.appearance, { accent: "rose", wallpaper: "photo", font: "serif", avatarPreset: null });
  assert.equal(data.profilePhoto, null);
  assert.equal(data.wallpaperPhoto, JPEG);
});

test("cleanupMissing·purgeWorkerKeys는 appearance와 사진을 건드리지 않는다", async () => {
  await store.setAppearance({ accent: "ink" });
  await store.setPhoto("wallpaper", JPEG);
  await store.pin("1");
  const before = structuredClone({ appearance: data.appearance, wallpaperPhoto: data.wallpaperPhoto });
  assert.equal(await store.cleanupMissing(new Set(["2"])), 1);
  asWorker();
  await store.addNew("3");
  await store.purgeWorkerKeys(["3"]);
  assert.deepEqual({ appearance: data.appearance, wallpaperPhoto: data.wallpaperPhoto }, before);
  assert.equal(Object.hasOwn(data, "profilePhoto"), false);
});

// 7. storage.sync는 쓰지 않는다 (F18-12). 파일의 마지막 테스트라 앞의 모든 테스트가 끝난 뒤에 확인한다
test("F18-12: 이 파일의 모든 호출에서 storage.sync를 한 번도 부르지 않았다", async () => {
  await store.setAppearance({ accent: "green" });
  await store.setPhoto("profile", PNG);
  await store.loadPhotos();
  await store.load();
  assert.deepEqual(syncCalls, []);
});
