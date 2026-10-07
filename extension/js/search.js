// 담당: 팀원 D · 이슈 #18 · 명세: N27, N28, N29 (F11, F14) · 크롬 API: C17, C18
// 웹 검색창과 북마크 검색. 두 검색창은 연동하지 않는다.

// N27: 제목 · 주소 부분 일치(대소문자 무시). 빈 입력이면 빈 배열
export function searchBookmarks(query, bookmarks) {
  return [];
}

// N28: http(s)://로 시작하거나 띄어쓰기 없이 점이 있으면 true
export function isUrlLike(text) {
  return false;
}

// N29: 주소면 이동, 아니면 기본 검색엔진으로 검색. 빈 입력이면 아무것도 하지 않는다
export async function runWebSearch(text) {}
