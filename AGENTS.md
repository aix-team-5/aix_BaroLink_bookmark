# AGENTS.md

AI 코딩 도구(Claude Code, Cursor, Copilot, Codex 등)가 이 저장소에서 작업하기 전에 읽는 규칙이다. 사람용 설명은 `README.md`와 `docs/conventions.md`에 있다. 이 파일과 다른 문서가 다르면 사용자에게 알린다.

## 1. 이 프로젝트

크롬 북마크를 새 탭에 앱과 앱 폴더로 보여 주고 정리해 주는 크롬 확장 프로그램이다(Manifest V3, 크롬 134 이상). 네 명이 파일을 나눠 맡아 만든다.

- HTML, CSS, JavaScript(ES 모듈)를 **빌드 없이** `extension/` 폴더째 크롬에 올린다.
- 서버, 데이터베이스, AI가 없다. 북마크의 제목과 주소를 확장 프로그램 밖으로 보내지 않는다.

**넣지 않는 것.** 아래를 추가하자고 제안하지도, 만들지도 않는다.

- `package.json`, `node_modules`, npm 패키지, 번들러(Vite, webpack), TypeScript, JSX
- React, Vue, Tailwind 같은 프레임워크와 CSS 도구
- CDN이나 외부 주소에서 불러오는 스크립트, 글꼴, 그림
- HTML 안에 직접 쓴 스크립트, `onclick` 속성, `eval`, `new Function` (크롬이 막는다)
- `fetch`로 외부 서버에 보내는 코드

## 2. 작업을 시작하기 전에

1. **사용자가 어느 담당인지 확인한다.** `README.md`의 담당 표에서 GitHub 아이디로 찾고, 모르면 사용자에게 묻는다.
2. **그 담당의 파일만 고친다.** 한 파일은 한 사람이 맡는다. 다른 담당의 파일을 고쳐야 문제가 풀린다면 고치지 말고, 어느 파일의 무엇이 필요한지 사용자에게 알린다. 사용자가 그 파일의 담당에게 부탁한다.
3. **그 파일의 이슈를 읽는다.** 이슈에 만들 함수의 입력, 출력, 동작, 주의, 완료 조건, 테스트가 들어 있다.

| 이슈 | 파일 (`extension/` 아래) | 담당 |
|---|---|---|
| #1 | `manifest.json` | 팀원 A |
| #2 | `js/bookmarks.js` | 팀원 A |
| #3 | `js/store.js` | 팀원 A |
| #4 | `js/organize.js` | 팀원 A |
| #5 | `js/view/history.js` | 팀원 A |
| #6 | `background.js` | 팀원 B |
| #7 | `js/classify.js` | 팀원 B |
| #8 | `js/forgotten.js` | 팀원 B |
| #9 | `js/view/forgottenFolder.js` | 팀원 B |
| #10 | `data/categories.json` | 팀원 B |
| #11 | `js/plan.js` | 팀원 C |
| #12 | `js/topic.js` | 팀원 C |
| #13 | `js/view/folders.js` | 팀원 C |
| #14 | `newtab.html`, `newtab.css` | 팀원 D |
| #15 | `js/render.js` | 팀원 D |
| #16 | `js/ui.js` | 팀원 D |
| #17 | `js/view/cards.js` | 팀원 D |
| #18 | `js/search.js` | 팀원 D |
| #19 | `js/dnd.js` | 팀원 D |

이슈는 이렇게 읽는다. `gh`가 없으면 사용자에게 이슈 내용을 붙여 달라고 한다.

```bash
gh issue view 8 --repo parkhyun0701-oss/aix_BaroLink_bookmark
```

명세의 원본은 `docs/spec.xlsx`(엑셀)이고, 이슈는 그 내용을 글로 옮긴 것이다. 엑셀을 직접 읽을 수 없으면 이슈를 따른다. 이슈와 코드의 주석, 문서가 서로 다르면 추측하지 말고 사용자에게 알린다.

## 3. 코드를 쓸 때 지키는 것

**함수의 이름, 입력, 출력을 바꾸지 않는다.** 뼈대에 들어 있는 `export` 함수는 다른 사람의 파일이 불러 쓰는 약속이다. 바꿔야 한다고 판단되면 멈추고 사용자에게 알린다. 사람이 명세를 먼저 고친 뒤에 코드를 바꾼다. 함수 안쪽은 자유롭게 채운다. 파일 안에서만 쓰는 함수는 `export`하지 않고 추가해도 된다.

**파일의 종류별 규칙**

| 파일 | 규칙 |
|---|---|
| `classify.js`, `plan.js`, `forgotten.js`, `topic.js` | 계산만 한다. `chrome` API를 부르지 않고, 파일을 읽지 않고, `Date.now()`를 직접 부르지 않는다. 필요한 값은 모두 입력으로 받는다 |
| `store.js` | `chrome.storage`는 이 파일에서만 부른다. 한 키는 새 탭과 서비스 워커 중 한쪽만 쓴다(`manualMoves`, `newBookmarks`는 서비스 워커, 나머지는 새 탭) |
| `bookmarks.js` | `chrome.bookmarks`를 읽고 바꾸는 통로다. 북마크바·기타·모바일은 ID가 아니라 `folderType`으로 구별한다 |
| `background.js` | 서비스 워커다. 알림 리스너는 파일 맨 위에서 바로 등록하고, 상태는 변수가 아니라 저장소에 둔다 |
| `organize.js` | 크롬 북마크를 실제로 바꾸는 정리 코드다. 아래 "고치지 않는 동작"을 지킨다 |
| `render.js` | 크롬 북마크 알림과 저장소 알림은 이 파일만 받는다. 화면 파일의 그리기 함수를 부른다 |
| `view/*.js` | 화면 파일끼리 서로 `import`하지 않는다. 크롬은 `bookmarks.js`, `store.js`, `organize.js`를 거친다. 앱 아이콘·안내 문구·선 아이콘은 `ui.js`의 함수로 그린다 |
| `ui.js` | 화면 파일을 `import`하지 않는다 |
| `newtab.css` | 공통 값(색, 간격, 글자 크기, 둥글기)을 맨 위에 둔다. 다른 파일은 색 코드나 크기를 직접 쓰지 않고 이 값을 쓴다 |

**화면을 그릴 때** (자세한 것은 `docs/file-structure.md` 12번)

- 각 파일은 `newtab.html`의 자기 칸 안만 그린다: `cards.js`는 `#organize-suggestion`, `forgottenFolder.js`는 `#forgotten-slot`, `folders.js`는 `#folder-list`, `history.js`는 `#notice`, `ui.js`는 `#toast`, `render.js`는 `#header`·`#web-search`·`#all-bookmarks`·`#dock`. 팝업은 자기 `<dialog>`를 `#dialogs`에 붙인다.
- 다른 화면 파일의 동작이 필요하면 `import`하지 않고, `render.js`가 넘겨 준 `actions`(`openFolder`, `showResultNotice`, `showContextMenu`)를 부른다. 필요한 동작이 `actions`에 없으면 멈추고 사용자에게 알린다.
- 그리기 함수는 여러 번 불려도 결과가 같아야 한다. 자기 칸을 비우고 다시 그리고, 열려 있는 팝업은 닫지 않는다. 다시 그려 달라고 요청하는 코드를 만들지 않는다(데이터가 바뀌면 `render.js`가 다시 부른다).
- 모양은 `docs/design/App.tsx`(확정 시안의 참고용 사본)를 본다. 그 코드는 React라서 `extension/`에 복사하지 않고, HTML·CSS·JavaScript로 다시 쓴다.

**고치지 않는 동작.** 아래는 실제 크롬에서 확인한 의도된 동작이다. 버그처럼 보여도 "고치지" 않는다.

- `pendingMoves`는 북마크를 옮긴 뒤에 지우지 않는다. 1분 뒤에 만료시킨다.
- `setPending`의 저장이 끝난 뒤(`await`)에 옮기기 시작한다.
- 원래 순서는 첫 북마크를 옮기기 전에 한꺼번에 읽는다.
- 되돌릴 때는 순서 번호가 아니라 원래 바로 앞에 있던 북마크의 뒤에 놓는다.
- 제목 키워드를 볼 때 띄어쓰기를 없애지 않는다.

**그 밖에**

- 북마크의 제목과 주소를 `innerHTML`에 그대로 넣지 않는다. `textContent`를 쓴다.
- 팝업은 `<dialog>`와 `newtab.css`의 공통 모양으로 만든다.
- 모양은 확정 시안(`docs/design/App.tsx`)을 따르고 동작은 명세를 따른다. 시안의 데이터와 동작은 가짜다.
- 고친 줄만 바꾼다. 파일 전체의 따옴표, 들여쓰기, 줄 바꿈을 정리하지 않는다(들여쓰기 2칸, 줄 끝 LF).
- 주석과 화면 문구는 한국어로 쓴다. 파일 맨 위의 담당·명세·이슈 주석은 지우지 않는다.

## 4. 확인

- Node.js가 있으면 올리기 전에 자동 검사를 돌린다. 문법, 빠진 함수, 없는 함수를 `import`한 곳, JSON 형태를 본다.
  ```bash
  node .github/scripts/check.mjs
  ```
- 계산만 하는 파일은 Node.js에서 불러 값을 확인할 수 있다. 화면과 크롬 북마크가 필요한 것은 확인할 수 없다.
- **"명세대로 동작한다"는 확인은 사람이 테스트용 크롬 프로필에서 눌러 봐야 한다.** 직접 해 보지 않은 것을 확인했다고 말하지 않는다. 대신 확인하는 사람이 따라 할 수 있게 쓸 샘플 세트, 누를 순서, 기대 결과, 콘솔에 넣을 코드를 적어 준다.
- 사용자가 평소 쓰는 크롬 프로필과 실제 북마크는 건드리지 않는다.

## 5. Git

- `main`에 직접 커밋하거나 올리지 않는다. 브랜치에서 작업한다: `종류/기능번호-짧은이름` (예: `feat/F04-forgotten`, 종류는 `feat` `fix` `docs` `test` `chore`).
- 커밋 메시지는 `종류: 한 일 (요구사항 번호)` 형식의 한국어 한 줄이다 (예: `feat: 잊고 있던 북마크 후보 고르기 (F04-01~03)`).
- `git add .`를 쓰지 않고 파일 이름을 적는다. `git push --force`와 `git rebase`를 쓰지 않는다.
- 커밋, 푸시, PR 만들기는 사용자가 시킬 때만 한다.
- PR은 작게 만든다(함수 몇 개). P1과 P2를 한 PR에 섞지 않는다. PR 본문은 `.github/pull_request_template.md`의 칸을 채운다.
- 이슈의 체크 칸과 `docs/spec.xlsx`는 사용자가 시킬 때만 고친다.

## 6. 올리지 않는 것

실제 북마크, 설문 원본, 강의 자료, `.pem`, 테스트용 크롬 프로필 폴더, 실제 이름과 개인 메일. 공개 저장소다.

## 7. 어디를 읽으면 되나

| 알고 싶은 것 | 읽을 곳 |
|---|---|
| 이 파일에 무엇을 만드나 | 그 파일의 이슈 (2번의 표) |
| 파일끼리 누가 누구를 부르나 | `docs/file-structure.md` 3번, 4번 |
| 화면의 칸, 화면 파일 사이의 전달 | `docs/file-structure.md` 12번 |
| 화면의 모양(배치, 색, 문구) | `docs/design/App.tsx`, `docs/design/README.md` |
| 크롬 북마크와 저장 항목의 형태 | `docs/data-structure.txt`, `README.md`의 "저장하는 데이터" |
| 분류 규칙과 분류표 | `docs/category-definitions.md`, `extension/data/categories.json` |
| 샘플 북마크와 정답 | `tests/README.md`, `tests/answer-key-100.md` |
| 브랜치, PR, 확인하는 법 | `docs/conventions.md` |
| 서비스의 배경과 전체 계획 | `docs/service-plan.md` (길다. 필요할 때만 읽는다) |
