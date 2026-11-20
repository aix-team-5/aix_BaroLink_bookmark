// 담당: 팀원 B · 이슈 #83 · 명세: N55 (F18, P3)
// 내 정보 창. 헤더의 계정 동그라미를 누르면 render.js가 부른다. 창은 헤더가 아니라 #dialogs에 붙인다(F18-02).
// 화면 파일끼리는 서로 부르지 않는다 (공통 조각은 ui.js). 저장은 store.js(setAppearance, setPhoto)를 거친다.
// 모양은 P3 디자인 시안의 '내 정보' 창을 따른다. 클래스 이름과 마크업은 newtab.css(팀원 D, #87)의 '내 정보와 꾸미기' 주석을 따른다.
// 이 파일은 클래스·data-value·aria-pressed만 붙이고, 색·그림·크기는 newtab.css가 그린다 (JS에 색을 두지 않는다).
import { setAppearance, setPhoto } from "../store.js";
import { icon, showToast } from "../ui.js";

// 화면 문구
const TEXT = {
  title: "내 정보", // 시안
  close: "닫기", // 제안
  changePhoto: "사진 바꾸기", // 확정 F18-04
  removePhoto: "사진 지우기", // 확정 F18-05
  presets: "대체 이미지", // 제안 (화면 읽기 도구용)
  presetLabel: (n) => `대체 이미지 ${n}`, // 제안 (화면 읽기 도구용)
  syncOn: "북마크 동기화 켜짐", // 확정 F18-03
  syncOff: "북마크가 이 PC에만 있어요", // 확정 F18-03
  bookmarkUnit: "개 북마크", // 시안 "132개 북마크"
  folderUnit: "개 폴더", // 시안 "7개 폴더"
  lastOrganized: (date) => `마지막 정리 ${date}`, // 시안
  neverOrganized: "아직 정리하지 않았어요", // 확정 F18-02
  accent: "색상", // 시안
  wallpaper: "배경", // 시안
  font: "글꼴", // 시안
  fontSample: "가나 Aa", // 시안
  myPhoto: "내 사진", // 시안
  uploadWallpaper: "사진 올리기", // 시안 (명세 F18-08 [배경 사진 올리기])
  removeWallpaper: "배경 사진 지우기", // 확정 F18-10 (시안에 없어 배경 칸 아래 글자 버튼으로 둔다)
  localOnly: "꾸미기와 사진은 이 PC에만 저장돼요", // 시안 (명세 F18-12 "이 PC에만 저장돼요")
  cannotUse: "사진을 쓸 수 없어요", // 확정 F18-09
  saveFailed: "저장하지 못했어요. 다시 눌러 주세요", // 제안 (명세에 없음)
};

// 고를 수 있는 값 (명세 v22 '참고_저장 항목' appearance). 순서대로 보여 준다
// label은 화면 이름표다. 배경 이름은 시안의 임시 이름이라 정해지면 label만 바꾼다(ID는 명세 그대로)
const ACCENTS = [
  { id: "violet", label: "보라" },
  { id: "navy", label: "남색" },
  { id: "blue", label: "파랑" },
  { id: "sky", label: "하늘" },
  { id: "teal", label: "청록" },
  { id: "green", label: "초록" },
  { id: "rose", label: "장미" },
  { id: "ink", label: "먹색" },
];
const WALLPAPERS = [
  { id: "cloud", label: "구름" },
  { id: "dawn", label: "새벽" },
  { id: "mint", label: "민트" },
  { id: "lavender", label: "라벤더" },
  { id: "peach", label: "복숭아" },
  { id: "mist", label: "안개" },
];
const PHOTO_WALLPAPER = "photo"; // 올린 배경 사진을 쓸 때의 wallpaper 값
const FONTS = [
  { id: "system", label: "시스템" },
  { id: "gothic", label: "고딕" },
  { id: "serif", label: "명조" },
];
// 대체 이미지 6개의 ID (팀원 D가 img/avatars/ID.svg로 넣음, #87). 시안 순서
const AVATAR_PRESETS = ["lavender", "peach", "sky", "mint", "pink", "slate"];
const avatarSrc = (id) => `img/avatars/${id}.svg`;

// 기본 꾸미기 (명세 v22). 목록에 없는 값이면 이 값으로 본다 (F18-14)
const DEFAULT_APPEARANCE = { accent: "violet", wallpaper: "cloud", font: "system", avatarPreset: null };

// 사진 줄이기 (F18-04, F18-08, F18-09)
const PROFILE_SIZE = 128; // 프로필: 가운데를 정사각형으로 잘라 128×128
const WALLPAPER_MAX = 1920; // 배경: 긴 변 1920px 이하
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB를 넘으면 쓰지 않는다
const PHOTO_TYPE = "image/webp"; // 투명한 부분을 지키면서 작게 저장한다
const PHOTO_QUALITY = 0.85;

// 이 파일이 붙이는 CSS 클래스 이름 (newtab.css, 팀원 D #87)
const CLS = {
  dialogFrame: "dialog",
  dialogPanel: "dialog__panel",
  dialogHeader: "dialog__header",
  dialogTitle: "dialog__title",
  dialogBody: "dialog__body",
  btn: "btn",
  btnIcon: "btn--icon",
  btnGhost: "btn--ghost",
  dialog: "profile",
  me: "profile__me", // 동그라미 + 버튼 + 대체 이미지 줄
  avatar: "profile__avatar", // 큰 동그라미 (사진·대체 이미지·기본 그림)
  avatarEmpty: "profile__avatar--empty", // 기본 그림일 때 (회색 테두리)
  meSide: "profile__me-side",
  photoActions: "profile__photo-actions",
  photoButton: "profile__photo-btn", // [사진 바꾸기] (연한 강조색 채움)
  presets: "profile__presets",
  preset: "profile__preset", // 대체 이미지 동그라미 [data-value]
  info: "profile__info", // 연회색 정보 상자
  sync: "profile__sync", // 점은 CSS가 그린다
  syncOn: "profile__sync--on",
  syncOff: "profile__sync--off",
  counts: "profile__counts", // 숫자는 <strong>
  last: "profile__last",
  divider: "profile__divider",
  sectionTitle: "profile__section-title",
  swatches: "profile__swatches",
  swatch: "profile__swatch", // 색 동그라미 [data-value]. 고른 색만 체크가 보인다 (CSS)
  wallpapers: "profile__wallpapers", // 4칸 격자
  wallpaper: "profile__wallpaper", // 배경 칸 [data-value]
  wallpaperLabel: "profile__wallpaper-label", // 칸 왼쪽 아래 이름표
  wallpaperUpload: "profile__wallpaper--upload", // 점선 "+ 사진 올리기" (<label> 안에 input)
  fonts: "profile__fonts",
  font: "profile__font", // 글꼴 칸 [data-value]
  fontSample: "profile__font-sample", // "가나 Aa" (그 글꼴로)
  fontName: "profile__font-name",
  note: "profile__note", // 맨 아래 자물쇠 + 안내
};

const DIALOG_HOST_ID = "dialogs";
const PROFILE_DIALOG_ID = "dialog-profile";
const PROFILE_TITLE_ID = "dialog-profile-title";

// 창에 보여 줄 값. showProfile이 받은 info를 복사해 두고, 창에서 저장할 때마다 이 값을 고친 뒤 본문을 다시 그린다
// (renderAll은 showProfile을 다시 부르지 않으므로 창 안의 선택 표시는 이 파일이 스스로 다시 그린다. #83 핵심 정책)
let view = null;
// 저장을 하나씩 차례로 한다. 빨리 여러 번 눌러도 누른 순서대로 저장된다
let saveQueue = Promise.resolve();

// 목록에 있는 값이면 그대로, 아니면 기본값 (F18-14)
function pick(value, list, fallback) {
  return list.some((item) => item.id === value) ? value : fallback;
}

// 받은 appearance를 목록 안의 값으로 맞춘다
function normalizeAppearance(appearance) {
  const a = appearance && typeof appearance === "object" ? appearance : {};
  const wallpaper = a.wallpaper === PHOTO_WALLPAPER ? PHOTO_WALLPAPER : pick(a.wallpaper, WALLPAPERS, DEFAULT_APPEARANCE.wallpaper);
  return {
    accent: pick(a.accent, ACCENTS, DEFAULT_APPEARANCE.accent),
    wallpaper,
    font: pick(a.font, FONTS, DEFAULT_APPEARANCE.font),
    avatarPreset: AVATAR_PRESETS.includes(a.avatarPreset) ? a.avatarPreset : null,
  };
}

// 저장된 사진은 data:image/ 주소일 때만 쓴다
function photoOrNull(value) {
  return typeof value === "string" && value.startsWith("data:image/") ? value : null;
}

// info를 창에서 쓸 모양으로 복사한다. 빠진 값은 비어 있는 것으로 본다
function makeView(info) {
  const i = info && typeof info === "object" ? info : {};
  const count = (n) => (Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0);
  const appearance = normalizeAppearance(i.appearance);
  const photos = {
    profilePhoto: photoOrNull(i.photos?.profilePhoto),
    wallpaperPhoto: photoOrNull(i.photos?.wallpaperPhoto),
  };
  // 올린 배경 사진이 없는데 "photo"이면 기본 배경으로 본다 (F18-14)
  if (appearance.wallpaper === PHOTO_WALLPAPER && !photos.wallpaperPhoto) appearance.wallpaper = DEFAULT_APPEARANCE.wallpaper;
  return {
    syncing: i.syncing === true,
    bookmarkCount: count(i.bookmarkCount),
    folderCount: count(i.folderCount),
    lastOrganizedAt: Number.isFinite(i.lastOrganizedAt) ? i.lastOrganizedAt : null,
    appearance,
    photos,
  };
}

// 정리 시각(밀리초)을 "M월 D일"로 바꾼다 (history.js와 같은 모양)
function dateLabel(at) {
  const d = new Date(at);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

// ----- 사진 줄이기 -----

// 사용자가 고른 파일을 쓸 수 없을 때의 오류 (F18-09). 프로그램 오류가 아니라 예상된 상황이라 콘솔에 남기지 않는다
// (콘솔 경고는 chrome://extensions에 "오류"로 쌓인다)
class UnusableFileError extends Error {}

// 이미지 파일을 읽어 그림으로 푼다. 이미지가 아니거나, 20MB를 넘거나, 크롬이 열지 못하는 형식(HEIC 등)이면 UnusableFileError
async function decodeImage(file) {
  if (!(file instanceof Blob) || !String(file.type || "").startsWith("image/")) throw new UnusableFileError("이미지가 아님");
  if (file.size > MAX_FILE_BYTES) throw new UnusableFileError("20MB를 넘음");
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new UnusableFileError("읽을 수 없는 사진");
  }
  if (!bitmap.width || !bitmap.height) {
    bitmap.close();
    throw new UnusableFileError("크기가 0");
  }
  return bitmap;
}

// 그림의 (sx, sy, sw, sh) 부분을 width×height로 그려 dataURL로 만든다
function drawToDataUrl(bitmap, [sx, sy, sw, sh], width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas를 쓸 수 없음");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);
  const url = canvas.toDataURL(PHOTO_TYPE, PHOTO_QUALITY);
  if (!url.startsWith("data:image/")) throw new Error("사진을 만들지 못함");
  return url;
}

// 프로필 사진: 가운데를 정사각형으로 잘라 128×128 (F18-04). 원본은 저장하지 않는다
async function shrinkProfile(file) {
  const bitmap = await decodeImage(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    return drawToDataUrl(bitmap, [sx, sy, side, side], PROFILE_SIZE, PROFILE_SIZE);
  } finally {
    bitmap.close();
  }
}

// 배경 사진: 긴 변을 1920px 이하로 줄인다 (F18-08). 작은 사진은 키우지 않는다
async function shrinkWallpaper(file) {
  const bitmap = await decodeImage(file);
  try {
    const scale = Math.min(1, WALLPAPER_MAX / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    return drawToDataUrl(bitmap, [0, 0, bitmap.width, bitmap.height], width, height);
  } finally {
    bitmap.close();
  }
}

// ----- 저장 -----

// 창 안에 짧은 안내를 띄운다. showModal() 창은 #toast를 배경 뒤에 가리므로 창 안에 띄운다 (ui.js N45의 container)
function notify(message) {
  const dialog = document.getElementById(PROFILE_DIALOG_ID);
  showToast(message, { container: dialog && dialog.open ? dialog : null });
}

// 창을 연 회차. 창이 닫히면 1 늘린다. 닫기 전에 시작한 저장의 실패 안내가 다시 연 창에 뜨지 않게 한다
let session = 0;

// 저장 작업을 차례로 실행하고, 끝나면 창 안의 선택 표시를 다시 그린다
// work는 view를 고칠 값을 돌려준다 { appearance?, photos? }. null이면 할 일이 없어 건너뛴 것이다
// 실패하면 view를 바꾸지 않고, 그 작업을 시작한 창이 아직 열려 있을 때만 안내를 띄운다
function save(work, failMessage = TEXT.saveFailed) {
  const startedIn = session;
  const run = async () => {
    try {
      const change = await work();
      if (!view || !change) return; // 그사이 창을 닫았거나 건너뛴 작업
      if (change.appearance) view.appearance = normalizeAppearance({ ...view.appearance, ...change.appearance });
      if (change.photos) view.photos = { ...view.photos, ...change.photos };
    } catch (error) {
      // 쓸 수 없는 파일은 안내만 띄운다. 저장 공간 부족 같은 진짜 실패만 콘솔에 남긴다
      if (!(error instanceof UnusableFileError)) console.warn("내 정보 창: 저장하지 못했어요", error);
      if (startedIn === session) notify(failMessage);
    }
    redraw();
  };
  saveQueue = saveQueue.then(run, run);
  return saveQueue;
}

// setAppearance(N51)는 고친 값 전체를 돌려준다. 돌려준 값이 비어 있으면 넘긴 patch로 본다
async function saveAppearance(patch) {
  const saved = await setAppearance(patch);
  return saved && typeof saved === "object" && Object.keys(saved).length ? { ...patch, ...saved } : patch;
}

// 색상·배경·글꼴 고르기 (F18-06·07·11의 고르는 쪽). 화면 전체의 색·배경·글꼴은 저장소 알림을 받은 render.js가 바꾼다
// 같은 값인지는 앞선 저장이 끝난 뒤에 본다. 빨리 여러 번 눌러도 마지막으로 누른 값이 남는다
function chooseAppearance(patch) {
  save(async () => {
    if (view && Object.entries(patch).every(([key, value]) => view.appearance[key] === value)) return null;
    // 그사이 올린 배경 사진을 지웠으면 '내 사진'을 고르지 않는다
    if (patch.wallpaper === PHOTO_WALLPAPER && view && !view.photos.wallpaperPhoto) return null;
    return { appearance: await saveAppearance(patch) };
  });
}

// 대체 이미지 고르기 (F18-05). 동그라미는 올린 사진을 먼저 보여 주므로(F18-01) 올린 사진을 지운다
// 꾸미기를 먼저 저장한다. 그게 실패하면 사진은 그대로 남아 다시 시도할 수 있다
function choosePreset(id) {
  save(async () => {
    if (view && view.appearance.avatarPreset === id && !view.photos.profilePhoto) return null;
    const appearance = await saveAppearance({ avatarPreset: id });
    await setPhoto("profile", null);
    return { appearance, photos: { profilePhoto: null } };
  });
}

// [사진 지우기] → 기본 그림 (F18-05). 올린 사진과 고른 대체 이미지를 모두 지운다
// 창이 그사이 닫혀도 누른 지우기는 끝까지 한다 (창의 view를 보지 않는다)
function removeProfilePhoto() {
  save(async () => {
    const appearance = await saveAppearance({ avatarPreset: null });
    await setPhoto("profile", null);
    return { appearance, photos: { profilePhoto: null } };
  });
}

// [사진 바꾸기]: 줄인 사진만 저장한다 (F18-04). 쓸 수 없으면 저장하지 않고 안내 (F18-09)
function uploadProfilePhoto(file) {
  save(async () => {
    const dataUrl = await shrinkProfile(file);
    await setPhoto("profile", dataUrl);
    return { photos: { profilePhoto: dataUrl } };
  }, TEXT.cannotUse);
}

// [사진 올리기]: 줄인 사진 한 장을 저장하고 배경으로 쓴다. 새로 올리면 앞의 사진을 바꾼다 (F18-08)
// 여기서는 사진을 먼저 저장한다. 꾸미기("photo")를 먼저 저장했다가 사진 저장이 실패하면 사진 없는 "photo"가 남기 때문이다
function uploadWallpaper(file) {
  save(async () => {
    const dataUrl = await shrinkWallpaper(file);
    await setPhoto("wallpaper", dataUrl);
    return { photos: { wallpaperPhoto: dataUrl }, appearance: await saveAppearance({ wallpaper: PHOTO_WALLPAPER }) };
  }, TEXT.cannotUse);
}

// [배경 사진 지우기]: 올린 사진을 지우고 기본 배경(구름)으로 (F18-10)
// 배경을 먼저 구름으로 저장한다. 사진 지우기가 실패해도 배경은 구름이고 사진은 남아 다시 시도할 수 있다
function removeWallpaper() {
  save(async () => {
    const appearance = await saveAppearance({ wallpaper: DEFAULT_APPEARANCE.wallpaper });
    await setPhoto("wallpaper", null);
    return { appearance, photos: { wallpaperPhoto: null } };
  });
}

// ----- 그리기 -----

// 요소 하나를 만든다
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// 버튼 하나. focusKey는 다시 그린 뒤 포커스를 돌려놓을 때 쓴다
function button(className, focusKey, onClick) {
  const b = el("button", className);
  b.type = "button";
  b.dataset.focusKey = focusKey;
  b.addEventListener("click", onClick);
  return b;
}

// 고르기 버튼. 값은 data-value, 고른 것은 aria-pressed="true" (newtab.css #87)
function choiceButton(className, value, label, selected, onClick) {
  const b = button(className, `${className}:${value}`, onClick);
  b.dataset.value = value;
  b.setAttribute("aria-pressed", String(selected));
  b.setAttribute("aria-label", label);
  b.title = label;
  return b;
}

// 사진 고르는 숨은 입력칸
function fileInput(onFile) {
  const input = el("input");
  input.type = "file";
  input.accept = "image/*";
  input.hidden = true;
  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    input.value = ""; // 같은 파일을 다시 골라도 change가 오게 비운다
    if (file) onFile(file);
  });
  return input;
}

// 큰 동그라미: 올린 사진 → 고른 대체 이미지 → 기본 그림 (F18-01과 같은 순서, 시안 5쪽)
function avatarCircle() {
  const box = el("span", CLS.avatar);
  const src = view.photos.profilePhoto || (view.appearance.avatarPreset ? avatarSrc(view.appearance.avatarPreset) : null);
  const showDefault = () => {
    box.classList.add(CLS.avatarEmpty);
    box.replaceChildren(icon("user", 40)); // 기본 그림: ui.js의 "user" 아이콘 (N46, 팀원 D)
  };
  if (!src) {
    showDefault();
    return box;
  }
  const img = el("img");
  img.src = src;
  img.alt = "";
  img.addEventListener("error", showDefault); // 그림 파일이 없으면 기본 그림으로
  box.appendChild(img);
  return box;
}

// 위: 동그라미 | [사진 바꾸기] [사진 지우기] / 대체 이미지 6개
function drawMe() {
  const me = el("div", CLS.me);
  const side = el("div", CLS.meSide);

  const photoInput = fileInput(uploadProfilePhoto);
  const actions = el("div", CLS.photoActions);
  const change = button(`${CLS.btn} ${CLS.photoButton}`, "photo:change", () => photoInput.click());
  change.textContent = TEXT.changePhoto;
  const remove = button(`${CLS.btn} ${CLS.btnGhost}`, "photo:remove", removeProfilePhoto);
  remove.textContent = TEXT.removePhoto;
  remove.disabled = !view.photos.profilePhoto && !view.appearance.avatarPreset; // 지울 것이 없으면 누를 수 없다
  actions.append(change, remove, photoInput);

  const presets = el("div", CLS.presets);
  presets.setAttribute("role", "group");
  presets.setAttribute("aria-label", TEXT.presets);
  AVATAR_PRESETS.forEach((id, index) => {
    const selected = !view.photos.profilePhoto && view.appearance.avatarPreset === id;
    const b = choiceButton(CLS.preset, id, TEXT.presetLabel(index + 1), selected, () => choosePreset(id));
    const img = el("img");
    img.src = avatarSrc(id);
    img.alt = "";
    b.appendChild(img);
    presets.appendChild(b);
  });

  side.append(actions, presets);
  me.append(avatarCircle(), side);
  return me;
}

// 가운데 정보 상자: 동기화 상태, 북마크 수·폴더 수, 마지막 정리 (F18-02, F18-03). 이메일·이름은 보여 주지 않는다
function drawInfo() {
  const info = el("div", CLS.info);
  const sync = el("div", `${CLS.sync} ${view.syncing ? CLS.syncOn : CLS.syncOff}`, view.syncing ? TEXT.syncOn : TEXT.syncOff);

  // 시안: "132개 북마크  7개 폴더" (숫자만 굵게. 두 묶음 사이 간격은 CSS가 준다)
  const counts = el("div", CLS.counts);
  counts.append(
    el("strong", "", String(view.bookmarkCount)), TEXT.bookmarkUnit,
    el("strong", "", String(view.folderCount)), TEXT.folderUnit,
  );

  const last = el("div", CLS.last, view.lastOrganizedAt === null ? TEXT.neverOrganized : TEXT.lastOrganized(dateLabel(view.lastOrganizedAt)));

  info.append(sync, counts, last);
  return info;
}

// 구역 하나: 제목 + 내용 (+ 내용 아래 덧붙일 것)
function section(title, listClass, children, after = []) {
  const list = el("div", listClass);
  list.setAttribute("role", "group");
  list.setAttribute("aria-label", title);
  list.append(...children);
  return [el("div", CLS.sectionTitle, title), list, ...after];
}

// 색상 8개. 체크 아이콘은 모두 넣고, 고른 색만 보이게 하는 것은 CSS가 한다 (#87)
function drawAccents() {
  return ACCENTS.map(({ id, label }) => {
    const b = choiceButton(CLS.swatch, id, label, view.appearance.accent === id, () => chooseAppearance({ accent: id }));
    b.appendChild(icon("check", 18));
    return b;
  });
}

// 배경 칸 하나 (이름표는 칸 왼쪽 아래)
function wallpaperTile(id, label, onClick) {
  const tile = choiceButton(CLS.wallpaper, id, label, view.appearance.wallpaper === id, onClick);
  tile.appendChild(el("span", CLS.wallpaperLabel, label));
  return tile;
}

// 배경 6개 + (올린 사진이 있으면) 내 사진 + 사진 올리기
function drawWallpapers() {
  const tiles = WALLPAPERS.map(({ id, label }) => wallpaperTile(id, label, () => chooseAppearance({ wallpaper: id })));

  if (view.photos.wallpaperPhoto) {
    // 올린 사진도 배경 칸 하나로 보여 준다. 다른 배경을 골랐다가 다시 고를 수 있다
    // newtab.css는 ui.js가 넣는 --wallpaper-photo를 쓰지만, 다른 배경을 고른 동안에도 보이게 칸에 직접 넣는다
    const mine = wallpaperTile(PHOTO_WALLPAPER, TEXT.myPhoto, () => chooseAppearance({ wallpaper: PHOTO_WALLPAPER }));
    mine.style.backgroundImage = `url("${view.photos.wallpaperPhoto}")`;
    tiles.push(mine);
  }

  // [사진 올리기]: 점선 칸 (newtab.css #87). 키보드·화면 읽기 도구에도 버튼으로 보이게 <button>으로 만들고 숨은 파일 입력칸을 연다
  const input = fileInput(uploadWallpaper);
  const upload = button(`${CLS.wallpaper} ${CLS.wallpaperUpload}`, "wallpaper:upload", () => input.click());
  upload.append(icon("plus", 18), el("span", "", TEXT.uploadWallpaper));
  tiles.push(upload, input);

  // [배경 사진 지우기] (F18-10). 시안에 없어 배경 칸 아래 글자 버튼으로 둔다 (올린 사진이 있을 때만)
  const after = [];
  if (view.photos.wallpaperPhoto) {
    const remove = button(`${CLS.btn} ${CLS.btnGhost}`, "wallpaper:remove", removeWallpaper);
    remove.textContent = TEXT.removeWallpaper;
    after.push(remove);
  }
  return section(TEXT.wallpaper, CLS.wallpapers, tiles, after);
}

// 글꼴 3개: 그 글꼴로 쓴 "가나 Aa" + 이름 (시안)
function drawFonts() {
  return FONTS.map(({ id, label }) => {
    const b = choiceButton(CLS.font, id, label, view.appearance.font === id, () => chooseAppearance({ font: id }));
    b.append(el("span", CLS.fontSample, TEXT.fontSample), el("span", CLS.fontName, label));
    return b;
  });
}

// 맨 아래: 자물쇠 + "꾸미기와 사진은 이 PC에만 저장돼요" (F18-12)
function drawNote() {
  const note = el("div", CLS.note);
  note.append(icon("lock", 16), el("span", "", TEXT.localOnly));
  return note;
}

// 본문을 view로 다시 그린다. 여러 번 불려도 결과가 같다. 누르던 버튼에 포커스를 돌려놓는다
function redraw() {
  const dialog = document.getElementById(PROFILE_DIALOG_ID);
  const body = dialog && dialog.querySelector(`.${CLS.dialogBody}`);
  if (!view || !body) return;
  const focusKey = dialog.contains(document.activeElement) ? document.activeElement?.dataset?.focusKey : undefined;

  body.replaceChildren(
    drawMe(),
    drawInfo(),
    el("hr", CLS.divider),
    ...section(TEXT.accent, CLS.swatches, drawAccents()),
    ...drawWallpapers(),
    ...section(TEXT.font, CLS.fonts, drawFonts()),
    drawNote(),
  );

  if (focusKey) {
    const find = (key) => [...body.querySelectorAll("[data-focus-key]")].find((node) => node.dataset.focusKey === key);
    let target = find(focusKey);
    // 지운 뒤 버튼이 사라졌거나 누를 수 없게 되면, 다음에 누를 버튼으로 옮긴다
    if (!target || target.disabled) target = find(FOCUS_FALLBACK[focusKey]);
    if (target && !target.disabled) target.focus();
  }
}

// 다시 그린 뒤 원래 버튼에 포커스를 둘 수 없을 때 옮길 곳
const FOCUS_FALLBACK = {
  "photo:remove": "photo:change", // [사진 지우기] → [사진 바꾸기]
  "wallpaper:remove": "wallpaper:upload", // [배경 사진 지우기] → [사진 올리기]
};

// #dialog-profile를 하나만 두고 다시 쓴다. 처음 만들 때만 틀과 이벤트를 단다
function getProfileDialog(host) {
  let dialog = document.getElementById(PROFILE_DIALOG_ID);
  if (dialog) return dialog;

  dialog = el("dialog", `${CLS.dialogFrame} ${CLS.dialog}`);
  dialog.id = PROFILE_DIALOG_ID;
  dialog.setAttribute("aria-labelledby", PROFILE_TITLE_ID);
  // 바깥(어두운 곳)을 누르면 닫는다. Esc는 <dialog>의 기본 동작
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    // close 이벤트는 close() 뒤에 늦게 온다. 그사이 다시 열었으면 지우지 않는다
    if (dialog.open) return;
    view = null;
    session++; // 이 창에서 시작한 저장의 실패 안내는 다음에 연 창에 띄우지 않는다
    dialog.remove();
  });

  const panel = el("div", CLS.dialogPanel);
  const header = el("div", CLS.dialogHeader);
  const title = el("div", CLS.dialogTitle, TEXT.title);
  title.id = PROFILE_TITLE_ID;
  const closeButton = el("button", `${CLS.btn} ${CLS.btnIcon}`);
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", TEXT.close);
  closeButton.appendChild(icon("close", 20));
  closeButton.addEventListener("click", () => dialog.close());
  header.append(title, closeButton);
  panel.append(header, el("div", CLS.dialogBody));
  dialog.appendChild(panel);

  host.appendChild(dialog);
  return dialog;
}

// N55: info = { syncing, bookmarkCount, folderCount, lastOrganizedAt, appearance, photos: { profilePhoto, wallpaperPhoto } } (render.js가 만듦)
// actions = render.js가 다른 화면 파일에 넘기는 공통 actions. renderAll은 이 함수를 다시 부르지 않으므로 창 안의 선택 표시는 저장 뒤 스스로 다시 그린다
// 이미 열려 있으면 그 창을 다시 쓰고 내용만 받은 info로 바꾼다 (F18-02)
export function showProfile(info, actions) {
  const host = document.getElementById(DIALOG_HOST_ID);
  if (!host) return;
  const dialog = getProfileDialog(host);
  view = makeView(info);
  redraw();
  if (!dialog.open) dialog.showModal();
}
