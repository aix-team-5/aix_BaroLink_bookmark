// 담당: 팀원 D · 이슈 #18 · 명세: N27, N28, N29 (F11, F14) · 크롬 API: C17, C18
// 웹 검색창과 북마크 검색. 두 검색창은 연동하지 않는다.

// N27: 제목 · 주소 부분 일치(대소문자 무시). 빈 입력이면 빈 배열
// 앞뒤 공백은 뺀다(공백만 있으면 빈 입력). 결과는 입력 북마크의 순서를 그대로 지킨다
export function searchBookmarks(query, bookmarks) {
  const keyword = String(query ?? "").trim().toLowerCase();
  if (keyword === "" || !Array.isArray(bookmarks)) return [];
  return bookmarks.filter((bookmark) => {
    const title = String(bookmark?.title ?? "").toLowerCase();
    const url = String(bookmark?.url ?? "").toLowerCase();
    return title.includes(keyword) || url.includes(keyword);
  });
}

// N28: http(s)://로 시작하거나 띄어쓰기 없이 점이 있으면 true
// 알려진 한계(명세): node.js처럼 점이 든 검색어도 주소로 본다
export function isUrlLike(text) {
  const value = String(text ?? "").trim();
  if (value === "") return false;
  if (/^https?:\/\//i.test(value)) return true;
  return !/\s/.test(value) && value.includes(".");
}

// 주소로 열 수 있는 http(s) 주소를 만든다. scheme이 없으면 https를 붙인다
// 만들 수 없거나(javascript: 등 다른 scheme, 잘못된 주소) http(s)가 아니면 null을 돌려주고, 그때는 검색어로 다룬다
function toWebUrl(text) {
  const candidate = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

// N29: 주소면 이동, 아니면 기본 검색엔진으로 검색. 빈 입력이면 아무것도 하지 않는다
// 크롬 호출이 실패하면 오류를 그대로 던진다(삼키지 않는다). 부르는 쪽(render.js)이 다룬다
export async function runWebSearch(text) {
  const value = String(text ?? "").trim();
  // 빈 입력이면 아무 일도 하지 않는다. chrome.search.query는 빈 text에서 "Empty text parameter" 오류가 난다 (C17)
  if (value === "") return;

  if (isUrlLike(value)) {
    const url = toWebUrl(value);
    if (url) {
      // 지금 탭을 그 주소로 옮긴다. 주소만 넘기는 용도는 tabs 권한이 필요 없다 (C18)
      const tab = await chrome.tabs.getCurrent();
      if (tab?.id !== undefined) await chrome.tabs.update(tab.id, { url });
      else await chrome.tabs.update({ url });
      return;
    }
  }

  // 사용자가 크롬에 정한 기본 검색엔진으로 지금 탭에서 검색한다. 검색엔진은 우리가 정하지 않는다 (C17)
  await chrome.search.query({ text: value, disposition: "CURRENT_TAB" });
}
