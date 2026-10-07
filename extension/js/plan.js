// 담당: 팀원 C · 이슈 #11 · 명세: N19, N20, N21, N37 (F05, F06, F09, F10)
// 정리 대상과 폴더 계획. 계산만 한다 (크롬 API를 쓰지 않고, 필요한 값은 모두 입력으로 받는다).

// 크롬의 가져오기 폴더 이름. 크롬이 가져오기 폴더에 따로 표시를 남기지 않아 이름으로 판단한다 (F05-04, v12).
// 북마크바·기타 북마크·모바일 북마크 바로 아래에 있는 폴더에만 적용한다. 언어마다 이름이 달라 목록으로 관리한다.
// "가져온 북마크"만 실제 크롬에서 확인했다(10월 7일). 나머지는 확인한 뒤에 추가한다:
//   영어 크롬의 "Imported", 다른 브라우저에서 가져온 경우("Imported From …", "…에서 가져옴"), 이름 뒤에 붙는 " (1)" 같은 번호
const IMPORT_FOLDER_NAMES = ["가져온 북마크"];

// N19: 정리 대상 북마크를 고른다. options: { 북마크바 제외, 포함할 사용자 폴더 }
// 크롬의 가져오기 폴더 바로 아래의 북마크도 대상에 넣는다. 가져오기 폴더 안의 폴더는 사용자 폴더로 본다 (F05-04, v12)
export function getTargets(tree, stored, options, now) {
  return [];
}

// N20: 폴더 계획을 세운다
// 출력: { type: "folders", folders: [{ name, items, reasons }], rest } 또는 { type: "pin", reason }
export function makePlan(targets, categories) {
  return { type: "pin", reason: "" };
}

// N21: 고정 후보 최대 5개. 자주 방문한 사이트와 호스트가 같은 북마크 먼저, 부족하면 최근에 연 순
export function pickPinCandidates(bookmarks, topSites, stored) {
  return [];
}

// N37: 폴더 밖에 같은 카테고리가 3개 이상 모이면 새 폴더를 제안. 출력: [{ name, items }]
export function suggestNewFolders(tree, stored, categories) {
  return [];
}
