# 개발 준비 안내: 개발환경 설정과 AI에 넣을 내용

> 바로링크 (BaroLink) · 저장소 https://github.com/parkhyun0701-oss/aix_BaroLink_bookmark
> 작성일: 2026-10-07 · 기준: 명세 v14
> 이 문서는 팀원이 개발을 시작하기 전에 읽는다. AI 도구에 통째로 넣어도 된다.
> 자세한 규칙은 저장소의 `AGENTS.md`(AI용), `docs/conventions.md`(사람용), `docs/setup.md`(준비)에 있다. 이 문서와 다르면 저장소의 문서가 맞다.

---

## 0. 프로젝트 한 줄 요약

크롬 북마크를 새 탭에 앱과 앱 폴더로 보여 주고, 잊고 있던 북마크를 다시 꺼내 주며, 한 번 확인으로 크롬 북마크에 실제로 정리해 주는 크롬 확장 프로그램이다.

- Manifest V3, 크롬 134 이상
- HTML, CSS, JavaScript(ES 모듈)를 빌드 없이 `extension/` 폴더째 크롬에 올린다
- 서버, 데이터베이스, React, npm 패키지, CDN을 쓰지 않는다
- 네 명이 파일을 나눠 맡는다. 한 파일은 한 사람이다

---

## 1. 개발환경 설정

### 1-1. 저장소 주인이 한 번만 하는 것

| 할 일 | 위치 |
|---|---|
| 팀원 세 명 초대 | Settings → Collaborators |
| Squash만 허용, 합친 브랜치 자동 삭제 | Settings → General → Pull Requests |
| `main` 보호가 켜져 있는지 확인, 필수 검사에 `check` 추가 | Settings → Rules → Rulesets |
| CodeRabbit 설치 (이 저장소만 선택) | https://app.coderabbit.ai |
| README 담당 표에 GitHub 아이디 네 개 채우기 | 첫 연습 PR로 |

### 1-2. 설치할 것

| 무엇 | 필수 | 용도 |
|---|---|---|
| 크롬 134 이상 | 필수 | 실행과 확인. 버전은 `chrome://version` |
| Git (윈도우는 Git for Windows) | 필수 | Git Bash가 함께 설치된다 |
| VS Code | 권장 | 저장소의 공통 설정(들여쓰기 2칸 등)이 자동으로 적용된다 |
| GitHub CLI (`gh`) | 선택 | AI 도구가 이슈를 직접 읽을 수 있다 |
| Node.js | 선택 | 올리기 전에 자동 검사를 직접 돌릴 수 있다 |

### 1-3. 팀원 각자의 준비 순서

명령은 Git Bash에서 한 줄씩 실행한다. 여러 줄을 한꺼번에 붙여 넣으면 첫 줄이 실패할 수 있다.

1. GitHub에서 저장소 초대를 수락한다.
2. GitHub → 프로필 사진 → Settings → Emails에서 "Keep my email addresses private"를 켠다. 그 화면에 보이는 `숫자+아이디@users.noreply.github.com` 주소를 복사한다.
3. Git을 설정한다. 공개 저장소라서 실제 이름과 개인 메일은 쓰지 않는다.
   ```bash
   git config --global user.name "내GitHub아이디"
   git config --global user.email "숫자+아이디@users.noreply.github.com"
   git config --global pull.rebase false
   ```
4. 저장소를 받는다. 다운로드 폴더가 아닌 곳에 받는다.
   ```bash
   mkdir ~/barolink
   cd ~/barolink
   git clone https://github.com/parkhyun0701-oss/aix_BaroLink_bookmark.git
   cd aix_BaroLink_bookmark
   ```
   프롬프트 끝에 `(main)`이 보이면 저장소 폴더 안에 있는 것이다. 보이지 않으면 `git` 명령이 모두 실패한다.
5. VS Code에서 이 폴더를 연다.
6. 크롬에서 테스트용 프로필을 만든다. 로그인하지 않는다. 이 확장 프로그램은 크롬 북마크를 실제로 바꾸므로 평소 쓰는 프로필에는 올리지 않는다.
7. 테스트용 프로필의 북마크 관리자(`chrome://bookmarks`)에서 점 3개 메뉴 → "북마크 가져오기"로 `tests/sample-100.html`을 넣는다. 북마크바에 북마크 74개와 폴더 2개(`졸업프로젝트`, `알바·취준`)가 있고, 맨 끝에 "가져온 북마크" 폴더(북마크 16개와 `자취템` 폴더)가 생기면 정상이다.
8. `chrome://extensions`에서 개발자 모드를 켜고 "압축해제된 확장 프로그램을 로드합니다"로 `extension/` 폴더를 고른다. 새 탭에 "바로링크 (BaroLink) · 뼈대만 있는 상태입니다"가 보이면 된다.
9. 첫 연습 PR을 올린다(`docs/setup.md` 10번). 자기 파일 하나의 맨 위 주석에 GitHub 아이디를 적는 PR이다.

### 1-4. 코드를 고친 뒤 확인하는 법

- `chrome://extensions`에서 확장 프로그램 카드의 새로고침 버튼을 누르고 새 탭을 다시 연다.
- 새 탭 화면의 오류는 F12 → Console에서 본다.
- 서비스 워커(`background.js`)의 오류는 `chrome://extensions` → 카드의 "서비스 워커" 링크에서 본다.
- 새 탭이 완전히 빈 화면이면 대개 없는 함수를 `import`한 것이다. Console의 첫 빨간 줄을 본다.

### 1-5. 일하는 순서

```bash
git switch main
git pull
git switch -c feat/F04-forgotten        # 종류/기능번호-짧은이름

# 작업하고 테스트용 프로필에서 확인한 뒤
git status
git add extension/js/forgotten.js        # git add . 대신 파일 이름을 적는다
git commit -m "feat: 잊고 있던 북마크 후보 고르기 (F04-01~03)"
git pull origin main
git push -u origin feat/F04-forgotten
```

그다음 GitHub에서 PR을 만든다. 자동 검사(`check`) → CodeRabbit 리뷰(`@coderabbitai review` 댓글) → 받아 쓰는 사람의 확인과 승인 → 올린 사람이 "Squash and merge" 순서다. 확인하는 사람은 A의 PR은 B, B는 C, C는 D, D는 A다.

---

## 2. 담당과 이슈

할 일은 GitHub 이슈에 있다. 이슈 하나가 파일 하나이고, 그 파일에 만들 함수가 입력, 출력, 동작, 주의, 완료 조건, 테스트와 함께 들어 있다.

| 담당 | 맡은 파일 (`extension/` 아래) | 이슈 | 처음 할 것 |
|---|---|---|---|
| 팀원 A | `manifest.json`, `js/bookmarks.js`, `js/store.js`, `js/organize.js`, `js/view/history.js` | #1 ~ #5 | #2의 `loadTree`, #3의 `load` (모두가 기대는 함수) |
| 팀원 B | `background.js`, `js/classify.js`, `js/forgotten.js`, `js/view/forgottenFolder.js`, `data/categories.json` | #6 ~ #10 | #7 `classify.js`, #8 `forgotten.js` (바로 시작 가능) |
| 팀원 C | `js/plan.js`, `js/topic.js`, `js/view/folders.js` | #11 ~ #13 | #11 `plan.js` (바로 시작 가능), #20 샘플 세트 |
| 팀원 D | `newtab.html`, `newtab.css`, `js/render.js`, `js/ui.js`, `js/view/cards.js`, `js/search.js`, `js/dnd.js` | #14 ~ #19 | #14 공통 값과 화면 뼈대, #16 `ui.js`, #15 `render.js` 연결 |

- #20, #21은 준비 작업(샘플 세트, 저장소 설정)이다.
- #22, #23, #24는 요구사항 확인 목록이다(P1, P2, P3). 확인하는 사람이 눌러 보고 통과한 줄에 체크한다.
- 지금은 P1만 만든다. P1 확인 목록(#22)이 닫힌 뒤에 P2를 시작한다.
- 시작할 때 이슈의 Assignees에 자신을 넣는다.

---

## 3. AI에 넣을 내용

AI 도구의 종류에 따라 넣는 방법이 다르다. 대괄호 `[ ]` 안은 자기 값으로 바꾼다.

### 3-1. 저장소를 직접 읽는 도구 (Claude Code, Cursor, Copilot 등)

저장소의 `AGENTS.md`를 도구가 자동으로 읽으므로 규칙을 붙여 넣지 않는다. (Claude Code는 `CLAUDE.md`를 거쳐 읽는다.)

**세션을 시작할 때**

```
나는 이 저장소의 팀원 [A/B/C/D]야. GitHub 아이디는 [아이디]야.
AGENTS.md를 읽고, 내가 맡은 파일과 지켜야 할 규칙을 요약해 줘.
그다음 이슈 #[번호]를 읽어 줘.
(gh issue view [번호] --repo parkhyun0701-oss/aix_BaroLink_bookmark)
아직 코드는 고치지 마.
```

**함수를 맡길 때**

```
이슈 #[번호]의 [함수 이름]을 구현해 줘.

- extension/js/[파일].js만 고쳐. 다른 파일을 고쳐야 풀리는 문제면 고치지 말고 나에게 알려 줘.
- 함수의 이름, 입력, 출력은 바꾸지 마.
- 패키지나 빌드 도구는 넣지 마.
- 끝나면 node .github/scripts/check.mjs를 돌려 줘.
- 내가 테스트용 크롬 프로필에서 확인할 수 있게, 누를 순서와 기대 결과, 콘솔에 넣을 코드를 적어 줘.
- 커밋과 푸시는 하지 마. 내가 확인한 뒤에 할게.
```

### 3-2. 저장소를 못 읽는 채팅 AI (ChatGPT, Claude 웹 등)

AI가 프로젝트를 전혀 모르는 상태이므로 아래 순서로 붙여 넣는다.

```
크롬 확장 프로그램을 팀으로 만들고 있어. 아래 규칙을 지켜서 도와줘.

[1] 프로젝트 규칙
(저장소의 AGENTS.md 내용 전체를 붙여 넣기)

[2] 내가 할 일
나는 팀원 [A/B/C/D]야. 아래 이슈의 [함수 이름]을 구현하려고 해.
(GitHub에서 내 이슈의 본문 전체를 붙여 넣기)

[3] 지금 파일
(extension/js/[파일].js의 내용 전체를 붙여 넣기)

요청:
- 이 파일 안의 [함수 이름]만 채워 줘. 함수의 이름, 입력, 출력은 바꾸지 마.
- 다른 파일을 고쳐야 한다면 코드를 쓰지 말고 무엇이 필요한지만 알려 줘.
- 고친 함수 전체와, 테스트용 크롬 프로필에서 확인하는 방법(콘솔에 넣을 코드와 기대 결과)을 줘.
```

작업에 따라 더 붙이는 것:

| 작업 | 더 붙일 것 |
|---|---|
| 분류 (`classify.js`) | `extension/data/categories.json`의 앞부분, `docs/category-definitions.md` 2번과 7번 |
| 폴더 계획 (`plan.js`) | `docs/category-definitions.md` 10-1(카테고리 순서), `tests/README.md` |
| 화면 (`view/*`, `render.js`, `newtab.css`) | `docs/design/App.tsx`의 해당 구역, `docs/file-structure.md` 12번 |
| 저장 (`store.js`, `background.js`) | README의 "저장하는 데이터" 표, `docs/file-structure.md` 5번과 6번 |
| 다른 파일의 함수를 불러 쓸 때 | 그 파일의 이슈에서 "포함 함수" 표 |

### 3-3. 자주 쓰는 요청

**화면을 만들 때**

```
docs/design/App.tsx의 [구역 이름] 부분과 같은 모양으로 만들어 줘.
이 코드는 React라서 복사하면 안 돼. HTML, CSS, JavaScript로 다시 써 줘.
색과 크기는 newtab.css 맨 위의 공통 값만 쓰고, 내 칸([#칸 이름]) 안만 그려 줘.
다른 화면 파일의 동작이 필요하면 import하지 말고 render.js가 넘겨 준 actions를 써 줘.
```

**오류가 났을 때**

```
테스트용 크롬 프로필에서 아래 오류가 났어.
[Console의 빨간 줄을 그대로 붙여 넣기]
내가 한 일: [누른 순서]
내 파일은 extension/js/[파일].js야. 원인을 찾아 줘. 다른 파일이 원인이면 고치지 말고 알려 줘.
```

**PR 본문을 쓸 때**

```
아래 변경으로 PR을 올리려고 해. .github/pull_request_template.md의 칸에 맞춰 본문을 써 줘.
"확인 방법"은 확인하는 사람이 그대로 따라 할 수 있게 써 줘.
(쓸 샘플 세트, 누를 순서, 기대 결과, 화면이 없는 줄은 콘솔에 넣을 코드와 나와야 할 값)
[git diff 결과 또는 바꾼 내용 설명]
```

**CodeRabbit의 지적을 볼 때**

```
CodeRabbit이 아래처럼 지적했어. 우리 규칙(AGENTS.md)과 이슈 #[번호]에 비춰서 따라야 하는지 판단해 줘.
명세에 "실행 확인"이라고 적힌 동작을 바꾸라는 제안이면 따르지 않는 쪽으로 알려 줘.
[CodeRabbit 댓글 붙여 넣기]
```

---

## 4. AI가 꼭 알아야 하는 규칙 (요약)

`AGENTS.md`를 넣지 못했을 때를 위한 최소한의 요약이다. 전체는 `AGENTS.md`에 있다.

**넣지 않는 것**

- `package.json`, npm 패키지, 번들러, TypeScript, JSX, React, Tailwind, CDN
- HTML 안에 직접 쓴 스크립트, `onclick` 속성, `eval`
- 북마크의 제목과 주소를 외부 서버로 보내는 코드

**파일의 경계**

- 사용자가 맡은 파일만 고친다. 다른 담당의 파일은 고치지 않고 알린다.
- `export`된 함수의 이름, 입력, 출력은 바꾸지 않는다. 바꿔야 하면 멈추고 알린다(사람이 명세를 먼저 고친다).
- `classify.js`, `plan.js`, `forgotten.js`, `topic.js`는 계산만 한다. `chrome` API와 `Date.now()`를 직접 부르지 않고, 필요한 값은 입력으로 받는다.
- `chrome.storage`는 `store.js`에서만, `chrome.bookmarks`는 `bookmarks.js`에서만 부른다(알림 받기는 `render.js`와 `background.js`).
- 저장 항목의 한 키는 새 탭과 서비스 워커 중 한쪽만 쓴다. `manualMoves`, `newBookmarks`는 서비스 워커, 나머지는 새 탭이다.

**화면**

- 각 파일은 `newtab.html`의 자기 칸 안만 그린다: `cards.js`는 `#organize-suggestion`, `forgottenFolder.js`는 `#forgotten-slot`, `folders.js`는 `#folder-list`, `history.js`는 `#notice`, `ui.js`는 `#toast`, `render.js`는 `#header`·`#web-search`·`#all-bookmarks`·`#dock`. 팝업의 `<dialog>`는 `#dialogs`에 붙인다.
- 화면 파일(`view/*`)끼리는 서로 `import`하지 않는다. 다른 화면 파일의 동작이 필요하면 `render.js`가 넘겨 준 `actions`(`openFolder`, `showResultNotice`, `showContextMenu`)를 부른다.
- 앱 아이콘, 짧은 안내 문구, 선 아이콘은 `ui.js`의 함수로 그린다. 색과 크기는 `newtab.css` 맨 위의 공통 값만 쓴다.
- 데이터가 바뀌면 `render.js`가 전체를 다시 그린다. 그리기 함수는 자기 칸을 비우고 다시 그리며, 열려 있는 팝업은 닫지 않는다.
- 모양은 `docs/design/App.tsx`(확정 시안)를 따르고 동작은 명세를 따른다. 시안의 코드는 React라서 복사하지 않는다.
- 북마크의 제목과 주소는 `innerHTML`이 아니라 `textContent`로 넣는다.

**고치지 않는 동작** (실제 크롬에서 확인한 의도된 동작이다)

- `pendingMoves`는 북마크를 옮긴 뒤에 지우지 않는다. 1분 뒤에 만료시킨다.
- `setPending`의 저장이 끝난 뒤(`await`)에 옮기기 시작한다.
- 원래 순서는 첫 북마크를 옮기기 전에 한꺼번에 읽는다.
- 되돌릴 때는 순서 번호가 아니라 원래 바로 앞에 있던 북마크의 뒤에 놓는다.
- 제목 키워드를 볼 때 띄어쓰기를 없애지 않는다.
- 크롬의 가져오기 폴더("가져온 북마크")는 사용자 폴더로 보지 않고, 그 바로 아래의 북마크를 정리 대상에 넣는다.

**확인과 Git**

- AI는 크롬에서 눌러 볼 수 없다. 직접 해 보지 않은 것을 확인했다고 말하지 않고, 사람이 따라 할 확인 방법을 적어 준다.
- `main`에 직접 커밋하거나 올리지 않는다. 커밋, 푸시, PR 만들기는 사용자가 시킬 때만 한다.
- `git add .`, `git push --force`, `git rebase`를 쓰지 않는다.
- 고친 줄만 바꾼다. 파일 전체의 따옴표나 들여쓰기를 정리하지 않는다.

---

## 5. AI를 쓸 때 사람이 지킬 것

- AI가 고친 파일을 `git status`로 확인한다. 내 파일이 아닌 것이 있으면 `git restore 파일이름`으로 되돌린다.
- AI가 "확인했다"고 해도 눌러 본 것이 아니다. 테스트용 프로필에서 직접 확인한다.
- 함수의 입력·출력을 바꾸자는 제안과 패키지를 넣자는 제안은 받아들이지 않는다.
- 실제 북마크와 개인 정보는 AI에게 붙여 넣지 않는다. 샘플 북마크를 쓴다.
- PR의 "AI 도구" 칸에 쓴 도구와 맡긴 일을 적는다.
- AI가 같은 실수를 반복하면 `AGENTS.md`에 한 줄을 더한다(팀원 A에게 부탁).

---

## 6. 어디를 읽으면 되나

| 알고 싶은 것 | 읽을 곳 |
|---|---|
| 이 파일에 무엇을 만드나 | 그 파일의 GitHub 이슈 (#1 ~ #19) |
| AI가 지킬 규칙 전체 | `AGENTS.md` |
| 브랜치, 커밋, PR, 확인하는 법 | `docs/conventions.md` |
| 처음 준비하는 법, 첫 연습 PR | `docs/setup.md` |
| 파일끼리 누가 누구를 부르나, 화면의 칸 | `docs/file-structure.md` 3번, 4번, 12번 |
| 화면의 모양 | `docs/design/App.tsx`, `docs/design/README.md` |
| 요구사항, 함수, 저장 항목의 원본 | `docs/spec.xlsx` (엑셀. AI는 이슈를 본다) |
| 크롬 북마크와 저장 항목의 형태 | `docs/data-structure.txt`, README의 "저장하는 데이터" |
| 분류 규칙과 분류표 | `docs/category-definitions.md`, `extension/data/categories.json` |
| 샘플 북마크와 정답 | `tests/README.md`, `tests/answer-key-100.md` |
