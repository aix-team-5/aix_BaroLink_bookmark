// 담당: 팀원 B · 이슈 #83 · 명세: N55 (F18, P3)
// 내 정보 창. 헤더의 계정 동그라미를 누르면 render.js가 부른다. 창은 헤더가 아니라 #dialogs에 붙인다(F18-02).
// 화면 파일끼리는 서로 부르지 않는다 (공통 조각은 ui.js). 저장은 store.js(setAppearance, setPhoto)를 거친다.

// N55: info = { syncing, bookmarkCount, folderCount, lastOrganizedAt, appearance, photos: { profilePhoto, wallpaperPhoto } } (render.js가 만듦)
// actions = render.js가 다른 화면 파일에 넘기는 공통 actions. renderAll은 이 함수를 다시 부르지 않으므로 창 안의 선택 표시는 저장 뒤 스스로 다시 그린다
export function showProfile(info, actions) {}
