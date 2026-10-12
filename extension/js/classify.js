// 담당: 팀원 B · 이슈 #7 · 명세: N17, N18, N24 (F05, F10)
// 분류 규칙. 계산만 한다 (크롬 API를 쓰지 않고, 필요한 값은 모두 입력으로 받는다).

// N17: 분류표 → 주소 끝 → 제목 키워드 순서로 확인해 처음 맞는 곳에서 멈춘다
// 분류표 형태: { categories: [{ name, sites, suffixes, keywords }], noCategorySites: [] } (docs/category-definitions.md 10번)
// 주소가 noCategorySites에 맞으면 주소 끝과 제목 키워드를 보지 않고 { category: null }. 제목은 띄어쓰기를 없애지 않고 비교한다
// 출력: { category, step: "site" | "suffix" | "keyword", rule, needsCheck } 또는 { category: null }
export function classify(bookmark, categories) {
  return { category: null };
}

// N18: 정답지와 비교해 적용률 · 정확도 계산
// 출력: { coverage, accuracy, wrong } (적용률, 정확도, 틀린 목록)
export function measure(samples, answers, categories) {
  return { coverage: 0, accuracy: 0, wrong: [] };
}

// N24: 새 북마크마다 분류해, 분류된 카테고리와 이름이 같은 폴더를 추천 폴더로 정한다
// 출력: [{ bookmarkId, folderId }]. 분류되지 않았거나 같은 이름의 폴더가 없으면 folderId는 null(그대로 두기)
// 새 폴더를 만들자는 제안은 이 함수가 아니라 plan.js의 suggestNewFolders가 맡는다 (명세 v14)
export function suggestForNew(newBookmarks, folders, categories) {
  return [];
}
