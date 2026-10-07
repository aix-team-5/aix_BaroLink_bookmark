# 바로링크 (BaroLink)

크롬 북마크를 새 탭에 앱과 앱 폴더로 보여 주고, 잊고 있던 북마크를 다시 꺼내 주며, 한 번 확인으로 크롬 북마크에 실제로 정리해 주는 크롬 확장 프로그램의 저장소입니다. 서버 없이 크롬 안에서만 동작하고, 북마크의 제목과 주소를 확장 프로그램 밖으로 보내지 않습니다.

서비스 이름 "바로링크 (BaroLink)"는 잠정이며, 저장소 이름은 `aix_BaroLink_bookmark`입니다.

## 기술 스택

- Chrome Extension Manifest V3 (크롬 134 이상)
- HTML, CSS, JavaScript (ES 모듈, 빌드 도구 없음)
- 백그라운드 서비스 워커
- `chrome.bookmarks`, `chrome.storage.local`, `chrome.search`, 파비콘, 선택 권한 `chrome.topSites`
- SortableJS (P3에서 추가, 폴더에 파일로 포함)
- GitHub Actions(PR 자동 검사), CodeRabbit(자동 코드 리뷰)

서버, 데이터베이스, AI, React, CDN은 쓰지 않습니다.

## 현재 구현 범위

뼈대만 준비되어 있습니다. 확장 프로그램 설정(`manifest.json`), 빈 새 탭 화면, 서비스 워커 등록, 명세의 함수 55개가 이름만 있는 빈 함수로 들어 있고, 새 탭 화면에는 각 파일이 그릴 칸이 나뉘어 있습니다. 분류표(카테고리 9개, 주소 183개), 샘플 북마크 100개와 정답지, PR 자동 검사도 준비되어 있습니다.

북마크 표시, 분류, 정리, 되돌리기 같은 기능은 아직 동작하지 않습니다. 각 담당자가 자기 파일의 빈 함수 안쪽부터 구현합니다. 지금 확장 프로그램을 올리고 새 탭을 열면 "바로링크 (BaroLink) · 뼈대만 있는 상태입니다"라는 글자만 보입니다.

개발은 P1(11주 중간 데모) → P2(15주 최종 데모) → P3(시간이 남으면) 순서로 진행합니다.

## 프로젝트 구조

코드는 `extension/` 폴더에만 두고, 이 폴더를 그대로 크롬에 올립니다. 파일별 역할과 파일 간 관계는 `docs/file-structure.md`에서 관리합니다.

```text
aix_BaroLink_bookmark
├── extension                  크롬에 올리는 폴더
│   ├── manifest.json          권한, 새 탭 바꾸기, 서비스 워커 등록
│   ├── background.js          서비스 워커: 새 북마크, 직접 옮김, 삭제 기록
│   ├── newtab.html            새 탭 화면 뼈대
│   ├── newtab.css             화면 모양, 공통 값
│   ├── js
│   │   ├── bookmarks.js       크롬 북마크를 읽고 바꾸는 통로
│   │   ├── store.js           저장 항목을 읽고 쓰는 통로
│   │   ├── organize.js        정리 적용, 되돌리기
│   │   ├── classify.js        분류 규칙 (계산만)
│   │   ├── forgotten.js       잊고 있던 북마크 고르기 (계산만)
│   │   ├── plan.js            정리 대상, 폴더 계획 (계산만)
│   │   ├── topic.js           세부 폴더 제안 (P3)
│   │   ├── render.js          화면 시작, 전체 다시 그리기
│   │   ├── ui.js              공통 화면 조각
│   │   ├── search.js          웹 검색창, 북마크 검색
│   │   ├── dnd.js             드래그 이동 (P3)
│   │   └── view               cards, folders, forgottenFolder, history
│   └── data
│       └── categories.json    분류표
├── docs                       계획, 명세, 구조도, 규칙
│   └── design                 확정 시안의 코드 (참고용)
├── tests                      샘플 북마크, 정답지
├── .github                    PR 양식, 자동 검사
└── AGENTS.md, CLAUDE.md       AI 코딩 도구가 읽는 규칙
```

### 담당

한 파일은 한 사람이 맡습니다. 공개 저장소이므로 실제 이름 대신 GitHub 아이디만 적습니다.

| 역할 | GitHub 아이디 | 맡는 파일 (`extension/` 아래) |
| --- | --- | --- |
| 팀원 A | | `manifest.json`, `js/bookmarks.js`, `js/store.js`, `js/organize.js`, `js/view/history.js` |
| 팀원 B | | `background.js`, `js/classify.js`, `js/forgotten.js`, `js/view/forgottenFolder.js`, `data/categories.json` |
| 팀원 C | | `js/plan.js`, `js/topic.js`, `js/view/folders.js` |
| 팀원 D | | `newtab.html`, `newtab.css`, `js/render.js`, `js/ui.js`, `js/view/cards.js`, `js/search.js`, `js/dnd.js` |

## 브랜치

- `main`: 언제 받아도 크롬에 오류 없이 올라가는 버전. 공용 브랜치는 이것 하나입니다.
- `feat/{기능번호}-{짧은이름}`: 기능 개발 (예: `feat/F04-forgotten`)
- `fix/{기능번호}-{짧은이름}`: 버그 수정
- `docs/{짧은이름}`: 문서, 명세
- `test/{짧은이름}`: 샘플 세트, 정답지
- `chore/{짧은이름}`: 설정, 동작이 바뀌지 않는 정리

모든 브랜치는 `main`에서 만들고, PR과 1명의 승인을 거쳐 `main`에 합칩니다(Squash merge). `main`에는 직접 올리지 않습니다. 기능번호는 명세의 기능 ID(F01~F17)입니다.

## 커밋 컨벤션

```text
feat: 잊고 있던 북마크 후보 고르기 (F04-01~03)
fix: 되돌릴 때 순서가 뒤섞이는 문제 (F13-03)
docs: setPending 입력 형태 변경, 명세 v14
test: 30개 샘플 세트 추가
chore: .gitignore 추가
```

`종류: 한 일 (요구사항 번호)` 형식으로, 한국어 한 줄로 적습니다. PR 제목도 같은 형식입니다.

## 로컬 실행

### 실행 전 준비

Git과 크롬 134 이상이 필요합니다. 편집기는 VS Code를 권장합니다(저장소에 공통 설정이 들어 있습니다). Node.js와 빌드 도구는 설치하지 않습니다.

```bash
git --version
```

크롬 버전은 주소창에 `chrome://version`을 넣어 확인합니다.

공개 저장소이므로 커밋에 적히는 이름과 메일은 누구나 볼 수 있습니다. 첫 커밋 전에 `docs/setup.md` 2번을 따라 GitHub 아이디와 GitHub가 주는 비공개 메일로 설정합니다.

### 처음 내려받기

```bash
git clone https://github.com/parkhyun0701-oss/aix_BaroLink_bookmark.git
cd aix_BaroLink_bookmark
```

### 실행 순서

이 확장 프로그램은 크롬 북마크를 실제로 바꿉니다. 평소 쓰는 크롬 프로필이 아니라 테스트용 프로필에서 실행합니다.

1. 크롬에서 테스트용 프로필을 만듭니다. 로그인하지 않습니다.
2. 테스트용 프로필의 북마크 관리자에서 "북마크 가져오기"로 `tests/sample-100.html`을 넣습니다.
3. `chrome://extensions`에서 "개발자 모드"를 켜고, "압축해제된 확장 프로그램을 로드합니다"로 `extension/` 폴더를 고릅니다.
4. 새 탭을 엽니다.

코드를 고치거나 다른 브랜치를 받은 뒤에는 `chrome://extensions`에서 확장 프로그램의 새로고침 버튼을 누르고 새 탭을 다시 엽니다. 자세한 준비 과정은 `docs/setup.md`에 있습니다.

## 확인과 자동 검사

빌드 단계는 없습니다. 확인은 세 단계로 합니다.

1. **자동 검사**: PR마다 GitHub Actions의 `check`가 JavaScript 문법, 명세의 함수 55개가 빠졌는지, 없는 함수를 `import`했는지, JSON과 분류표의 형태를 봅니다. 빨간색이면 합칠 수 없습니다.
2. **CodeRabbit 리뷰**: 코드를 읽고 댓글을 답니다. 승인은 하지 않습니다.
3. **사람의 확인**: 내 결과를 받아 쓰는 사람이 테스트용 프로필에서 명세의 문장대로 눌러 봅니다(A의 PR은 B, B는 C, C는 D, D는 A). 코드는 읽지 않습니다. 이 승인이 합치는 기준입니다.

자동 검사는 GitHub에서 돌기 때문에 각자 PC에 설치할 것이 없습니다. Node.js가 있다면 올리기 전에 직접 돌려 볼 수도 있습니다.

```bash
node .github/scripts/check.mjs
```

분류 규칙은 `tests/answer-key-100.json`(샘플 100개의 정답)으로 잽니다. 지금 분류표 기준으로 100개 중 89개가 분류되고, 분류된 89개가 모두 정답입니다.

## 권한

| 권한 | 쓰는 곳 | 받는 시점 |
| --- | --- | --- |
| `bookmarks` | 북마크 읽기, 폴더 만들기, 옮기기, 변경 알림 | 설치할 때 |
| `storage` | 이 PC에만 남는 기록 | 설치할 때 |
| `favicon` | 사이트 아이콘 | 설치할 때 |
| `search` | 크롬의 기본 검색엔진으로 웹 검색 | 설치할 때 |
| `topSites` (선택) | 고정 제안에서 자주 방문한 사이트와 비교 | 사용자가 [고정하기]를 누를 때만 |

자주 방문한 사이트 목록은 비교에만 쓰고 저장하거나 밖으로 보내지 않습니다. 이 저장소에는 비밀번호, 토큰, API 키가 없습니다. 크롬의 "확장 프로그램 압축"이 만드는 `.pem`(개인 키)은 올리지 않습니다.

## 저장하는 데이터

북마크의 원본은 크롬 북마크입니다. 북마크 자체는 따로 복사해 두지 않고, 우리가 기억해야 하는 것만 `chrome.storage.local`에 저장합니다. 이 기록은 이 PC에만 남습니다.

| 키 | 뜻 | 쓰는 쪽 |
| --- | --- | --- |
| `pinned` | 화면 아래 고정됨(독)에 고정한 북마크 (최대 8개) | 새 탭 |
| `lastOpenedByUs` | 우리 새 탭에서 연 시각 | 새 탭 |
| `dismissed` | "이제 안 봐도 됨"을 누른 북마크 | 새 탭 |
| `handledNew` | [정리하기]에서 '그대로 두기'로 둔 새 북마크 | 새 탭 |
| `history` | 정리 기록 (원래 폴더와 순서, 옮긴 폴더, 만든 폴더) | 새 탭 |
| `state` | 첫 정리 카드 상태 | 새 탭 |
| `pendingMoves` | 우리 정리가 옮기는 북마크와 목적지 (1분 뒤 만료) | 새 탭 |
| `manualMoves` | 사용자가 직접 옮긴 북마크 | 서비스 워커 |
| `newBookmarks` | 폴더 밖에 새로 저장된 북마크 | 서비스 워커 |

한 키는 한쪽(새 탭 또는 서비스 워커)만 씁니다. 양쪽이 같은 키를 쓰면 값이 사라집니다. 모든 저장은 `js/store.js`를 거칩니다.

키의 이름이나 형태, 함수의 입력과 출력을 바꿀 때는 코드보다 명세(`docs/spec.xlsx`)를 먼저 고치고 팀에 알립니다. 엑셀 파일은 두 사람이 동시에 고치면 합칠 수 없으므로 한 번에 한 사람만 고칩니다.

## 상태 확인

확장 프로그램을 올린 뒤 아래 세 가지로 기본 상태를 확인합니다.

- 새 탭에 "바로링크 (BaroLink) · 뼈대만 있는 상태입니다"가 보입니다.
- `chrome://extensions`의 확장 프로그램 카드에 "오류" 버튼이 없고, "서비스 워커" 링크가 보입니다.
- 새 탭에서 F12를 눌러 Console에 아래를 넣으면 저장 항목 9개의 이름이 나옵니다.

```js
Object.keys(await (await import("/js/store.js")).load());
```

새 탭이 완전히 빈 화면이면 대개 없는 함수를 `import`한 것입니다. Console의 첫 빨간 줄을 봅니다.

## 기능 개발 시작

할 일은 GitHub 이슈에 있습니다. 이슈 #1~#19가 파일 하나씩이고, 그 파일에 만들 함수가 입력, 출력, 동작과 함께 들어 있습니다. #22~#24는 명세대로 동작하는지 확인하는 목록입니다(P1, P2, P3).

자기 파일의 이슈를 열어 Assignees에 자신을 넣고, 최신 `main`에서 작업 브랜치를 만듭니다. 아래 기능번호와 이름은 실제 작업에 맞게 바꿉니다.

```bash
git switch main
git pull
git switch -c feat/F04-forgotten
```

작업 후 테스트용 프로필에서 직접 확인하고 `main` 대상으로 PR을 작성합니다. PR 본문에는 이슈 번호(`Refs #8`), 요구사항 번호, 확인 방법을 적습니다. 자동 검사, CodeRabbit 리뷰, 받아 쓰는 사람의 승인을 거쳐 올린 사람이 합칩니다.

브랜치 보호, 필수 검사, 승인 1명 설정은 저장소 주인이 GitHub 저장소 설정에서 관리합니다.

### AI 코딩 도구를 쓸 때

AI 도구가 지킬 규칙은 `AGENTS.md`에 있고, 도구가 자동으로 읽습니다(Claude Code는 `CLAUDE.md`를 거쳐 읽습니다). 시작할 때 자신이 어느 담당인지와 작업할 파일의 이슈를 AI에게 알려 줍니다. AI가 쓴 코드도 올리기 전에 직접 읽고 테스트용 프로필에서 눌러 봅니다. 자세한 것은 `docs/conventions.md` 7번에 있습니다.

## 문서

| 문서 | 내용 |
| --- | --- |
| `AGENTS.md` | AI 코딩 도구가 읽는 규칙 |
| `docs/setup.md` | 처음 준비하는 법 (테스트용 프로필, 샘플 넣기, 첫 연습 PR) |
| `docs/conventions.md` | 저장소 규칙 (브랜치, 커밋, PR, 확인하는 법, 한 파일은 한 사람) |
| `docs/spec.xlsx` | 기능 명세와 API 명세 (요구사항, 크롬 API, 내부 함수, 저장 항목) |
| `docs/file-structure.md` | 파일 구조도 (파일별 역할, 파일 간 관계, 화면 연결 방식) |
| `docs/design/` | 확정 시안의 코드. 모양을 볼 때만 쓰고 복사하지 않습니다 |
| `docs/data-structure.txt` | 크롬 북마크의 데이터 구조와 로컬 저장 구조 |
| `docs/category-definitions.md` | 카테고리 정의, 경계 규칙, 분류표 |
| `docs/service-plan.md` | 서비스 계획 |
| `tests/README.md` | 샘플 북마크와 정답지 |
