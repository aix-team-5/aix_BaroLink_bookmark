# docs/design

확정 디자인 시안(Figma Make)의 코드를 **참고용**으로 둔 폴더다.

| 파일 | 내용 |
|---|---|
| `App.tsx` | 시안의 화면 전체(React). 2026-10-07에 Figma Make에서 받은 것. 로고의 이름 한 곳만 "바로"에서 "바로링크"로 고쳤다 |

원본: https://www.figma.com/make/Yf9dLbok1rcVJDNdDQAWI9/Chrome-Extension-UI

## 쓰는 법

- **모양만 본다.** 배치, 색, 간격, 글자 크기, 문구를 이 파일에서 확인해 `extension/newtab.html`, `extension/newtab.css`와 각 화면 파일에 HTML·CSS·JavaScript로 다시 쓴다.
- **복사하지 않는다.** 이 코드는 React와 Tailwind로 되어 있어 확장 프로그램에 그대로 넣을 수 없다. `extension/` 안으로 가져가지 않는다.
- **동작은 명세를 따른다.** 이 파일의 데이터와 동작은 가짜다(북마크를 이름으로 구분하고, 정리 결과도 정해진 숫자다). 눌렀을 때 일어나는 일은 `docs/spec.xlsx`가 기준이다.
- **시안이 바뀌면 이 파일도 다시 받아 넣고, 위 표의 날짜를 고친다.** Figma의 원본 로고는 아직 "바로"이므로, 다시 받으면 로고 이름을 다시 고쳐야 한다(서비스 이름이 확정되면 Figma 원본을 고친다).

## 시안의 구역과 우리 화면의 칸

| 시안(`App.tsx`)의 구역 | `newtab.html`의 칸 | 그리는 파일 |
|---|---|---|
| `<nav>` (로고, 내 폴더·모든 북마크 버튼, 정리하기, 정리 기록) | `#header` | `js/render.js` |
| 날짜와 웹 검색창 | `#web-search` | `js/render.js`, `js/search.js` |
| `#organize-suggestion` (북마크를 이렇게 묶어 볼까요?) | `#organize-suggestion` | `js/view/cards.js` |
| `#my-folders`의 어두운 카드 (잊고 있던 북마크) | `#forgotten-slot` | `js/view/forgottenFolder.js` |
| `#my-folders`의 폴더 타일 | `#folder-list` | `js/view/folders.js` |
| `#all-bookmarks` (검색창, 앱 격자) | `#all-bookmarks` | `js/render.js`, `js/search.js` |
| 화면 아래에 떠 있는 고정됨 | `#dock` | `js/render.js` |
| 위쪽의 정리 결과 안내 (`resultNotice`) | `#notice` | `js/view/history.js` |
| 위쪽의 짧은 안내 (`toast`) | `#toast` | `js/ui.js` |
| 창 6종 (`modal`: forgotten, folder, organize, newOrganize, pin, history) | `#dialogs` | 각 화면 파일의 `<dialog>` |
| `Icon`의 아이콘 12개 | — | `js/ui.js`의 `icon` |

시안의 창 6종은 틀(어두운 배경, 아이콘과 제목, 설명, 닫기 버튼)이 같다. 이 틀은 `newtab.css`의 공통 모양으로 두고, 각 화면 파일이 자기 `<dialog>`에 쓴다.

자동 검사와 CodeRabbit은 이 폴더를 보지 않는다.
