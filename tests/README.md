# tests

샘플 북마크 세트, 정답지, 검증 목록을 두는 폴더다.

| 파일 | 내용 | 담당 |
|---|---|---|
| `sample-100.html` | 크롬 "북마크 가져오기"로 넣는 샘플 100개 (만들어 낸 북마크, 개인 정보 없음) | 팀원 B |
| `answer-key-100.json` | 샘플 100개의 정답 카테고리. `measure`(N18)에 넣는 형식. `answer`가 `null`이면 분류 안 됨이 정답 | 팀원 B |
| `answer-key-100.md` | 같은 정답을 사람이 읽는 표로 적은 것. 쓰는 법은 이 문서의 4번 | 팀원 B |
| `sample-under10.html` | 10개 미만 세트. 전체 9개, 정리 대상 7개. 폴더 계획 대신 고정 제안(`tooFew`) | 팀원 C |
| `sample-20.html` | 서로 다른 20개 세트. 전체 22개, 정리 대상 20개. 3개 이상 모인 카테고리가 없어 고정 제안(`noGroup`) | 팀원 C |
| `sample-30.html` | 30개 세트. 전체 33개, 정리 대상 30개. 폴더 상한 4개(개발 7, 취업 6, 쇼핑 5, 영상 4, 나머지 8) | 팀원 C |
| `console-checks.md` | 새 탭 콘솔에서 함수(N01~N46)를 불러 명세와 맞는지 확인하는 수동 검증 매뉴얼. 서비스 워커 처리(N32~N34)는 직접 부르지 않고, 북마크를 만들고·옮기고·지운 뒤 저장 항목으로 확인한다 | 누구나 |

- 정답의 기준은 `docs/category-definitions.md`다. 분류표(`extension/data/categories.json`)나 정의가 바뀌면 정답지도 함께 본다.
- 샘플은 **북마크가 없는 새 크롬 프로필**에 가져온다. 가져오면 북마크바에 74개와 폴더 2개(`졸업프로젝트`, `알바·취준`)가 들어가고, 나머지 16개와 `자취템` 폴더는 북마크바 맨 끝의 "가져온 북마크" 폴더에 들어간다(10월 7일 확인). 확장 프로그램이 "가져온 북마크" 폴더를 사용자 폴더로 보지 않으므로(명세 F05-04) 직접 꺼낼 필요가 없고, 정리 대상은 90개다. 자세한 것은 `answer-key-100.md` 4번.
- 정답지 JSON의 `location`은 가져온 뒤의 위치, `target`은 정리 대상 여부다.
- 북마크가 이미 있는 프로필에 가져오면 100개가 모두 "가져온 북마크" 폴더 하나에 묶인다.
- 검증 목록: 프로토타입이 통과한 검증 목록을 옮겨 새 코드의 확인 목록으로 쓴다.

본인이 평소 쓰는 크롬에서 내보낸 실제 북마크는 올리지 않는다. 만들어 낸 샘플만 둔다.

## 샘플 세트별 가져온 뒤의 위치

| 세트 | 북마크바 바로 아래 | "가져온 북마크" 바로 아래 | 사용자 폴더(위치·이름·개수) | 정리 대상 | 기대하는 `makePlan` 결과 | 이 세트로 확인하는 줄 |
|---|---|---|---|---|---|---|
| `sample-under10.html` | 5 | 2 | 북마크바 안 "즐겨 찾는 곳" 2 | 7 | pin, `tooFew` | F05-09 |
| `sample-20.html` | 16 | 4 | "가져온 북마크" 안 "취미" 2 | 20 | pin, `noGroup` | F05-04(가져온 북마크 안의 폴더는 사용자 폴더), F05-09 |
| `sample-30.html` | 26 | 4 | 북마크바 안 "자주 보는 글" 3 | 30 | folders 4개, rest 8 | F05-04~07, F06-01, F07-01 |

위 숫자는 지금 `plan.js`와 `categories.json`으로 계산한 기대값이다. 세트마다 새 프로필에 가져와 확인하면 아래 줄의 "확인 전"을 "(날짜) 확인함"으로 바꾼다.

- 가져오기 확인: `sample-under10` 2026-11-09 확인함, 가져온 뒤 북마크바에서 2개를 열어 정리 대상이 7 → 5로 줄어드는 것도 확인함(30일 방법) · `sample-20` 2026-11-09 확인함 · `sample-30` 2026-11-09 확인함
- 세트마다 북마크가 하나도 없는 프로필에서 가져온다. 다른 세트를 이어서 가져오려면 `console-checks.md` 1-6의 "되살리기" 2번처럼 북마크를 모두 지우고 `chrome.storage.local.clear()` 한 뒤 가져온다(북마크바가 비어 있지 않으면 전부 "가져온 북마크" 하나에 묶인다).
- 모든 저장일(`ADD_DATE`)이 2024~2025년이라, 가져오면 모든 북마크가 30일 넘게 지난 것으로 보여 "잊고 있던 북마크" 후보이고 "연 기록 없음"이다(F04-01, F04-12. 배지는 최대 8).

## 최근 30일 안에 북마크바에서 연 북마크 만들기

- HTML에는 `dateLastUsed`를 넣을 수 없다. 크롬은 북마크바나 북마크 관리자에서 열 때만 `dateLastUsed`를 바꾸고, 주소창 입력·링크·우리 새 탭에서 열 때는 바꾸지 않는다(`docs/data-structure.txt` 2번).
- 만드는 법: 가져온 뒤 북마크바에서 그 북마크를 직접 클릭해 연다. 연 순간부터 30일 동안 정리 대상에서 빠진다(F05-04). "가져온 북마크" 폴더도 북마크바 안이라, 그 안의 북마크를 북마크바에서 열어도 빠진다.
- 주의: 확인 전에 북마크바를 무심코 누르면 정리 대상이 줄어든다. 가져온 직후 아래 "콘솔로 확인하기"의 코드로 열린 북마크가 없는지 먼저 본다.
- `sample-30`으로 확인: "Git 브랜치 전략 - velog"를 열면 정리 대상 29개 → 폴더 최대 3개(개발 7, 취업 6, 쇼핑 5, 나머지 11). 대신 "algorithm-study · GitHub"와 "Baekjoon Online Judge" 둘을 열면 28개 → 취업 6, 개발 5, 쇼핑 5(개발·쇼핑 동점은 `categories.json` 순서, F05-07).
- 되돌리기: 연 기록은 지울 수 없으므로 북마크를 모두 지우고 다시 가져온다.
- 만들 수 없는 것: 30일이 지난 `dateLastUsed`(시간을 되돌릴 수 없다)는 `console-checks.md` C-N19-예외의 가짜 값으로 확인한다. "저장한 지 7일이 안 된 북마크"(F04-02)는 가져온 뒤 주소창의 별 버튼으로 하나 직접 저장해 만든다.

## 콘솔로 확인하기

새 탭에서 `F12` → **Console**을 열고 붙여 넣는다. 처음 붙여 넣을 때는 콘솔에 `allow pasting`을 직접 입력하고 Enter를 누른 뒤 다시 붙여 넣는다.

```js
const { loadTree } = await import("/js/bookmarks.js");
const { getTargets, makePlan } = await import("/js/plan.js");
const cats = await (await fetch("/data/categories.json")).json();
const tree = await loadTree();
const stored = await chrome.storage.local.get("manualMoves");
const targets = getTargets(tree, stored, {}, Date.now());
const plan = makePlan(targets, cats);
console.log("정리 대상", targets.length, plan.type, plan.reason ?? plan.folders.map((f) => `${f.name} ${f.items.length}`), plan.rest);
console.log("북마크바에서 연 북마크", tree.bookmarks.filter((b) => b.dateLastUsed).map((b) => [b.title, new Date(b.dateLastUsed).toLocaleString()]));
```
