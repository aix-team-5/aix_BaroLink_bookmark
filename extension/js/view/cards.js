// 담당: 팀원 D · 이슈 #17 · 명세: N31 (F06, F09, F10) · 크롬 API: C19~C21
// 화면 파일끼리는 서로 부르지 않는다 (공통 조각은 ui.js). 크롬은 bookmarks.js와 store.js를 거친다 (권한 요청과 topSites만 예외).
// 이 PR은 P1(F06-01~03·05~06)만 다룬다. 고정 제안 카드·고르기 창(F06-07, F09, F10)은 P2 브랜치에서 한다.

import { applyPlan } from "../organize.js";
import { setFirstCard, pin } from "../store.js";
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

  // 폴더 계획만 그린다. 고정 제안(plan.type === "pin")은 P2에서 다룬다 (칸을 비운 채 돌아간다)
  if (plan.type !== "folders" || !Array.isArray(plan.folders) || plan.folders.length === 0) return;

  renderFolderCard(slot, plan, actions);
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
  desc.textContent = planSummary(plan);

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
    makeButton("정리하기", {
      variant: "btn--primary",
      onClick: (event) => runApply(plan, actions, event.currentTarget, slot),
    }),
  );

  slot.append(logo, text, buttons);
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
  if (!host || !plan || plan.type !== "folders") return;

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

  // 본문: 폴더별 근거 + 북마크 목록
  const body = document.createElement("div");
  body.className = "dialog__body";
  for (const folder of plan.folders) {
    body.appendChild(renderFolderBlock(folder));
  }

  // "나머지 N개는 그대로" 안내
  const rest = restCount(plan);
  if (rest > 0) {
    const restNote = document.createElement("div");
    restNote.className = "organize__rest";
    restNote.textContent = `나머지 ${rest}개는 애매하게 분류하지 않고 지금 위치에 그대로 둘게요.`;
    body.appendChild(restNote);
  }

  // 바닥 버튼 (오른쪽 정렬)
  const footer = document.createElement("div");
  footer.className = "actions actions--end organize__footer";
  footer.append(
    makeButton("취소", { variant: "btn--ghost", onClick: () => dialog.close() }),
    makeButton("정리하기", {
      variant: "btn--primary",
      onClick: (event) => runApply(plan, actions, event.currentTarget, document.getElementById(SLOT_ID)),
    }),
  );
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

// 폴더 하나의 블록: 폴더 이름 · 개수 · 분류 근거(F06-03) + 북마크 목록(제목 키워드엔 "확인 필요" F06-05)
// reasons는 folder 안에 있고 folder.items와 같은 길이다 (명세 N20)
function renderFolderBlock(folder) {
  const block = document.createElement("div");
  block.className = "organize__folder surface";

  const head = document.createElement("div");
  head.className = "organize__folder-head";
  const name = document.createElement("div");
  name.className = "folder__name organize__folder-name";
  name.textContent = folder.name;
  const count = document.createElement("div");
  count.className = "folder__count";
  count.textContent = `${folder.items.length}개 이동`;
  head.append(name, count);

  block.append(head);

  // F06-03: 폴더별 분류 근거 요약
  const summary = folderReasonSummary(folder);
  if (summary) {
    const reasonLine = document.createElement("div");
    reasonLine.className = "organize__reason";
    reasonLine.textContent = `분류 근거: ${summary}`;
    block.append(reasonLine);
  }

  const list = document.createElement("div");
  list.className = "list";
  const reasons = Array.isArray(folder.reasons) ? folder.reasons : [];
  for (const [itemIndex, bookmark] of folder.items.entries()) {
    list.appendChild(renderBookmarkRow(bookmark, reasons[itemIndex]));
  }
  block.append(list);

  return block;
}

// 북마크 한 줄: 아이콘 + 제목/주소 (+ "확인 필요"). 제목·주소는 textContent로만 넣는다 (innerHTML 금지)
function renderBookmarkRow(bookmark, reason) {
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

  return row;
}

// N31: 고정할 북마크 고르기 창 (F09-05·06, F08-06)
// bookmarks: 고를 수 있는 북마크. 이미 고정한 북마크는 부르는 쪽이 뺀다 (file-structure.md 12번: 넘길 값은 고를 수 있는 북마크 목록)
// options: { max, limitMessage, onPicked }
//   max: 고를 수 있는 최대 개수 (고정 제안의 [고르기]는 5, 독의 [+]는 8에서 이미 고정한 수를 뺀 값)
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
        // 독이 이미 8개면 pin이 false를 돌려준다 (다른 탭에서 고정했을 때도 여기서 걸러진다)
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
      showToast(full ? "고정은 8개까지 할 수 있어요" : "고정하지 못했어요", { container: dialog });
      refreshConfirm();
      return;
    }
    dialog.close();
    showToast(full ? `${pinned.length}개만 추가했어요. 고정은 8개까지 할 수 있어요` : `${pinned.length}개를 고정됨에 추가했어요`);
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
