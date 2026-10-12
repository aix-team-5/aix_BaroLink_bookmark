// PR 자동 검사. 담당: 팀원 A
// 실행: node .github/scripts/check.mjs  (GitHub Actions가 PR마다 실행한다. 각자 PC에서 돌릴 필요는 없다)
// "main은 언제 받아도 크롬에 오류 없이 올라간다"를 지키기 위한 최소한의 검사다. 동작이 명세와 맞는지는 사람이 눌러 본다.
import { readFileSync, existsSync, mkdtempSync, cpSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname, resolve, relative } from "node:path";

const EXT = "extension";
const errors = [];
const fail = (where, message) => errors.push(`${where}: ${message}`);
const read = (path) => readFileSync(path, "utf8");

// 명세 'API_내부 함수' 시트(v14)의 함수. 함수를 추가하거나 이름을 바꾸면 명세와 함께 이 목록도 고친다.
const EXPECTED = {
  "js/bookmarks.js": ["loadTree", "createFolder", "moveBookmark", "renameFolder", "deleteFolderKeepChildren", "openBookmark", "faviconUrl", "hasFavicon"],
  "js/store.js": ["load", "update", "recordOpened", "pin", "unpin", "dismiss", "undismiss", "markManualMove", "setPending", "isPending", "addHistory", "markUndone", "cleanupMissing", "setFirstCard", "markHandledNew", "addNew", "removeNew", "purgeWorkerKeys"],
  "js/organize.js": ["applyPlan", "undo"],
  "js/classify.js": ["classify", "measure", "suggestForNew"],
  "js/forgotten.js": ["lastOpened", "pickForgotten"],
  "js/plan.js": ["getTargets", "makePlan", "pickPinCandidates", "suggestNewFolders"],
  "js/topic.js": ["suggestSubfolders"],
  "js/render.js": ["renderAll"],
  "js/ui.js": ["appIcon", "showToast", "icon"],
  "js/search.js": ["searchBookmarks", "isUrlLike", "runWebSearch"],
  "js/dnd.js": ["initDnd"],
  "js/view/cards.js": ["showFirstCard", "showOrganizeDialog", "showPinPicker"],
  "js/view/folders.js": ["showFolders", "openFolderPopup", "showContextMenu"],
  "js/view/forgottenFolder.js": ["showForgotten"],
  "js/view/history.js": ["showResultNotice", "showHistory"],
};

function listFiles(dir, ext) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "lib" ? [] : listFiles(path, ext);
    return path.endsWith(ext) ? [path] : [];
  });
}

function exportsOf(source) {
  const names = new Set();
  for (const m of source.matchAll(/export\s+(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of source.matchAll(/export\s+(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of source.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop();
      if (name) names.add(name);
    }
  }
  return names;
}

// 1. JSON 파일이 읽히는가
function readJson(path) {
  try {
    return JSON.parse(read(path));
  } catch (e) {
    fail(path, `JSON으로 읽을 수 없다 (${e.message})`);
    return null;
  }
}
const manifest = readJson(`${EXT}/manifest.json`);
if (manifest) {
  if (manifest.manifest_version !== 3) fail("manifest.json", "manifest_version은 3이어야 한다");
  for (const path of [manifest.chrome_url_overrides?.newtab, manifest.background?.service_worker]) {
    if (!path || !existsSync(`${EXT}/${path}`)) fail("manifest.json", `가리키는 파일이 없다: ${path}`);
  }
}

// 2. 분류표의 형태
const table = readJson(`${EXT}/data/categories.json`);
if (table) {
  const where = "categories.json";
  const seen = new Map();
  const checkSite = (site, owner) => {
    if (typeof site !== "string" || site !== site.toLowerCase() || site.startsWith("www.") || /[\/\s]/.test(site)) {
      fail(where, `주소는 www.를 뗀 소문자 호스트만 적는다: "${site}" (${owner})`);
    }
    if (seen.has(site)) fail(where, `같은 주소가 두 번 나온다: "${site}" (${seen.get(site)}, ${owner})`);
    seen.set(site, owner);
  };
  if (!Array.isArray(table.categories)) fail(where, "categories 배열이 없다");
  for (const category of table.categories ?? []) {
    for (const key of ["sites", "suffixes", "keywords"]) {
      if (!Array.isArray(category[key])) fail(where, `"${category.name}"에 ${key} 배열이 없다`);
    }
    if (!category.name) fail(where, "name이 없는 카테고리가 있다");
    for (const site of category.sites ?? []) checkSite(site, category.name);
  }
  if (!Array.isArray(table.noCategorySites)) fail(where, "noCategorySites 배열이 없다");
  for (const site of table.noCategorySites ?? []) checkSite(site, "분류하지 않는 사이트");

  // 정답지의 카테고리 이름이 분류표에 있는가
  const answersPath = "tests/answer-key-100.json";
  if (existsSync(answersPath)) {
    const answers = readJson(answersPath);
    const names = new Set((table.categories ?? []).map((c) => c.name));
    for (const row of answers ?? []) {
      if (row.answer !== null && !names.has(row.answer)) fail(answersPath, `${row.id}번의 정답 "${row.answer}"가 분류표에 없는 카테고리다`);
    }
  }
}

// 3. JavaScript 문법 (ES 모듈로 검사)
const jsFiles = listFiles(EXT, ".js");
const temp = mkdtempSync(join(tmpdir(), "check-"));
cpSync(EXT, temp, { recursive: true });
writeFileSync(join(temp, "package.json"), '{"type":"module"}');
for (const file of jsFiles) {
  try {
    execFileSync(process.execPath, ["--check", join(temp, relative(EXT, file))], { stdio: "pipe" });
  } catch (e) {
    const lines = String(e.stderr).trim().split("\n");
    fail(file, `문법 오류 (${lines.find((line) => line.includes("Error")) ?? lines[0]})`);
  }
}

// 4. 명세의 함수가 빠지지 않았는가
const exported = new Map(jsFiles.map((file) => [resolve(file), exportsOf(read(file))]));
for (const [file, names] of Object.entries(EXPECTED)) {
  const path = resolve(EXT, file);
  if (!exported.has(path)) {
    fail(file, "파일이 없다");
    continue;
  }
  for (const name of names) {
    if (!exported.get(path).has(name)) fail(file, `명세의 함수 ${name}이(가) export되어 있지 않다`);
  }
}

// 5. import한 파일과 이름이 실제로 있는가 (하나라도 없으면 새 탭 전체가 빈 화면이 된다)
for (const file of jsFiles) {
  const source = read(file);
  for (const m of source.matchAll(/import\s+([^'"]*?)\s+from\s+["']([^"']+)["']/g)) {
    const [, clause, spec] = m;
    if (!spec.startsWith(".") && !spec.startsWith("/")) {
      fail(file, `상대 경로가 아닌 import는 쓸 수 없다 (빌드 도구 없음): "${spec}"`);
      continue;
    }
    const target = spec.startsWith("/") ? resolve(EXT, "." + spec) : resolve(dirname(file), spec);
    if (!existsSync(target)) {
      fail(file, `import한 파일이 없다: "${spec}"`);
      continue;
    }
    const braces = clause.match(/\{([^}]*)\}/);
    if (!braces || !exported.has(target)) continue;
    for (const part of braces[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/)[0];
      if (name && !exported.get(target).has(name)) fail(file, `"${spec}"에 ${name}이(가) export되어 있지 않다`);
    }
  }
}

// 6. HTML: 직접 쓴 스크립트와 외부 주소 금지 (MV3 제한)
for (const file of listFiles(EXT, ".html")) {
  const source = read(file);
  for (const m of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const src = m[1].match(/src\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!src && m[2].trim()) fail(file, "HTML 안에 스크립트를 직접 쓸 수 없다. .js 파일에 둔다");
    if (src && /^(https?:)?\/\//.test(src)) fail(file, `외부 스크립트를 불러올 수 없다: ${src}`);
    if (src && !/^(https?:)?\/\//.test(src) && !existsSync(resolve(dirname(file), src))) fail(file, `스크립트 파일이 없다: ${src}`);
  }
  for (const m of source.matchAll(/<link\b[^>]*href\s*=\s*["']((?:https?:)?\/\/[^"']+)["']/gi)) fail(file, `외부 파일을 불러올 수 없다: ${m[1]}`);
  if (/\son[a-z]+\s*=\s*["']/i.test(source)) fail(file, "onclick 같은 속성을 쓸 수 없다. addEventListener로 연결한다");
}

// 7. 넣지 않기로 한 것 (빌드 도구, 패키지, TypeScript, JSX)
const FORBIDDEN_NAMES = ["package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "tsconfig.json", "node_modules"];
const FORBIDDEN_EXT = [".ts", ".tsx", ".jsx"];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === ".git") continue;
    const path = join(dir, name);
    if (FORBIDDEN_NAMES.includes(name) || /^(vite|webpack|rollup)\.config\./.test(name)) {
      fail(path, "빌드 도구와 패키지는 쓰지 않는다. 이 파일을 지운다 (AGENTS.md 1번)");
      continue;
    }
    if (statSync(path).isDirectory()) walk(path);
    else if (path.startsWith(join("docs", "design"))) continue; // 확정 시안의 참고용 사본(React 코드)은 예외
    else if (FORBIDDEN_EXT.some((ext) => name.endsWith(ext))) fail(path, "TypeScript와 JSX는 쓰지 않는다. .js로 쓴다 (AGENTS.md 1번)");
  }
}
walk(".");

if (errors.length) {
  console.error(`검사에서 ${errors.length}개가 걸렸습니다.\n`);
  for (const line of errors) console.error(`  ✗ ${line}`);
  process.exit(1);
}
console.log(`검사 통과: JavaScript 파일 ${jsFiles.length}개, 명세의 함수 ${Object.values(EXPECTED).flat().length}개, 분류표 주소 ${table ? (table.categories ?? []).reduce((n, c) => n + c.sites.length, 0) : 0}개`);
