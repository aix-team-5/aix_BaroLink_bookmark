// 담당: 팀원 B · 이슈 #8 · 명세: N25, N26 (F04)
// 잊고 있던 북마크 고르기. 계산만 한다 (현재 시각도 입력으로 받는다).

const DAY = 24 * 60 * 60 * 1000;
const FORGOTTEN_AFTER = 30 * DAY;

// N25: 마지막으로 연 시각과 그 출처. source는 "us" | "chrome" | "added"
// lastOpenedByUs와 dateLastUsed 중 더 최근 값, 둘 다 없으면 dateAdded (F04-03)
// 두 값이 같으면 우리 기록("us")을 따른다 (명세에 없어 정함). source가 "added"이면 화면에 "연 기록 없음" (F04-12)
export function lastOpened(bookmark, stored) {
  const us = stored?.lastOpenedByUs?.[String(bookmark.id)];
  const chrome = bookmark.dateLastUsed;
  const hasUs = Number.isFinite(us);
  const hasChrome = Number.isFinite(chrome);
  if (hasUs && (!hasChrome || us >= chrome)) return { time: us, source: "us" };
  if (hasChrome) return { time: chrome, source: "chrome" };
  return { time: bookmark.dateAdded, source: "added" };
}

// javascript:·chrome:// 주소는 후보에서 뺀다 (F04-02)
function isExcludedUrl(url) {
  const lower = String(url ?? "").trim().toLowerCase();
  return lower.startsWith("javascript:") || lower.startsWith("chrome://");
}

// N26: 30일 이상 안 연 북마크를 오래 안 연 순으로 고른다 (화면은 앞의 8개만 표시)
// 위치와 관계없이 고르고(F04-01), 고정·"이제 안 봐도 됨"·javascript:·chrome://은 뺀다(F04-02)
// 저장한 지 7일이 안 된 북마크는 30일 조건에 이미 포함된다. 후보는 모두 돌려준다(8개로 자르는 것은 화면이 한다)
// 마지막으로 연 시각이 같으면 들어온 순서를 지킨다. 받은 북마크 객체를 그대로 돌려준다
export function pickForgotten(bookmarks, stored, now) {
  const pinned = new Set((stored?.pinned ?? []).map(String));
  const dismissed = stored?.dismissed ?? {};
  const candidates = [];
  for (const bookmark of bookmarks) {
    const id = String(bookmark.id);
    if (pinned.has(id) || Object.hasOwn(dismissed, id) || isExcludedUrl(bookmark.url)) continue;
    const { time } = lastOpened(bookmark, stored);
    // 시각을 알 수 없으면(dateAdded도 없음) 고르지 않는다
    if (!Number.isFinite(time) || now - time < FORGOTTEN_AFTER) continue;
    candidates.push({ bookmark, time });
  }
  return candidates.sort((a, b) => a.time - b.time).map((c) => c.bookmark);
}
