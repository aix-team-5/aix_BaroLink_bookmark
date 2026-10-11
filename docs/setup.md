# 처음 준비하는 법

> 팀원이 자기 PC에서 한 번만 하면 되는 준비다. 30분쯤 걸린다.
> 일하는 규칙은 `docs/conventions.md`, 샘플과 정답지는 `tests/README.md`에 있다.
> 작성일: 2026-10-07

빌드 도구가 없어서 설치할 것은 Git, 편집기, 크롬뿐이다. Node.js는 설치하지 않아도 된다.

---

## 1. 필요한 것

| 무엇 | 확인 |
|---|---|
| 크롬 134 이상 | 주소창에 `chrome://version` |
| Git | 터미널에 `git --version` (윈도우는 Git for Windows를 설치하면 Git Bash가 함께 깔린다) |
| VS Code (권장) | 저장소에 팀 공통 설정이 들어 있어, 폴더를 열면 자동으로 적용된다 |
| GitHub 계정 | 저장소 초대 메일을 수락한다 |

## 2. Git에 이름과 메일 적기

공개 저장소라서 커밋에 적힌 이름과 메일은 누구나 볼 수 있다. 실제 이름과 개인 메일 대신 GitHub 아이디와 GitHub가 주는 비공개 메일을 쓴다.

1. GitHub → Settings → Emails에서 "Keep my email addresses private"를 켠다.
2. 같은 화면에 보이는 `숫자+아이디@users.noreply.github.com` 주소를 복사한다.
3. 터미널에서 실행한다.

```bash
git config --global user.name "내GitHub아이디"
git config --global user.email "숫자+아이디@users.noreply.github.com"
git config --global pull.rebase false
```

메일의 "숫자"는 글자 그대로 쓰는 것이 아니라, GitHub 화면에 보이는 내 계정 번호다. 화면의 주소를 그대로 복사해 넣는다.

마지막 줄은 내 브랜치에서 최신 `main`을 받아 합칠 때(`git pull origin main`) 필요하다. 이 설정이 없으면 Git이 "Need to specify how to reconcile divergent branches"라며 멈춘다.

## 3. 저장소 받기

```bash
git clone https://github.com/aix-team-5/aix_BaroLink_bookmark.git
cd aix_BaroLink_bookmark
```

VS Code에서 "폴더 열기"로 `aix_BaroLink_bookmark` 폴더를 연다. 들여쓰기 2칸, 줄 끝 통일, 저장할 때 자동 정렬 끄기가 자동으로 적용된다.

## 4. 테스트용 크롬 프로필 만들기

이 확장 프로그램은 크롬 북마크를 실제로 바꾼다. 평소 쓰는 프로필에는 올리지 않는다.

1. 크롬 오른쪽 위의 프로필 아이콘 → "추가"를 누른다.
2. **로그인하지 않고** 계속한다. 로그인하면 샘플 북마크가 내 구글 계정에 올라가고, 내 북마크가 테스트용 프로필에 내려온다.
3. 이름은 `baro-test`처럼 알아보기 쉽게 짓는다.

## 5. 샘플 북마크 넣기

1. 테스트용 프로필에서 북마크 관리자(`chrome://bookmarks`)를 연다.
2. 오른쪽 위 점 3개 메뉴 → "북마크 가져오기" → `tests/sample-100.html`을 고른다.
3. 북마크바에 북마크 74개와 폴더 2개(`졸업프로젝트` 4개, `알바·취준` 3개)가 있고, 북마크바 맨 끝에 "가져온 북마크" 폴더(북마크 16개와 `자취템` 폴더 3개)가 생겼는지 본다.

크롬은 가져온 북마크 중 북마크바 것이 아닌 것을 기타 북마크가 아니라 "가져온 북마크" 폴더에 넣는다(10월 7일 확인). 확장 프로그램은 이 폴더를 사용자 폴더로 보지 않고, 바로 아래의 16개도 정리 대상에 넣는다(명세 F05-04). 직접 꺼낼 필요가 없다. 100개가 전부 "가져온 북마크" 폴더 하나에 들어갔다면 북마크가 이미 있던 프로필에 가져온 것이니, 새 프로필을 만들어 다시 가져온다. 자세한 것은 `tests/answer-key-100.md` 4번.

## 6. 확장 프로그램 올리기

1. 테스트용 프로필에서 `chrome://extensions`를 연다.
2. 오른쪽 위 "개발자 모드"를 켠다.
3. "압축해제된 확장 프로그램을 로드합니다"를 누르고 `extension/` 폴더를 고른다. 저장소 폴더가 아니라 그 안의 `extension/`이다.
4. 새 탭을 연다. 크롬이 "새 탭 페이지가 바뀌었습니다"라고 물으면 유지를 고른다.
5. 지금은 "바로링크 (BaroLink) · 뼈대만 있는 상태입니다"라는 글자가 보이면 된다.

## 7. 코드를 고친 뒤 다시 보기

- `chrome://extensions`에서 확장 프로그램 카드의 새로고침 버튼(둥근 화살표)을 누르고 새 탭을 다시 연다.
- `manifest.json`이나 `background.js`를 고쳤으면 새로고침을 꼭 눌러야 한다. 헷갈리면 항상 누른다.
- 다른 사람의 브랜치를 받았을 때도 같다.

## 8. 오류 보는 곳

| 어디의 오류 | 보는 법 |
|---|---|
| 새 탭 화면 | 새 탭에서 F12 → Console |
| 서비스 워커(`background.js`) | `chrome://extensions` → 확장 프로그램 카드의 "서비스 워커" 링크 |
| 올릴 때의 오류 | 확장 프로그램 카드의 "오류" 버튼 |
| 새 탭이 완전히 빈 화면 | 대개 `import`한 함수가 없다는 뜻이다. Console의 첫 빨간 줄을 본다 |

계산만 하는 함수는 새 탭의 Console에서 직접 불러 볼 수 있다.

```js
const m = await import("/js/classify.js");
const categories = await (await fetch("/data/categories.json")).json();
m.classify({ title: "채용 공고", url: "https://example.com" }, categories);
```

## 9. 할 일 찾기: 파일 = 이슈

파일 하나가 이슈 하나이고, 담당도 한 명이다.

| 이슈 | 파일 (`extension/` 아래) | 담당 | 명세의 함수 줄 수 |
|---|---|---|---|
| #1 | `manifest.json` | 팀원 A | — |
| #2 | `js/bookmarks.js` | 팀원 A | 7 |
| #3 | `js/store.js` | 팀원 A | 12 |
| #4 | `js/organize.js` | 팀원 A | 2 |
| #5 | `js/view/history.js` | 팀원 A | 1 |
| #6 | `background.js` | 팀원 B | 3 |
| #7 | `js/classify.js` | 팀원 B | 3 |
| #8 | `js/forgotten.js` | 팀원 B | 2 |
| #9 | `js/view/forgottenFolder.js` | 팀원 B | 1 |
| #10 | `data/categories.json` | 팀원 B | — |
| #11 | `js/plan.js` | 팀원 C | 4 |
| #12 | `js/topic.js` | 팀원 C | 1 |
| #13 | `js/view/folders.js` | 팀원 C | 1 |
| #14 | `newtab.html`, `newtab.css` | 팀원 D | — |
| #15 | `js/render.js` | 팀원 D | 1 |
| #16 | `js/ui.js` | 팀원 D | 3 |
| #17 | `js/view/cards.js` | 팀원 D | 1 |
| #18 | `js/search.js` | 팀원 D | 3 |
| #19 | `js/dnd.js` | 팀원 D | 1 |
| #20 | 준비: 샘플 북마크 세트 (`tests/`) | 팀원 C, 팀원 B | — |
| #21 | 준비: 저장소 설정 마무리 | 팀원 A | — |
| #22 | 확인 목록 P1 (11주 중간 데모까지) | 모두 | — |
| #23 | 확인 목록 P2 (15주 최종 데모까지) | 모두 | — |
| #24 | 확인 목록 P3 (시간이 남으면) | 모두 | — |

- **이슈는 모두 같은 순서로 적혀 있다:** 핵심 정책(지켜야 할 것) → 세부 작업(만들 함수) → 완료 조건 → 테스트(확인하는 법) → 참고 자료.
- **내 파일의 이슈를 연다.** 그 파일에 만들 함수가 이름, 입력, 출력, 동작, 주의와 함께 체크 칸으로 들어 있다. 이슈만 읽고 만들 수 있게 명세를 옮겨 둔 것이다. 뼈대에는 같은 이름의 빈 함수가 이미 있다.
- **함수마다 관련 기능과 우선순위가 적혀 있다.** `F04(P1·P2)`처럼 P1이 들어 있는 함수부터 만든다.
- **끝난 함수에 체크한다.** PR 본문에 `Refs #8`처럼 적으면 이슈와 연결되고, 그 파일의 마지막 함수를 끝내는 PR에는 `Closes #8`이라고 적는다.
- **동작 확인은 #22~#24에서 한다.** 요구사항은 여러 파일이 함께 있어야 확인되므로 우선순위별로 따로 모았다. 확인하는 사람이 눌러 보고 통과한 줄에 체크한다. #22가 모두 체크되면 P1이 끝난 것이다.
- 시작할 때 이슈의 Assignees에 나를 넣는다.
- 화면을 만드는 작업은 #14(공통 값과 공통 모양)이 먼저다.

## 10. 첫 연습: 규칙대로 PR 한 번 올려 보기

본 작업 전에 흐름을 한 번 따라 해 본다. 자기가 맡은 `.js` 파일 하나의 맨 위 주석에 GitHub 아이디를 적는 PR이다. 자기 파일만 고치므로 서로 부딪히지 않는다.

```bash
git switch main
git pull
git switch -c chore/owner-id-b            # 끝의 b는 자기 역할 글자
# 맡은 파일 하나를 열어 "// 담당: 팀원 B"를 "// 담당: 팀원 B (@내GitHub아이디)"로 고친다
git add extension/js/classify.js
git commit -m "chore: 담당 주석에 GitHub 아이디 추가"
git push -u origin chore/owner-id-b
```

그다음 GitHub에서 PR을 만들고, 아래가 차례로 되는지 본다.

1. PR 본문에 양식이 자동으로 채워진다.
2. 자동 검사(`check`)가 초록색이 된다.
3. `@coderabbitai review`라고 댓글을 달면 CodeRabbit이 한국어로 리뷰한다.
4. 확인하는 사람(A는 B, B는 C, C는 D, D는 A)이 브랜치를 받아 새 탭이 그대로 뜨는지 보고 Approve를 누른다.
5. 올린 사람이 "Squash and merge"를 누른다.

팀원 A는 같은 연습으로 README 담당 표의 GitHub 아이디 네 칸을 채운다.

## 11. 자동 검사가 빨간색일 때

PR 화면의 `check` 옆 "Details"를 누르면 무엇이 걸렸는지 한국어로 나온다.

| 메시지 | 뜻 |
|---|---|
| 문법 오류 | 괄호나 따옴표가 빠졌다. 적힌 파일을 본다 |
| 명세의 함수 …이(가) export되어 있지 않다 | 함수 이름을 바꿨거나 지웠다. 이름을 바꾸려면 명세가 먼저다 (`conventions.md` 8번) |
| …에 …이(가) export되어 있지 않다 | 없는 함수를 `import`했다. 이대로 합치면 새 탭이 빈 화면이 된다 |
| JSON으로 읽을 수 없다 | 쉼표나 따옴표가 틀렸다 |
| 같은 주소가 두 번 나온다 | 분류표에 같은 사이트가 두 카테고리에 있다 |

이 검사는 코드가 **깨지지 않았는지**만 본다. 명세대로 동작하는지는 사람이 눌러 봐야 안다.

막혔을 때는 `docs/conventions.md` 11번을 본다.

## 12. AI 코딩 도구를 쓸 때

저장소 맨 위의 `AGENTS.md`에 AI가 지킬 규칙이 있고, 도구가 자동으로 읽는다.

1. 시작할 때 AI에게 내가 어느 담당인지 말한다. 예: "나는 팀원 B야. `forgotten.js`의 `pickForgotten`을 이슈 8번대로 만들어 줘."
2. 이슈 내용을 AI가 읽게 한다. GitHub CLI가 있으면 AI가 직접 읽고, 없으면 이슈 본문을 붙여 넣는다.
3. AI가 내 파일이 아닌 파일을 고쳤는지 `git status`로 본다. 고쳤으면 되돌린다: `git restore 파일이름`
4. 화면을 만들 때는 AI에게 `docs/design/App.tsx`(확정 시안)의 해당 부분을 보게 하고, HTML·CSS·JavaScript로 다시 쓰게 한다. 그 코드를 그대로 복사하게 하지 않는다.
5. 테스트용 프로필에서 직접 눌러 본다. AI는 크롬에서 눌러 볼 수 없다.
6. PR의 "AI 도구" 칸에 쓴 도구와 맡긴 일을 적는다.

실제 북마크와 개인 정보는 AI에게 붙여 넣지 않는다.
