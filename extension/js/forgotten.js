// 담당: 팀원 B · 이슈 #8 · 명세: N25, N26 (F04)
// 잊고 있던 북마크 고르기. 계산만 한다 (현재 시각도 입력으로 받는다).

// N25: 마지막으로 연 시각과 그 출처. source는 "us" | "chrome" | "added"
export function lastOpened(bookmark, stored) {
  return { time: 0, source: "added" };
}

// N26: 30일 이상 안 연 북마크를 오래 안 연 순으로 고른다 (화면은 앞의 8개만 표시)
export function pickForgotten(bookmarks, stored, now) {
  return [];
}
