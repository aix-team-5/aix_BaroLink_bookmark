// 담당: 팀원 D · 이슈 #19 · 명세: N36 (F17, P3)
// 드래그 이동. SortableJS(lib/Sortable.min.js)는 P3를 시작할 때 넣는다.

// N36: 순서 바꾸기는 SortableJS로, 폴더 위에 놓기는 직접 구현
export function initDnd(container) {}

// N36(v22): 아래 세 함수로 나뉜다. initDnd는 팀원 D의 P3 PR에서 지운다
// 끄는 쪽: 앱 칸에 점 6개 손잡이를 붙인다 (render.js의 모든 북마크, folders.js의 팝업 안이 부름)
export function makeDraggable(tile, bookmark) {}

// 놓는 쪽: 앱 폴더·하위 폴더 타일. 위에 놓으면 그 폴더 맨 뒤로 옮긴다 (folders.js가 부름)
// options.name: "…에 넣기" 안내에 쓸 폴더 이름. 없으면 타일 안 .folder__name 글자 (F17-07)
export function makeDropTarget(tile, folderId, options = {}) {}

// 놓는 쪽: 폴더 팝업 안의 앱 목록. 앱 사이에 놓으면 그 자리로 순서를 바꾼다 (folders.js가 부름)
export function makeSortable(listEl, parentId) {}
