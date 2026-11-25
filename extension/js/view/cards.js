// 담당: 팀원 D · 이슈 #17 · 명세: N31 (F06, F09, F10) · 크롬 API: C19~C21
// 화면 파일끼리는 서로 부르지 않는다 (공통 조각은 ui.js). 크롬은 bookmarks.js와 store.js를 거친다 (권한 요청과 topSites만 예외).
// P1: 첫 정리 카드와 자세히 보기(F06-01~03·05~06). P2: 고르기 창(F09-05·06), 고정 제안 카드(F06-07, F09-01~03·08·09), 새 북마크 정리 창(F10, 아직)

import { applyPlan } from "../organize.js";
import { loadTree } from "../bookmarks.js";
import { pickPinCandidates } from "../plan.js";
import { searchBookmarks } from "../search.js";
import { setFirstCard, pin, load } from "../store.js";
import { appIcon, icon, showToast } from "../ui.js";

// 그리는 칸과 팝업을 붙이는 칸 (newtab.html)
const SLOT_ID = "organize-suggestion";
const DIALOG_HOST_ID = "dialogs";
const ORGANIZE_DIALOG_ID = "dialog-organize";
const PIN_PICKER_ID = "dialog-pin-picker";

// 분류 단계(step)별 한국어 이름 (F06-03 근거 표시에 쓴다)
const STEP_LABEL = { site: "사이트", suffix: "주소 끝", keyword: "제목 키워드" };

// 칸을 비운다. 그리기 함수는 여러 번 불려도 결과가 같아야 한다 (자기 칸을 비우고 다시 그린다)
function clearSlot(slot) {
  slot.replaceChildren();
}

// rest는 명세상 "폴더에 안 들어간 북마크 수"(숫자)다. 혹시 배열로 오면 길이로 센다 (명세 N20 확정 전 안전장치)
function restCount(plan) {
  if (Array.isArray(plan.rest)) return plan.rest.length;
  return typeof plan.rest === "number" ? plan.rest : 0;
}

// 폴더 계획의 요약 문구를 만든다: "영상 8 · 학교 6 · … · 나머지 N개는 그대로"
function planSummary(plan) {
  const parts = plan.folders.map((folder) => `${folder.name} ${folder.items.length}`);
  const rest = restCount(plan);
  if (rest > 0) parts.push(`나머지 ${rest}개는 그대로`);
  return parts.join(" · ");
}

// 분류 근거가 "제목 키워드"라서 사람이 확인하는 게 좋은 북마크인가 (F06-05)
// classify의 출력은 { step: "site" | "suffix" | "keyword", needsCheck }이다 (명세 N17).
function needsCheck(reason) {
  if (!reason || typeof reason !== "object") return false;
  if (typeof reason.needsCheck === "boolean") return reason.needsCheck;
  return reason.step === "keyword";
}

// 폴더의 분류 근거를 한 줄로 요약한다 (F06-03). 예: "사이트 2 · 제목 키워드 1"
// reasons는 folder.items와 같은 길이이고 각 원소는 { step, rule, needsCheck }이다 (명세 N20)
function folderReasonSummary(folder) {
  const reasons = Array.isArray(folder.reasons) ? folder.reasons : [];
  const counts = new Map();
  for (const reason of reasons) {
    const step = reason && reason.step;
    const label = STEP_LABEL[step];
    if (label) counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  if (counts.size === 0) return "";
  return [...counts].map(([label, n]) => `${label} ${n}`).join(" · ");
}

// 공통 버튼 하나를 만든다
function makeButton(label, { variant = "", onClick, ariaLabel } = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = variant ? `btn ${variant}` : "btn";
  if (label) button.textContent = label;
  if (ariaLabel) button.setAttribute("aria-label", ariaLabel);
  if (onClick) button.addEventListener("click", onClick);
  return button;
}

// N31: 첫 정리 카드를 #organize-suggestion 칸에 그린다
// actions는 render.js가 넘겨 주는 동작 묶음이다. [정리하기]가 끝나면 actions.showResultNotice(entry)를 부른다
export function showFirstCard(plan, actions) {
  const slot = document.getElementById(SLOT_ID);
  if (!slot) return;
  clearSlot(slot);
  if (!plan) return;

  // 폴더 계획 대신 고정 제안이 돌아오면 첫 정리 카드 대신 고정 제안 카드를 그린다 (F06-07)
  if (plan.type === "pin") {
    renderPinCard(slot);
    return;
  }

  if (plan.type !== "folders" || !Array.isArray(plan.folders) || plan.folders.length === 0) return;

  renderFolderCard(slot, plan, actions);
}

// 독에 넣을 수 있는 최대 개수(store.js의 MAX_PINNED와 같다)와, 고정 제안·고르기에서 한 번에 고정하는 최대 개수 (F08-06, F09-03·05)
const DOCK_MAX = 10;
const PIN_SUGGEST_MAX = 5;

// 고정 제안 카드 (F09-01): [나중에] [고르기] [고정하기]
// 문구는 명세 F09-01 그대로다. plan.reason("tooFew" | "noGroup")은 화면에 보여 주지 않는다 (명세 N20)
function renderPinCard(slot) {
  const logo = document.createElement("span");
  logo.className = "brand__logo brand__logo--primary";
  logo.appendChild(icon("bookmark", 24));

  const text = document.createElement("div");
  text.className = "suggestion__text";
  const title = document.createElement("div");
  title.className = "suggestion__title";
  title.textContent = "북마크들이 서로 달라서 아직 묶을 폴더가 없어요. 대신 자주 쓰는 북마크 5개를 고정할까요?";
  text.append(title);

  const buttons = document.createElement("div");
  buttons.className = "actions";
  buttons.append(
    makeButton("나중에", {
      variant: "btn--ghost",
      onClick: () => finishPinSuggestion(slot),
    }),
    makeButton("고르기", {
      variant: "btn--ghost",
      onClick: () => openPinChoice(slot),
    }),
    makeButton("고정하기", {
      variant: "btn--primary",
      onClick: (event) => runPinSuggestion(slot, event.currentTarget),
    }),
  );

  slot.append(logo, text, buttons);
}

// 고정 제안을 처리했다: 카드를 지우고 상태를 "later"로 둔다.
// "done"이 아니라 "later"인 까닭: 북마크가 늘어 폴더 계획을 세울 수 있게 되면 헤더 [정리하기]에서 첫 정리 카드를 다시 제안해야 한다 (F09-07)
async function finishPinSuggestion(slot) {
  clearSlot(slot);
  await setFirstCard("later");
}

// 자주 방문한 사이트(topSites) 중 http·https 주소만 읽는다. 확장 프로그램 자신의 새 탭 주소가 섞여 있다 (C21). 결과는 저장하지 않는다 (F09-04)
async function readTopSites() {
  if (!chrome.topSites || typeof chrome.topSites.get !== "function") return [];
  const sites = await chrome.topSites.get();
  return (Array.isArray(sites) ? sites : []).filter((site) => site && typeof site.url === "string" && /^https?:/i.test(site.url));
}

// [고정하기]: 그때에만 topSites 권한을 요청하고(F09-02), 자주 방문한 사이트와 같은 북마크를 최대 5개 고정한다 (F09-03)
// 거절했거나 목록이 비면 최근에 연 순으로만 고른다 (F09-08). 고를 북마크가 하나도 없으면 아무것도 고정하지 않고 [고르기] 창을 연다 (F09-09)
function runPinSuggestion(slot, triggerButton) {
  // 권한 요청은 클릭 핸들러 안에서 await 없이 바로 부른다. 그 앞에 await가 있으면 크롬이 거절한다 (C19)
  const requested = chrome.permissions.request({ permissions: ["topSites"] });
  return applyPinSuggestion(slot, triggerButton, requested);
}

async function applyPinSuggestion(slot, triggerButton, requested) {
  if (triggerButton) triggerButton.disabled = true;
  try {
    let topSites = [];
    try {
      // 거절하면 false가 돌아오고 chrome.topSites는 없는 채로 남는다
      if (await requested) topSites = await readTopSites();
    } catch (error) {
      console.warn("자주 방문한 사이트를 읽지 못했어요", error);
    }

    const [tree, stored] = await Promise.all([loadTree(), load()]);
    const picks = pickPinCandidates(tree.bookmarks, topSites, stored);
    if (picks.length === 0) {
      if (triggerButton) triggerButton.disabled = false;
      await openPinChoice(slot);
      return;
    }

    const pinned = [];
    for (const bookmark of picks) {
      // 독이 이미 10개면 pin이 false를 돌려준다. 거기서 멈춘다
      if (await pin(bookmark.id)) pinned.push(bookmark.id);
      else break;
    }
    if (pinned.length === 0) {
      if (triggerButton) triggerButton.disabled = false;
      showToast("고정은 10개까지 할 수 있어요");
      return;
    }
    await finishPinSuggestion(slot);
    showToast(`${pinned.length}개를 고정했어요`);
  } catch (error) {
    console.error("고정하지 못했어요", error);
    showToast("고정하지 못했어요");
    if (triggerButton) triggerButton.disabled = false;
  }
}

// [고르기]: 북마크 목록에서 최대 5개를 골라 고정한다 (F09-05)
async function openPinChoice(slot) {
  try {
    const [tree, stored] = await Promise.all([loadTree(), load()]);
    const pinnedNow = new Set((Array.isArray(stored.pinned) ? stored.pinned : []).map(String));
    const room = DOCK_MAX - pinnedNow.size;
    if (room <= 0) {
      showToast("고정은 10개까지 할 수 있어요");
      return;
    }
    const candidates = tree.bookmarks.filter(
      (bookmark) => !pinnedNow.has(String(bookmark.id)) && !String(bookmark.url ?? "").trim().toLowerCase().startsWith("javascript:"),
    );
    showPinPicker(candidates, {
      max: Math.min(PIN_SUGGEST_MAX, room),
      limitMessage: room < PIN_SUGGEST_MAX ? "고정은 10개까지 할 수 있어요" : undefined,
      onPicked: () => finishPinSuggestion(slot),
    });
  } catch (error) {
    console.error("북마크 목록을 읽지 못했어요", error);
    showToast("북마크 목록을 읽지 못했어요");
  }
}

// 첫 정리 카드: "북마크를 이렇게 묶어 볼까요?" + 요약 + [나중에] [자세히 보기] [정리하기]
function renderFolderCard(slot, plan, actions) {
  const logo = document.createElement("span");
  logo.className = "brand__logo brand__logo--primary";
  logo.appendChild(icon("sparkles", 24));

  const text = document.createElement("div");
  text.className = "suggestion__text";

  const title = document.createElement("div");
  title.className = "suggestion__title";
  title.textContent = "북마크를 이렇게 묶어 볼까요?";

  const desc = document.createElement("div");
  desc.className = "suggestion__desc";

  const note = document.createElement("div");
  note.className = "suggestion__note";
  note.textContent = "직접 만든 폴더와 북마크바에서 요즘 쓰는 북마크는 그대로 둬요";

  text.append(title, desc, note);

  const buttons = document.createElement("div");
  buttons.className = "actions";
  buttons.append(
    makeButton("나중에", {
      variant: "btn--ghost",
      onClick: async () => {
        clearSlot(slot);
        await setFirstCard("later");
      },
    }),
    makeButton("자세히 보기", {
      variant: "btn--ghost",
      onClick: () => showOrganizeDialog(plan, actions),
    }),
  );
  const applyButton = makeButton("정리하기", {
    variant: "btn--primary",
    // 자세히 보기에서 고쳤으면 고친 계획으로 정리한다 (F06-04)
    onClick: (event) => runApply(currentPlan(plan), actions, event.currentTarget, slot),
  });
  buttons.appendChild(applyButton);

  slot.append(logo, text, buttons);

  // 자세히 보기에서 고친 계획이 있으면 그 요약을 보인다 (F06-04)
  cardPlan = plan;
  cardDesc = desc;
  cardApply = applyButton;
  updateCard();
}

// 첫 정리 카드의 요약과 [정리하기]를 지금 계획(고친 것 포함)에 맞춘다
// 범위를 바꿔(F06-04 북마크바 제외·사용자 폴더 포함) 묶을 폴더가 없어지면 [정리하기]를 막는다
function updateCard() {
  if (!cardPlan || !cardDesc || !cardDesc.isConnected) return;
  const plan = currentPlan(cardPlan);
  const ready = plan && plan.type === "folders" && plan.folders.length > 0;
  cardDesc.textContent = ready ? planSummary(plan) : "이 범위로는 묶을 폴더가 없어요. 자세히 보기에서 범위를 바꿔 주세요";
  if (cardApply) cardApply.disabled = !ready;
}

// [정리하기]를 눌렀을 때: applyPlan으로 실제 정리 → 상태 저장 → 결과 안내 (actions.showResultNotice)
async function runApply(plan, actions, triggerButton, slot) {
  if (triggerButton) triggerButton.disabled = true;
  try {
    const entry = await applyPlan(plan, "first");
    await setFirstCard("done");
    clearSlot(slot);
    // 열려 있던 자세히 보기 창이 있으면 닫는다
    const dialog = document.getElementById(ORGANIZE_DIALOG_ID);
    if (dialog && typeof dialog.close === "function" && dialog.open) dialog.close();
    // 화면 파일을 직접 부르지 않고 render.js가 넘겨 준 동작을 부른다
    if (actions && typeof actions.showResultNotice === "function") {
      actions.showResultNotice(entry);
    }
  } catch (error) {
    console.error("정리에 실패했어요", error);
    showToast("정리하지 못했어요");
    if (triggerButton) triggerButton.disabled = false;
  }
}

// N31: 자세히 보기와 [정리하기] 창
export function showOrganizeDialog(plan, actions) {
  const host = document.getElementById(DIALOG_HOST_ID);
  if (!host || !plan) return;
  // 새 북마크 정리 창 (F10, 명세 v20): 같은 함수를 다시 쓰고 plan.type "new"로 나눈다
  if (plan.type === "new") {
    showNewOrganizeDialog(host, plan, actions);
    return;
  }
  if (plan.type !== "folders") return;

  // 이미 열려 있으면 다시 만들지 않는다 (멱등)
  const existing = document.getElementById(ORGANIZE_DIALOG_ID);
  if (existing) existing.remove();

  const dialog = document.createElement("dialog");
  dialog.className = "dialog";
  dialog.id = ORGANIZE_DIALOG_ID;

  const panel = document.createElement("div");
  panel.className = "dialog__panel";

  // 머리말
  const header = document.createElement("div");
  header.className = "dialog__header";
  const headText = document.createElement("div");
  const title = document.createElement("div");
  title.className = "dialog__title";
  const titleLogo = document.createElement("span");
  titleLogo.className = "brand__logo brand__logo--soft";
  titleLogo.appendChild(icon("sparkles", 16));
  title.append(titleLogo, document.createTextNode("북마크 정리하기"));
  const subtitle = document.createElement("div");
  subtitle.className = "dialog__subtitle";
  subtitle.textContent = "정리하기를 누르기 전까지 기존 북마크는 바뀌지 않아요.";
  headText.append(title, subtitle);
  const closeButton = makeButton("", { variant: "btn--icon", ariaLabel: "창 닫기" });
  closeButton.appendChild(icon("close", 20));
  closeButton.addEventListener("click", () => dialog.close());
  header.append(headText, closeButton);

  // 본문: 정리 범위 + 폴더별 근거 + 북마크 목록 (F06-04)
  // 범위(북마크바 제외·사용자 폴더 포함)를 바꾸면 render.js가 넘긴 actions.replan으로 계획을 새로 세운다 (cards.js는 plan.js를 부르지 않는다)
  // 폴더 빼기·이름 바꾸기·북마크별 폴더 바꾸기는 그 계획 위에서 고친다
  // 고친 내용은 계획과 화면의 개수만 바꾸고 크롬 북마크는 바꾸지 않는다. [정리하기]를 눌러야 옮긴다
  const base = plan;
  const canReplan = Boolean(actions && typeof actions.replan === "function");
  // 넣을 수 있는 사용자 폴더 목록은 창을 열 때 한 번 받는다
  const includable = canReplan ? (scopeOf(base)?.folders ?? safeReplan(actions, DEFAULT_SCOPE)?.folders ?? []) : [];
  const body = document.createElement("div");
  body.className = "dialog__body";

  // 범위를 바꾼다: 새 계획을 받아 기억하고 다시 그린다. 앞에서 고친 내용(빼기·이름·옮기기)은 새 계획에서 처음부터 시작한다
  function setScope(next) {
    const result = safeReplan(actions, next);
    if (!result || !result.plan) {
      showToast("정리 범위를 바꾸지 못했어요", { container: dialog });
      return;
    }
    if (isDefaultScope(next)) scopes.delete(base);
    else scopes.set(base, { options: next, plan: result.plan, folders: includable });
    changed();
  }

  // 고칠 때마다 본문을 다시 그린다 (열린 창은 그대로 둔다)
  function redraw() {
    body.replaceChildren();
    if (canReplan) body.appendChild(renderScopeBox(scopeOf(base)?.options ?? DEFAULT_SCOPE, includable, setScope));

    const current = effectivePlan(base);
    // 바꾼 범위로는 폴더 계획이 안 나오면(정리 대상이 적거나 3개 이상 모인 종류가 없음) 정리할 수 없다
    if (!current || current.type !== "folders" || current.folders.length === 0) {
      const none = document.createElement("div");
      none.className = "organize__rest";
      none.textContent = "이 범위로는 묶을 폴더가 없어요. 위에서 범위를 바꿔 주세요.";
      body.appendChild(none);
      const footer = document.createElement("div");
      footer.className = "actions actions--end organize__footer";
      const blocked = makeButton("정리하기", { variant: "btn--primary" });
      blocked.disabled = true;
      footer.append(makeButton("취소", { variant: "btn--ghost", onClick: () => dialog.close() }), blocked);
      body.appendChild(footer);
      return;
    }

    const draft = draftOf(current);
    const edited = buildPlan(draft);

    draft.folders.forEach((folder, index) => {
      body.appendChild(renderEditableFolder(draft, index, { dialog, onChange: changed }));
    });
    // "폴더에 넣지 않기"로 뺀 북마크. 여기서 다시 폴더를 고를 수 있다
    if (draft.none.length > 0) body.appendChild(renderNoneBlock(draft, changed));

    // "나머지 N개는 그대로" 안내. 뺀 폴더와 "폴더에 넣지 않기"로 둔 북마크도 여기에 센다
    if (edited.rest > 0) {
      const restNote = document.createElement("div");
      restNote.className = "organize__rest";
      restNote.textContent = `나머지 ${edited.rest}개는 애매하게 분류하지 않고 지금 위치에 그대로 둘게요.`;
      body.appendChild(restNote);
    }

    // 바닥 버튼 (오른쪽 정렬). 만들 폴더가 하나도 없으면 [정리하기]를 누를 수 없다
    const footer = document.createElement("div");
    footer.className = "actions actions--end organize__footer";
    const applyButton = makeButton("정리하기", {
      variant: "btn--primary",
      onClick: (event) => runApply(buildPlan(draft), actions, event.currentTarget, document.getElementById(SLOT_ID)),
    });
    if (edited.folders.length === 0) {
      applyButton.disabled = true;
      const none = document.createElement("div");
      none.className = "organize__rest";
      none.textContent = "만들 폴더가 없어요. 뺀 폴더를 [다시 넣기]로 되살려 주세요.";
      body.appendChild(none);
    }
    footer.append(makeButton("취소", { variant: "btn--ghost", onClick: () => dialog.close() }), applyButton);
    body.appendChild(footer);
  }

  // 고친 뒤: 본문을 다시 그리고, 첫 정리 카드의 요약도 맞춘다 (카드는 이 파일의 칸이다)
  function changed() {
    redraw();
    if (cardPlan === base) updateCard();
  }
  redraw();

  panel.append(header, body);
  dialog.appendChild(panel);
  // 바깥(backdrop) 클릭으로 닫기
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  // 닫히면 DOM에서 치운다
  dialog.addEventListener("close", () => dialog.remove());

  host.appendChild(dialog);
  dialog.showModal();
}

// ----- 자세히 보기 편집 (F06-04) -----
// 고친 계획은 원래 계획(plan 객체)별로 기억한다. 북마크가 바뀌어 render.js가 새 계획으로 카드를 다시 그리면 새 계획으로 시작한다
// draft = { base, folders: [{ name, removed, entries: [{ bookmark, reason }] }], none: [{ bookmark, reason }] }
//   removed: [폴더 빼기]로 뺀 폴더. 북마크는 나머지(그대로)로 센다. [다시 넣기]로 되살린다
//   none: 북마크별로 "폴더에 넣지 않기"를 고른 북마크
const drafts = new WeakMap();
let cardPlan = null; // 지금 첫 정리 카드에 그린 계획
let cardDesc = null; // 그 카드의 요약 줄 (자세히 보기에서 고치면 같이 바꾼다)
let cardApply = null; // 그 카드의 [정리하기] (바꾼 범위로 묶을 폴더가 없으면 막는다)
const NONE = ""; // 북마크별 폴더 바꾸기의 "폴더에 넣지 않기" 값

// ----- 정리 범위 (F06-04 북마크바 제외·사용자 폴더 포함) -----
// 범위를 바꾸면 처음 계획(render.js가 기본 범위로 세운 것)별로 { options, plan, folders }를 기억한다
// options: getTargets(N19)의 { excludeBar, includeFolderIds }. 기본 범위로 돌아오면 지운다
const scopes = new WeakMap();
const DEFAULT_SCOPE = { excludeBar: false, includeFolderIds: [] };

function scopeOf(base) {
  return scopes.get(base) ?? null;
}

function isDefaultScope(options) {
  return !options.excludeBar && options.includeFolderIds.length === 0;
}

// 처음 계획에 범위를 적용한 계획 (범위를 안 바꿨으면 처음 계획 그대로)
function effectivePlan(base) {
  return scopeOf(base)?.plan ?? base;
}

// actions.replan(options) → { plan, folders }. 오류가 나도 창이 멈추지 않게 감싼다
function safeReplan(actions, options) {
  try {
    return actions.replan(options);
  } catch (error) {
    console.warn("정리 범위를 바꾸지 못했어요", error);
    return null;
  }
}

// 정리 범위 상자: [ ] 북마크바 바로 아래 북마크는 빼기 / [ ] 사용자 폴더 (안의 북마크 N개도 함께 정리)
// folders는 render.js가 고른 "넣을 수 있는 사용자 폴더" [{ id, title, path, count }]
function renderScopeBox(options, folders, onChange) {
  const box = document.createElement("div");
  box.className = "organize__scope surface";

  const head = document.createElement("div");
  head.className = "organize__scope-title";
  head.textContent = "정리 범위";
  const hint = document.createElement("div");
  hint.className = "organize__reason";
  hint.textContent = "범위를 바꾸면 폴더 계획을 새로 세워요. 아래에서 고친 내용은 처음으로 돌아가요.";
  box.append(head, hint);

  const barLabel = document.createElement("label");
  barLabel.className = "organize__scope-option";
  const barCheck = document.createElement("input");
  barCheck.type = "checkbox";
  barCheck.checked = options.excludeBar;
  barCheck.addEventListener("change", () => {
    onChange({ excludeBar: barCheck.checked, includeFolderIds: [...options.includeFolderIds] });
  });
  const barText = document.createElement("span");
  barText.textContent = "북마크바 바로 아래 북마크는 빼기";
  barLabel.append(barCheck, barText);
  box.appendChild(barLabel);

  if (folders.length > 0) {
    const sub = document.createElement("div");
    sub.className = "organize__scope-sub";
    sub.textContent = "직접 만든 폴더 안의 북마크도 함께 정리하기";
    box.appendChild(sub);
    for (const folder of folders) {
      const label = document.createElement("label");
      label.className = "organize__scope-option";
      const check = document.createElement("input");
      check.type = "checkbox";
      check.checked = options.includeFolderIds.includes(folder.id);
      check.addEventListener("change", () => {
        const ids = options.includeFolderIds.filter((id) => id !== folder.id);
        if (check.checked) ids.push(folder.id);
        onChange({ excludeBar: options.excludeBar, includeFolderIds: ids });
      });
      const text = document.createElement("span");
      const where = Array.isArray(folder.path) && folder.path.length > 0 ? `${folder.path.join(" › ")} › ` : "";
      text.textContent = `${where}${folder.title || "(이름 없음)"} · ${folder.count}개`;
      label.append(check, text);
      box.appendChild(label);
    }
  }
  return box;
}

function draftOf(plan) {
  if (!drafts.has(plan)) {
    drafts.set(plan, {
      base: plan,
      folders: plan.folders.map((folder) => {
        const reasons = Array.isArray(folder.reasons) ? folder.reasons : [];
        return {
          name: folder.name,
          removed: false,
          entries: folder.items.map((bookmark, index) => ({ bookmark, reason: reasons[index] })),
        };
      }),
      none: [],
    });
  }
  return drafts.get(plan);
}

// 고친 계획이 있으면 그 계획을, 없으면 원래 계획을 돌려준다. 범위를 바꿨으면 바꾼 범위의 계획에서 고친 것이다
function currentPlan(plan) {
  const current = effectivePlan(plan);
  if (!current || current.type !== "folders") return current;
  return drafts.has(current) ? buildPlan(drafts.get(current)) : current;
}

// 고친 내용으로 applyPlan에 넘길 계획을 만든다 (N20과 같은 모양 { type: "folders", folders: [{ name, items, reasons }], rest })
// 뺀 폴더와 비어 버린 폴더는 넣지 않고, 그 북마크는 rest에 센다
function buildPlan(draft) {
  const folders = [];
  let rest = restCount(draft.base) + draft.none.length;
  for (const folder of draft.folders) {
    if (folder.removed) {
      rest += folder.entries.length;
      continue;
    }
    if (folder.entries.length === 0) continue;
    folders.push({
      name: folder.name,
      items: folder.entries.map((entry) => entry.bookmark),
      reasons: folder.entries.map((entry) => entry.reason),
    });
  }
  return { type: "folders", folders, rest };
}

// 폴더 이름이 쓸 수 있는지. 쓸 수 없으면 안내 문구를 돌려준다
function checkFolderName(draft, index, name) {
  if (name === "") return "폴더 이름을 입력해 주세요";
  const key = name.toLowerCase();
  const taken = draft.folders.some((folder, i) => i !== index && !folder.removed && folder.name.trim().toLowerCase() === key);
  return taken ? "같은 이름의 폴더가 이미 계획에 있어요" : null;
}

// 폴더 하나의 블록: 이름(바꿀 수 있음) · 개수 · [폴더 빼기] · 분류 근거(F06-03) + 북마크 목록(제목 키워드엔 "확인 필요" F06-05)
function renderEditableFolder(draft, index, { dialog, onChange }) {
  const folder = draft.folders[index];
  const block = document.createElement("div");
  block.className = folder.removed ? "organize__folder organize__folder--removed surface" : "organize__folder surface";

  const head = document.createElement("div");
  head.className = "organize__folder-head";

  // 뺀 폴더는 이름과 [다시 넣기]만 보인다
  if (folder.removed) {
    const name = document.createElement("div");
    name.className = "folder__name organize__folder-name";
    name.textContent = folder.name;
    const note = document.createElement("div");
    note.className = "folder__count";
    note.textContent = `만들지 않아요 · ${folder.entries.length}개는 그대로`;
    const restore = makeButton("다시 넣기", {
      variant: "btn--ghost",
      onClick: () => {
        // 다시 넣을 때 이름이 다른 폴더와 겹치면 되살리지 않는다
        const problem = checkFolderName(draft, index, folder.name.trim());
        if (problem) {
          showToast(problem, { container: dialog });
          return;
        }
        folder.removed = false;
        onChange();
      },
    });
    head.append(name, note, restore);
    block.append(head);
    return block;
  }

  // 폴더 이름 바꾸기: 입력을 마치면(change) 반영한다. 빈 이름이나 겹치는 이름이면 되돌리고 안내한다
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "folder__name organize__folder-name organize__name-input";
  nameInput.value = folder.name;
  nameInput.maxLength = 40;
  nameInput.setAttribute("aria-label", `${folder.name} 폴더 이름`);
  nameInput.addEventListener("change", () => {
    const next = nameInput.value.trim();
    const problem = checkFolderName(draft, index, next);
    if (problem) {
      showToast(problem, { container: dialog });
      nameInput.value = folder.name;
      return;
    }
    if (next === folder.name) return;
    folder.name = next;
    onChange();
  });

  const count = document.createElement("div");
  count.className = "folder__count";
  count.textContent = `${folder.entries.length}개 이동`;

  const removeButton = makeButton("폴더 빼기", {
    variant: "btn--ghost",
    ariaLabel: `${folder.name} 폴더 빼기`,
    onClick: () => {
      folder.removed = true;
      onChange();
    },
  });
  head.append(nameInput, count, removeButton);
  block.append(head);

  // F06-03: 폴더별 분류 근거 요약
  const summary = folderReasonSummary({ reasons: folder.entries.map((entry) => entry.reason) });
  if (summary) {
    const reasonLine = document.createElement("div");
    reasonLine.className = "organize__reason";
    reasonLine.textContent = `분류 근거: ${summary}`;
    block.append(reasonLine);
  }

  const list = document.createElement("div");
  list.className = "list";
  if (folder.entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-note";
    empty.textContent = "이 폴더에 넣을 북마크가 없어서 만들지 않아요";
    list.appendChild(empty);
  }
  for (const entry of folder.entries) {
    list.appendChild(renderBookmarkRow(entry.bookmark, entry.reason, moveSelect(draft, index, entry, onChange)));
  }
  block.append(list);

  return block;
}

// "폴더에 넣지 않기"로 뺀 북마크 묶음. 각 줄에서 다시 폴더를 고를 수 있다
function renderNoneBlock(draft, onChange) {
  const block = document.createElement("div");
  block.className = "organize__folder organize__folder--removed surface";
  const head = document.createElement("div");
  head.className = "organize__folder-head";
  const name = document.createElement("div");
  name.className = "folder__name organize__folder-name";
  name.textContent = "폴더에 넣지 않는 북마크";
  const count = document.createElement("div");
  count.className = "folder__count";
  count.textContent = `${draft.none.length}개는 그대로`;
  head.append(name, count);
  const list = document.createElement("div");
  list.className = "list";
  for (const entry of draft.none) {
    list.appendChild(renderBookmarkRow(entry.bookmark, entry.reason, moveSelect(draft, null, entry, onChange)));
  }
  block.append(head, list);
  return block;
}

// 북마크별 폴더 바꾸기: 계획 안의 다른 폴더 또는 "폴더에 넣지 않기"로 옮긴다. 근거(reason)도 함께 옮긴다
// fromIndex가 null이면 지금 "폴더에 넣지 않기"에 있는 북마크다
function moveSelect(draft, fromIndex, entry, onChange) {
  const select = document.createElement("select");
  select.className = "organize-new__select organize__move";
  select.setAttribute("aria-label", `${entry.bookmark.title || entry.bookmark.url || "북마크"}을 넣을 폴더`);
  draft.folders.forEach((folder, index) => {
    if (folder.removed) return;
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = folder.name;
    select.appendChild(option);
  });
  const none = document.createElement("option");
  none.value = NONE;
  none.textContent = "폴더에 넣지 않기";
  select.appendChild(none);
  select.value = fromIndex === null ? NONE : String(fromIndex);

  select.addEventListener("change", () => {
    if (select.value === (fromIndex === null ? NONE : String(fromIndex))) return;
    const from = fromIndex === null ? draft.none : draft.folders[fromIndex].entries;
    const at = from.indexOf(entry);
    if (at < 0) return;
    from.splice(at, 1);
    if (select.value === NONE) draft.none.push(entry);
    else draft.folders[Number(select.value)].entries.push(entry);
    onChange();
  });
  return select;
}

// 북마크 한 줄: 아이콘 + 제목/주소 (+ "확인 필요") (+ 폴더 고르기). 제목·주소는 textContent로만 넣는다 (innerHTML 금지)
function renderBookmarkRow(bookmark, reason, control) {
  const row = document.createElement("div");
  row.className = "list__row";

  row.appendChild(appIcon(bookmark, 44));

  const text = document.createElement("div");
  text.className = "list__text";
  const title = document.createElement("span");
  title.className = "title";
  title.textContent = bookmark.title || bookmark.url || "";
  const meta = document.createElement("span");
  meta.className = "meta";
  meta.textContent = bookmark.url || "";
  text.append(title, meta);
  row.appendChild(text);

  if (needsCheck(reason)) {
    const flag = document.createElement("span");
    flag.className = "organize__check";
    flag.textContent = "확인 필요";
    row.appendChild(flag);
  }

  if (control) row.appendChild(control);

  return row;
}

// ----- 새 북마크 정리 창 (F10-04·05·06·07) -----
// plan = { type: "new", items: [{ bookmark, folderId }], folders: [{ id, title }], newFolders: [{ name, items }] } (file-structure.md 12번, 명세 v20)
// - items: 새 북마크와 추천 폴더. folderId가 null이면 '그대로 두기'가 기본이다 (F10-07)
// - folders: 고를 수 있는 기존 폴더 (loadTree의 폴더 항목). 관리자 폴더는 옮길 수 없어 목록에서 뺀다
// - newFolders: "폴더로 만들까요?" 제안 (F10-06). 받아들이면 그 폴더를 새로 만들고, 제안에 든 북마크를 넣는다
// [정리하기]는 applyPlan({ folders: [{ folderId 또는 name, items }], keep }, "new")를 부른다 (N22)
const NEW_DIALOG_ID = "dialog-organize-new";
const KEEP = ""; // '그대로 두기'의 값

function showNewOrganizeDialog(host, plan, actions) {
  const items = (Array.isArray(plan.items) ? plan.items : []).filter((item) => item && item.bookmark && item.bookmark.id != null);
  const folders = (Array.isArray(plan.folders) ? plan.folders : []).filter(
    (folder) => folder && folder.id != null && folder.rootType !== "managed",
  );
  const folderIds = new Set(folders.map((folder) => String(folder.id)));
  const suggestions = (Array.isArray(plan.newFolders) ? plan.newFolders : []).filter(
    (suggestion) => suggestion && typeof suggestion.name === "string" && suggestion.name.trim() && Array.isArray(suggestion.items),
  );

  // 이미 열려 있으면 새로 만든다 (멱등)
  document.getElementById(NEW_DIALOG_ID)?.remove();

  const dialog = document.createElement("dialog");
  dialog.className = "dialog";
  dialog.id = NEW_DIALOG_ID;

  const panel = document.createElement("div");
  panel.className = "dialog__panel";

  // 머리말
  const header = document.createElement("div");
  header.className = "dialog__header";
  const headText = document.createElement("div");
  const title = document.createElement("div");
  title.className = "dialog__title";
  const titleLogo = document.createElement("span");
  titleLogo.className = "brand__logo brand__logo--soft";
  titleLogo.appendChild(icon("sparkles", 16));
  title.append(titleLogo, document.createTextNode("새 북마크 정리"));
  const subtitle = document.createElement("div");
  subtitle.className = "dialog__subtitle";
  subtitle.textContent = "추천 폴더를 확인하고 필요한 항목만 바꿔 주세요.";
  headText.append(title, subtitle);
  const closeButton = makeButton("", { variant: "btn--icon", ariaLabel: "창 닫기" });
  closeButton.appendChild(icon("close", 20));
  closeButton.addEventListener("click", () => dialog.close());
  header.append(headText, closeButton);

  const body = document.createElement("div");
  body.className = "dialog__body";

  // 새 북마크마다 고른 목적지. 값: "" (그대로 두기) | "f:<폴더 ID>" (기존 폴더) | "n:<이름>" (새 폴더)
  const defaults = new Map();
  const choice = new Map();
  for (const { bookmark, folderId } of items) {
    const id = String(bookmark.id);
    // 추천 폴더가 없거나 고를 수 없는 폴더면 '그대로 두기' (F10-07)
    const value = folderId != null && folderIds.has(String(folderId)) ? `f:${folderId}` : KEEP;
    defaults.set(id, value);
    choice.set(id, value);
  }
  const accepted = new Set(); // 받아들인 새 폴더 제안의 이름
  const selects = new Map(); // 북마크 ID → <select>

  if (items.length === 0) {
    const none = document.createElement("p");
    none.className = "empty-note";
    none.textContent = "새로 정리할 북마크가 없어요";
    body.appendChild(none);
  } else {
    // F10-06: "폴더로 만들까요?" 제안. 누르면 받아들이고, 다시 누르면 취소한다
    if (suggestions.length > 0) {
      const suggestBox = document.createElement("div");
      suggestBox.className = "organize-new__suggest";
      for (const suggestion of suggestions) {
        const name = suggestion.name.trim();
        const memberIds = suggestion.items.map((item) => String(item && typeof item === "object" ? item.id : item));
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "list__row organize-new__suggest-row";
        toggle.setAttribute("aria-pressed", "false");
        const folderIcon = icon("folder", 18);
        const text = document.createElement("div");
        text.className = "list__text";
        const line = document.createElement("span");
        line.className = "title";
        line.textContent = `"${name}" 폴더로 만들까요?`;
        const meta = document.createElement("span");
        meta.className = "meta";
        meta.textContent = `같은 종류의 북마크 ${memberIds.length}개를 새 폴더에 모아요`;
        text.append(line, meta);
        const check = document.createElement("span");
        check.className = "picker__check";
        check.appendChild(icon("check", 18));
        toggle.append(folderIcon, text, check);
        toggle.addEventListener("click", () => {
          const on = !accepted.has(name);
          if (on) accepted.add(name);
          else accepted.delete(name);
          toggle.setAttribute("aria-pressed", String(on));
          // 제안에 든 새 북마크는 받아들이면 그 새 폴더로, 취소하면 원래 기본값으로 돌린다
          for (const id of memberIds) {
            if (!choice.has(id)) continue;
            if (on) choice.set(id, `n:${name}`);
            else if (choice.get(id) === `n:${name}`) choice.set(id, defaults.get(id));
          }
          refreshSelects();
        });
        suggestBox.appendChild(toggle);
      }
      body.appendChild(suggestBox);
    }

    // F10-04: 새 북마크 목록. 추천 폴더가 미리 골라져 있다
    const list = document.createElement("div");
    list.className = "list";
    for (const { bookmark } of items) {
      const id = String(bookmark.id);
      const row = document.createElement("div");
      row.className = "list__row organize-new__row";
      row.appendChild(appIcon(bookmark, 44));

      const text = document.createElement("div");
      text.className = "list__text";
      const rowTitle = document.createElement("span");
      rowTitle.className = "title";
      rowTitle.textContent = bookmark.title || bookmark.url || "";
      const meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = bookmark.url || "";
      text.append(rowTitle, meta);

      const badge = document.createElement("span");
      badge.className = "badge-new";
      badge.textContent = "new"; // 팀 합의로 영문 표시 (명세 F10-01의 "새로" 표시)

      const select = document.createElement("select");
      select.className = "organize-new__select";
      select.setAttribute("aria-label", `${bookmark.title || bookmark.url || "북마크"}을 넣을 폴더`);
      select.addEventListener("change", () => choice.set(id, select.value));
      selects.set(id, select);

      row.append(text, badge, select);
      list.appendChild(row);
    }
    body.appendChild(list);
  }

  // 고를 수 있는 목적지: 그대로 두기 → 받아들인 새 폴더 → 기존 폴더
  function refreshSelects() {
    for (const [id, select] of selects) {
      const options = [{ value: KEEP, label: "그대로 두기" }];
      for (const name of accepted) options.push({ value: `n:${name}`, label: `새 폴더: ${name}` });
      for (const folder of folders) options.push({ value: `f:${folder.id}`, label: folder.title || "(이름 없음)" });
      select.replaceChildren(
        ...options.map(({ value, label }) => {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = label;
          return option;
        }),
      );
      // 고른 값이 목록에 없으면(받아들인 제안을 취소한 경우 등) 기본값으로 돌린다
      if (!options.some((option) => option.value === choice.get(id))) choice.set(id, defaults.get(id));
      select.value = choice.get(id);
    }
  }
  refreshSelects();

  // 바닥 버튼 (오른쪽 정렬). 정리할 새 북마크가 없으면 [정리하기]를 두지 않는다
  const footer = document.createElement("div");
  footer.className = "actions actions--end organize__footer";
  footer.appendChild(makeButton("취소", { variant: "btn--ghost", onClick: () => dialog.close() }));
  if (items.length > 0) {
    footer.appendChild(
      makeButton("정리하기", {
        variant: "btn--primary",
        onClick: (event) => runApplyNew(buildNewPlan(), actions, event.currentTarget, dialog),
      }),
    );
  }
  body.appendChild(footer);

  // [정리하기]에 넘길 계획을 만든다
  // - 새 북마크는 각자 고른 목적지로. '그대로 두기'는 keep에 넣는다
  // - 받아들인 새 폴더 제안에 든, 새 북마크가 아닌 북마크(폴더 밖에 있던 같은 종류)도 그 새 폴더로 옮긴다 (F10-06)
  function buildNewPlan() {
    const groups = new Map();
    const keep = [];
    const add = (key, target, id) => {
      if (!groups.has(key)) groups.set(key, { ...target, items: [] });
      groups.get(key).items.push(id);
    };
    for (const [id, value] of choice) {
      if (value === KEEP) keep.push(id);
      else if (value.startsWith("f:")) add(value, { folderId: value.slice(2) }, id);
      else if (value.startsWith("n:")) add(value, { name: value.slice(2) }, id);
    }
    for (const suggestion of suggestions) {
      const name = suggestion.name.trim();
      if (!accepted.has(name)) continue;
      for (const item of suggestion.items) {
        const id = String(item && typeof item === "object" ? item.id : item);
        if (choice.has(id)) continue; // 새 북마크는 위에서 고른 목적지를 따른다
        add(`n:${name}`, { name }, id);
      }
    }
    return { folders: [...groups.values()], keep };
  }

  panel.append(header, body);
  dialog.appendChild(panel);
  // 바깥(backdrop) 클릭으로 닫기
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  // 닫히면 DOM에서 치운다
  dialog.addEventListener("close", () => dialog.remove());

  host.appendChild(dialog);
  dialog.showModal();
}

// [정리하기] (F10-05): 한 번에 옮기고, 결과 안내는 render.js가 넘겨 준 동작으로 띄운다
// 모두 '그대로 두기'여서 기록이 남지 않아도 같은 모양의 결과가 오고, 안내 문구("새 북마크를 그대로 뒀어요")는 history.js가 정한다
async function runApplyNew(newPlan, actions, triggerButton, dialog) {
  if (triggerButton) triggerButton.disabled = true;
  try {
    const entry = await applyPlan(newPlan, "new");
    if (dialog.open) dialog.close();
    if (actions && typeof actions.showResultNotice === "function") actions.showResultNotice(entry);
  } catch (error) {
    console.error("새 북마크를 정리하지 못했어요", error);
    showToast("정리하지 못했어요", { container: dialog.open ? dialog : null });
    if (triggerButton) triggerButton.disabled = false;
  }
}

// N31: 고정할 북마크 고르기 창 (F09-05·06, F08-06)
// bookmarks: 고를 수 있는 북마크. 이미 고정한 북마크는 부르는 쪽이 뺀다 (file-structure.md 12번: 넘길 값은 고를 수 있는 북마크 목록)
// options: { max, limitMessage, onPicked }
//   max: 고를 수 있는 최대 개수 (고정 제안의 [고르기]는 5, 독의 [+]는 10에서 이미 고정한 수를 뺀 값)
//   limitMessage: 최대 개수를 넘겨 고르려 할 때 창 안에 띄울 문구
//   onPicked(ids): 고정이 끝난 뒤 실제로 고정된 북마크 ID 배열과 함께 부른다
// 고르고 [고정하기]를 누르면 store.js의 pin으로 독에 넣는다. 독은 저장이 바뀌면 render.js가 다시 그린다
export function showPinPicker(bookmarks, { max = 5, limitMessage, onPicked } = {}) {
  const host = document.getElementById(DIALOG_HOST_ID);
  if (!host) return;

  const items = (Array.isArray(bookmarks) ? bookmarks : []).filter((bookmark) => bookmark && bookmark.id != null);
  const limit = Number.isFinite(max) ? Math.max(0, Math.floor(max)) : 5;
  const message = limitMessage ?? `최대 ${limit}개까지 고를 수 있어요`;

  // 이미 열려 있으면 새로 만든다 (멱등)
  const existing = document.getElementById(PIN_PICKER_ID);
  if (existing) existing.remove();

  const dialog = document.createElement("dialog");
  dialog.className = "dialog";
  dialog.id = PIN_PICKER_ID;

  const panel = document.createElement("div");
  panel.className = "dialog__panel";

  // 머리말
  const header = document.createElement("div");
  header.className = "dialog__header";
  const headText = document.createElement("div");
  const title = document.createElement("div");
  title.className = "dialog__title";
  const titleLogo = document.createElement("span");
  titleLogo.className = "brand__logo brand__logo--soft";
  titleLogo.appendChild(icon("bookmark", 16));
  title.append(titleLogo, document.createTextNode("고정할 북마크 고르기"));
  const subtitle = document.createElement("div");
  subtitle.className = "dialog__subtitle";
  subtitle.textContent = `고정됨에 추가할 북마크를 고르세요. 최대 ${limit}개까지 고를 수 있어요.`;
  headText.append(title, subtitle);
  const closeButton = makeButton("", { variant: "btn--icon", ariaLabel: "창 닫기" });
  closeButton.appendChild(icon("close", 20));
  closeButton.addEventListener("click", () => dialog.close());
  header.append(headText, closeButton);

  const body = document.createElement("div");
  body.className = "dialog__body";

  // 고른 북마크 ID. Set은 넣은 순서를 지키므로 고른 순서대로 고정된다
  const selected = new Set();
  const confirmButton = makeButton("고정하기", { variant: "btn--primary" });
  confirmButton.disabled = true;

  function refreshConfirm() {
    confirmButton.disabled = selected.size === 0;
    confirmButton.textContent = selected.size > 0 ? `고정하기 · ${selected.size}` : "고정하기";
  }

  // 목록
  const list = document.createElement("div");
  list.className = "list picker__list";
  if (items.length === 0) {
    const none = document.createElement("p");
    none.className = "empty-note";
    none.textContent = "고를 수 있는 북마크가 없어요";
    list.appendChild(none);
  }
  // 검색칸이 줄을 숨기고 보일 수 있게 [{ id, row }]를 모아 둔다 (F09-10)
  const rows = [];
  for (const bookmark of items) {
    const id = String(bookmark.id);
    const row = document.createElement("button");
    row.type = "button";
    row.className = "list__row picker__row";
    row.setAttribute("aria-pressed", "false");
    row.appendChild(appIcon(bookmark, 44));

    const text = document.createElement("div");
    text.className = "list__text";
    const rowTitle = document.createElement("span");
    rowTitle.className = "title";
    rowTitle.textContent = bookmark.title || bookmark.url || "";
    const meta = document.createElement("span");
    meta.className = "meta";
    meta.textContent = bookmark.url || "";
    text.append(rowTitle, meta);
    row.appendChild(text);

    if (bookmark.folderTitle) {
      const folder = document.createElement("span");
      folder.className = "picker__folder";
      folder.textContent = bookmark.folderTitle;
      row.appendChild(folder);
    }

    const check = document.createElement("span");
    check.className = "picker__check";
    check.appendChild(icon("check", 18));
    row.appendChild(check);

    row.addEventListener("click", () => {
      if (selected.has(id)) {
        selected.delete(id);
      } else {
        // 최대 개수를 넘겨서는 고를 수 없다. 팝업 안에 안내를 띄운다 (showModal이라 #toast는 배경 뒤에 가려진다)
        if (selected.size >= limit) {
          showToast(message, { container: dialog });
          return;
        }
        selected.add(id);
      }
      row.setAttribute("aria-pressed", String(selected.has(id)));
      refreshConfirm();
    });
    list.appendChild(row);
    rows.push({ id, row });
  }

  // 고정 고르기 검색칸 (F09-10): 고를 북마크가 있을 때만 목록 위에 둔다
  // 줄을 숨기기만 하고 고른 상태(selected, aria-pressed)와 [고정하기]는 그대로 둔다
  if (items.length > 0) {
    const noMatch = document.createElement("p");
    noMatch.className = "empty-note hidden";
    noMatch.textContent = "일치하는 북마크가 없어요";
    list.appendChild(noMatch);

    const search = document.createElement("label");
    search.className = "bookmark-search";
    search.appendChild(icon("search", 16));
    const input = document.createElement("input");
    input.type = "search";
    input.name = "picker-q";
    input.placeholder = "제목이나 주소로 찾기";
    input.setAttribute("aria-label", "고정할 북마크 찾기");
    search.appendChild(input);
    input.addEventListener("input", () => {
      // 한글 입력 중간(예: "네이ㅂ")에 결과가 없어도 창이 줄었다 늘었다 하지 않게 처음 높이를 유지한다 (F09-10)
      if (!list.style.minHeight) list.style.minHeight = `${list.offsetHeight}px`;
      const query = input.value;
      if (query.trim() === "") {
        for (const { row } of rows) row.classList.remove("hidden");
        noMatch.classList.add("hidden");
        return;
      }
      const matched = new Set(searchBookmarks(query, items).map((bookmark) => String(bookmark.id)));
      // row.hidden은 .list__row의 display:flex에 덮여 안 숨겨지므로 hidden 클래스를 쓴다
      for (const { id, row } of rows) row.classList.toggle("hidden", !matched.has(id));
      noMatch.classList.toggle("hidden", matched.size > 0);
    });
    body.appendChild(search);
  }
  body.appendChild(list);

  // 바닥 버튼 (오른쪽 정렬)
  const footer = document.createElement("div");
  footer.className = "actions actions--end organize__footer";
  confirmButton.addEventListener("click", async () => {
    confirmButton.disabled = true;
    const pinned = [];
    let full = false;
    try {
      for (const id of selected) {
        // 독이 이미 10개면 pin이 false를 돌려준다 (다른 탭에서 고정했을 때도 여기서 걸러진다)
        if (await pin(id)) {
          pinned.push(id);
        } else {
          full = true;
          break;
        }
      }
    } catch (error) {
      console.warn("고정하지 못했어요", error);
    }
    if (pinned.length === 0) {
      // 하나도 고정하지 못했으면 창을 닫지 않고 이유를 알린다
      showToast(full ? "고정은 10개까지 할 수 있어요" : "고정하지 못했어요", { container: dialog });
      refreshConfirm();
      return;
    }
    dialog.close();
    showToast(full ? `${pinned.length}개만 추가했어요. 고정은 10개까지 할 수 있어요` : `${pinned.length}개를 고정됨에 추가했어요`);
    if (typeof onPicked === "function") onPicked(pinned);
  });
  footer.append(makeButton("취소", { variant: "btn--ghost", onClick: () => dialog.close() }), confirmButton);
  body.appendChild(footer);

  panel.append(header, body);
  dialog.appendChild(panel);
  // 바깥(backdrop) 클릭으로 닫기
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  // 닫히면 DOM에서 치운다
  dialog.addEventListener("close", () => dialog.remove());

  host.appendChild(dialog);
  dialog.showModal();
}
