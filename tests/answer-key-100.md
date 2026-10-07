# 정답지: 샘플 북마크 100개

> 분류 규칙(`classify.js` 이슈 #7, 기능 F05)의 정답지. 2026-10-07 초안. 같은 날 분류표 문서 9번의 제안대로 진행하기로 정해, 3번 표의 줄은 "지금 정답"을 쓴다. 분류표 v11(분류하지 않는 사이트 추가) 기준으로 숫자를 다시 쟀고, 가져오기 결과를 실제로 확인해 위치와 4번을 고쳤다.
> 기준: `docs/category-definitions.md` 1~9번 정의와 10번 분류표. 정답은 "규칙이 내는 답"이 아니라 **정의 문서를 읽은 사람이 붙일 답**이다.
> 짝이 되는 파일: `sample-100.html`(크롬 가져오기용 샘플), `answer-key-100.json`(같은 정답, N18 `measure`에 넣는 형식)

## 1. 요약

| 정답 | 개수 |
|---|---|
| 학교 | 12 |
| 영상 | 12 |
| 온라인 강의 | 9 |
| 블로그·글 | 10 |
| 문서·협업 | 10 |
| 개발 | 12 |
| 취업 | 8 |
| 쇼핑 | 9 |
| 커뮤니티 | 8 |
| 분류 안 됨 | 10 |
| 합계 | 100 |

- 위치 (북마크가 하나도 없는 새 프로필에 가져온 뒤): 북마크바 74개, 북마크바 끝의 "가져온 북마크" 폴더 16개, 사용자 폴더 10개 (북마크바 안 `졸업프로젝트` 4, `알바·취준` 3 / 가져온 북마크 안 `자취템` 3)
- 정리 대상: 90개 (북마크바 74 + 가져온 북마크 바로 아래 16). 사용자 폴더 10개는 빠진다 (F05-04). "가져온 북마크" 폴더를 사용자 폴더로 보지 않는다는 전제다 (4번 2)
- 저장 시점: 최근(2026년 8~10월) 43개, 오래됨(2023년 3월 ~ 2025년 6월) 57개
- 분류 단계별: 분류표 76개, 주소 끝 9개, 제목 키워드 4개, 해당 없음 11개 (그중 3개는 분류하지 않는 사이트에서 멈춤)
- 확신 없음: 17개 (3번 표)

**지금 분류표로 돌려 본 결과** (분류표 문서 10번 기준, 임시 스크립트로 계산)

| 지표 | 값 | 계산 |
|---|---|---|
| 적용률 | 89% | 분류 안 됨이 아닌 결과 89 / 100 |
| 정확도 (분류된 것 중) | 100% | 정답과 같음 89 / 89 |
| 전체 일치 | 99% | 분류 안 됨을 맞힌 것 포함 99 / 100 |

틀린 1개는 일부러 넣은, 분류표에 없는 개발 문서(`developer.chrome.com`)다. 분류하지 않는 사이트를 넣기 전(v10)에는 키워드 오분류 3개(22, 29, 37번)가 더 있어 적용률 92%, 정확도 96.7%, 전체 일치 96%였다. 이 셋은 지금도 샘플에 남겨 두어, 분류하지 않는 사이트 규칙이 동작하는지 확인하는 줄로 쓴다. 샘플을 정의 문서에 맞춰 골랐기 때문에 일치율이 높게 나오는 것이 정상이다. 이 정답지는 `classify.js`가 문서대로 동작하는지 확인하는 용도이고, 실제 사용자 북마크에서의 정확도는 따로 재야 한다.

## 2. 정답표

`#`은 `answer-key-100.json`의 `id`다. 같은 북마크를 제목으로 `sample-100.html`에서 찾을 수 있다. 검토하기 쉽게 정답 카테고리별로 묶었다. "규칙 결과"가 정답과 다른 줄은 **굵게** 표시했다.

| # | 제목 | 주소 | 위치 (가져온 뒤) | 정리 대상 | 저장 | 정답 | 규칙 결과 | 확신 없음 | 메모 |
|---|---|---|---|---|---|---|---|---|---|
| 7 | 에브리타임 | `https://everytime.kr/` | 북마크바 | O | 오래됨 | 학교 | 학교 (① 분류표: everytime.kr) |  | 게시판이지만 대학 생활 전용 |
| 10 | MIT OpenCourseWare | `https://ocw.mit.edu/` | 북마크바 | O | 오래됨 | 학교 | 학교 (② 주소 끝: .edu) | ⚠ #13 | 대학이 운영하지만 강의 제공 사이트라 온라인 강의로도 볼 수 있음 |
| 35 | 한국장학재단 | `https://www.kosaf.go.kr/` | 북마크바 | O | 최근 | 학교 | 학교 (① 분류표: kosaf.go.kr) | ⚠ #2 | 정부 기관 주소(.go.kr) |
| 41 | 학사일정 - 한양대학교 | `https://www.hanyang.ac.kr/web/www/academic-calendar` | 가져온 북마크 | O | 오래됨 | 학교 | 학교 (② 주소 끝: .ac.kr) |  |  |
| 53 | 고려대학교 수강신청 | `https://sugang.korea.ac.kr/` | 북마크바 | O | 최근 | 학교 | 학교 (② 주소 끝: .ac.kr) |  |  |
| 62 | eTL - 서울대학교 | `https://myetl.snu.ac.kr/` | 북마크바 | O | 최근 | 학교 | 학교 (② 주소 끝: .ac.kr) |  | LMS |
| 63 | 연세대학교 학술정보원 | `https://library.yonsei.ac.kr/` | 가져온 북마크 | O | 오래됨 | 학교 | 학교 (② 주소 끝: .ac.kr) |  | 학교 도서관 |
| 64 | 부산대학교 정보컴퓨터공학부 | `https://cse.pusan.ac.kr/` | 북마크바 | O | 오래됨 | 학교 | 학교 (② 주소 끝: .ac.kr) |  |  |
| 66 | i-Campus - 성균관대학교 | `https://canvas.skku.edu/` | 북마크바 | O | 최근 | 학교 | 학교 (② 주소 끝: .edu) | ⚠ #13 | .edu 주소 끝 규칙에 달림 |
| 68 | KAIST 전산학부 | `https://cs.kaist.ac.kr/` | 가져온 북마크 | O | 오래됨 | 학교 | 학교 (② 주소 끝: .ac.kr) |  |  |
| 84 | 서울대학교 | `https://www.snu.ac.kr/` | 북마크바 | O | 오래됨 | 학교 | 학교 (② 주소 끝: .ac.kr) |  |  |
| 98 | 2026-2학기 수강신청 안내 | `https://sugang.example.com/notice` | 북마크바 | O | 최근 | 학교 | 학교 (③ 키워드: 수강신청) |  | 학교 외부 주소. 제목 키워드로만 잡힘 |
| 15 | TVING | `https://www.tving.com/` | 북마크바 | O | 최근 | 영상 | 영상 (① 분류표: tving.com) |  |  |
| 26 | SOOP | `https://www.sooplive.co.kr/` | 북마크바 | O | 오래됨 | 영상 | 영상 (① 분류표: sooplive.co.kr) |  |  |
| 33 | 네이버 TV | `https://tv.naver.com/` | 북마크바 | O | 오래됨 | 영상 | 영상 (① 분류표: tv.naver.com) |  |  |
| 52 | 쿠팡플레이 | `https://www.coupangplay.com/` | 북마크바 | O | 오래됨 | 영상 | 영상 (① 분류표: coupangplay.com) |  | 쿠팡(쇼핑)과 다른 주소 |
| 54 | 치지직 | `https://chzzk.naver.com/` | 북마크바 | O | 최근 | 영상 | 영상 (① 분류표: chzzk.naver.com) |  |  |
| 77 | 공부할 때 듣는 음악 - YouTube | `https://youtu.be/Xy9Zq8Wv7Ut` | 북마크바 | O | 최근 | 영상 | 영상 (① 분류표: youtu.be) |  | 짧은 주소 |
| 78 | TikTok | `https://www.tiktok.com/` | 북마크바 | O | 최근 | 영상 | 영상 (① 분류표: tiktok.com) | ⚠ #12 | SNS로 보면 분류 안 됨 |
| 79 | TED: Ideas worth spreading | `https://www.ted.com/` | 가져온 북마크 | O | 오래됨 | 영상 | 영상 (① 분류표: ted.com) | ⚠ #12 |  |
| 81 | YouTube Music | `https://music.youtube.com/` | 가져온 북마크 | O | 오래됨 | 영상 | 영상 (① 분류표: youtube.com) |  |  |
| 87 | 운영체제 강의 모음 - YouTube | `https://www.youtube.com/playlist?list=PLexample123` | 가져온 북마크 | O | 오래됨 | 영상 | 영상 (① 분류표: youtube.com) |  |  |
| 90 | 넷플릭스 | `https://www.netflix.com/browse` | 북마크바 | O | 오래됨 | 영상 | 영상 (① 분류표: netflix.com) |  |  |
| 92 | 자료구조 강의 1강 - YouTube | `https://www.youtube.com/watch?v=a1B2c3D4e5F` | 북마크바 | O | 최근 | 영상 | 영상 (① 분류표: youtube.com) |  | 제목에 '강의'가 있어도 영상 |
| 9 | 해커스토익 | `https://champ.hackers.com/` | 북마크바 | O | 최근 | 온라인 강의 | 온라인 강의 (① 분류표: hackers.com) |  |  |
| 13 | K-MOOC | `https://www.kmooc.kr/` | 북마크바 | O | 최근 | 온라인 강의 | 온라인 강의 (① 분류표: kmooc.kr) |  | 대학 강의지만 .ac.kr 아님 |
| 20 | 클래스101 | `https://class101.net/` | 북마크바 | O | 오래됨 | 온라인 강의 | 온라인 강의 (① 분류표: class101.net) |  |  |
| 60 | 토익 인강 무료 체험 | `https://free-toeic.example.com/` | 북마크바 | O | 최근 | 온라인 강의 | 온라인 강의 (③ 키워드: 인강) |  | 분류표에 없는 강의 사이트. 키워드로만 잡힘 |
| 67 | Machine Learning \| Coursera | `https://www.coursera.org/learn/machine-learning` | 가져온 북마크 | O | 오래됨 | 온라인 강의 | 온라인 강의 (① 분류표: coursera.org) |  |  |
| 72 | 생활코딩 | `https://opentutorials.org/course/1` | 가져온 북마크 | O | 오래됨 | 온라인 강의 | 온라인 강의 (① 분류표: opentutorials.org) |  |  |
| 75 | Udemy | `https://www.udemy.com/` | 북마크바 | O | 오래됨 | 온라인 강의 | 온라인 강의 (① 분류표: udemy.com) |  |  |
| 82 | 스프링 입문 - 코드로 배우는 스프링 부트 \| 인프런 | `https://www.inflearn.com/course/example-spring` | 북마크바 | O | 최근 | 온라인 강의 | 온라인 강의 (① 분류표: inflearn.com) |  | 코딩 주제여도 강의 플랫폼 |
| 100 | KOCW 운영체제 | `https://www.kocw.net/home/cview.do?cid=example` | 북마크바 | O | 오래됨 | 온라인 강의 | 온라인 강의 (① 분류표: kocw.net) |  |  |
| 8 | How I learned React \| Medium | `https://medium.com/@example/how-i-learned-react-1a2b3c` | 가져온 북마크 | O | 오래됨 | 블로그·글 | 블로그·글 (① 분류표: medium.com) |  |  |
| 12 | 리액트 상태 관리 정리 | `https://example2.tistory.com/88` | 북마크바 | O | 오래됨 | 블로그·글 | 블로그·글 (① 분류표: tistory.com) |  |  |
| 14 | 자취 요리 레시피 : 네이버 블로그 | `https://m.blog.naver.com/example_cook/223000000002` | 북마크바 | O | 최근 | 블로그·글 | 블로그·글 (① 분류표: blog.naver.com) |  | 모바일 주소 |
| 30 | 김OO의 개발 블로그 | `https://example.github.io/` | 북마크바 | O | 오래됨 | 블로그·글 | 블로그·글 (① 분류표: github.io) | ⚠ #5 | github.io를 개발로 볼 수도 있음 |
| 34 | 주간 뉴스레터 \| Substack | `https://example.substack.com/p/weekly` | 가져온 북마크 | O | 오래됨 | 블로그·글 | 블로그·글 (① 분류표: substack.com) |  |  |
| 39 | 삼성 인턴 면접 후기 | `https://example.tistory.com/12` | 북마크바 | O | 오래됨 | 블로그·글 | 블로그·글 (① 분류표: tistory.com) |  | 제목의 '인턴', '면접'은 보지 않음 |
| 69 | 다익스트라 알고리즘 정리 | `https://velog.io/@example/dijkstra` | 북마크바 | O | 최근 | 블로그·글 | 블로그·글 (① 분류표: velog.io) |  | 제목의 '알고리즘'은 보지 않음 |
| 76 | 웹소설 연재 \| 포스타입 | `https://example.postype.com/post/123` | 북마크바 | O | 최근 | 블로그·글 | 블로그·글 (① 분류표: postype.com) |  |  |
| 91 | 맛집 탐방 기록 : 네이버 블로그 | `https://blog.naver.com/example_user/223000000001` | 북마크바 | O | 오래됨 | 블로그·글 | 블로그·글 (① 분류표: blog.naver.com) |  |  |
| 97 | 개발자로 1년 회고 \| 브런치 | `https://brunch.co.kr/@example/15` | 북마크바 | O | 오래됨 | 블로그·글 | 블로그·글 (① 분류표: brunch.co.kr) |  |  |
| 4 | 네이버 MYBOX | `https://mybox.naver.com/` | 가져온 북마크 | O | 오래됨 | 문서·협업 | 문서·협업 (① 분류표: mybox.naver.com) |  |  |
| 5 | 포트폴리오 | `https://example.notion.site/Portfolio-abc` | 북마크바 | O | 오래됨 | 문서·협업 | 문서·협업 (① 분류표: notion.site) |  | 노션 공개 페이지 |
| 36 | 미리캔버스 | `https://www.miricanvas.com/` | 북마크바 | O | 오래됨 | 문서·협업 | 문서·협업 (① 분류표: miricanvas.com) | ⚠ #8 |  |
| 43 | 내 드라이브 - Google Drive | `https://drive.google.com/drive/my-drive` | 북마크바 | O | 오래됨 | 문서·협업 | 문서·협업 (① 분류표: drive.google.com) |  |  |
| 48 | 졸업 프로젝트 회의록 \| Notion | `https://www.notion.so/example/abc123` | 졸업프로젝트 | X (사용자 폴더) | 최근 | 문서·협업 | 문서·협업 (① 분류표: notion.so) |  |  |
| 49 | 앱 시안 - Figma | `https://www.figma.com/design/EXAMPLE/app` | 북마크바 | O | 최근 | 문서·협업 | 문서·협업 (① 분류표: figma.com) | ⚠ #8 |  |
| 50 | Slack - 졸업프로젝트 | `https://app.slack.com/client/EXAMPLE` | 졸업프로젝트 | X (사용자 폴더) | 최근 | 문서·협업 | 문서·협업 (① 분류표: slack.com) | ⚠ #9 | 메신저로 보면 분류 안 됨 |
| 70 | 조별과제 발표 자료 - Google Slides | `https://docs.google.com/presentation/d/EXAMPLE_ID/edit` | 졸업프로젝트 | X (사용자 폴더) | 최근 | 문서·협업 | 문서·협업 (① 분류표: docs.google.com) |  |  |
| 74 | 설문 참여 부탁드립니다 | `https://forms.gle/ExAmPlE123` | 북마크바 | O | 최근 | 문서·협업 | 문서·협업 (① 분류표: forms.gle) |  | 구글 설문지 짧은 주소 |
| 99 | 동아리 회비 정리 - Google Sheets | `https://docs.google.com/spreadsheets/d/EXAMPLE_ID/edit` | 북마크바 | O | 최근 | 문서·협업 | 문서·협업 (① 분류표: docs.google.com) |  |  |
| 3 | example-user/bookmark-extension · GitHub | `https://github.com/example-user/bookmark-extension` | 졸업프로젝트 | X (사용자 폴더) | 최근 | 개발 | 개발 (① 분류표: github.com) |  |  |
| 21 | 코딩테스트 고득점 Kit \| 프로그래머스 | `https://school.programmers.co.kr/learn/challenges` | 북마크바 | O | 오래됨 | 개발 | 개발 (① 분류표: programmers.co.kr) |  | 제목의 '코딩'은 보지 않음 |
| 25 | How do I undo the most recent local commits in Git? - Stack Overflow | `https://stackoverflow.com/questions/927358/` | 북마크바 | O | 오래됨 | 개발 | 개발 (① 분류표: stackoverflow.com) |  |  |
| 28 | AWS Management Console | `https://console.aws.amazon.com/` | 북마크바 | O | 오래됨 | 개발 | 개발 (① 분류표: aws.amazon.com) |  | amazon.com(쇼핑)보다 긴 주소 |
| 45 | Array.prototype.map() - JavaScript \| MDN | `https://developer.mozilla.org/ko/docs/Web/JavaScript/Refe…` | 북마크바 | O | 최근 | 개발 | 개발 (① 분류표: developer.mozilla.org) |  |  |
| 47 | Two Sum - LeetCode | `https://leetcode.com/problems/two-sum/` | 가져온 북마크 | O | 오래됨 | 개발 | 개발 (① 분류표: leetcode.com) |  |  |
| 51 | solved.ac | `https://solved.ac/` | 북마크바 | O | 오래됨 | 개발 | 개발 (① 분류표: solved.ac) |  |  |
| 55 | 1753번: 최단경로 | `https://www.acmicpc.net/problem/1753` | 북마크바 | O | 최근 | 개발 | 개발 (① 분류표: acmicpc.net) |  |  |
| 61 | chrome.bookmarks \| Chrome for Developers | `https://developer.chrome.com/docs/extensions/reference/ap…` | 북마크바 | O | 최근 | 개발 | **분류 안 됨 (④ 없음)** |  | 분류표에 없는 개발 문서. 규칙으로는 못 잡음 |
| 73 | Titanic - Machine Learning from Disaster \| Kaggle | `https://www.kaggle.com/competitions/titanic` | 가져온 북마크 | O | 오래됨 | 개발 | 개발 (① 분류표: kaggle.com) |  |  |
| 85 | 실습3.ipynb - Colab | `https://colab.research.google.com/drive/EXAMPLE` | 북마크바 | O | 최근 | 개발 | 개발 (① 분류표: colab.research.google.com) |  | 더 긴 주소 항목 |
| 89 | SW Expert Academy | `https://swexpertacademy.com/` | 북마크바 | O | 오래됨 | 개발 | 개발 (① 분류표: swexpertacademy.com) |  |  |
| 1 | 백엔드 개발자 채용 \| 원티드 | `https://www.wanted.co.kr/wd/123456` | 북마크바 | O | 최근 | 취업 | 취업 (① 분류표: wanted.co.kr) |  | 개발 직군이어도 채용 사이트 |
| 11 | 2026 하반기 신입 채용 \| OO그룹 | `https://careers.example.com/jobs/2026` | 북마크바 | O | 최근 | 취업 | 취업 (③ 키워드: 채용) |  | 기업 채용 페이지. 키워드로만 잡힘 |
| 23 | 잡코리아 | `https://www.jobkorea.co.kr/` | 알바·취준 | X (사용자 폴더) | 오래됨 | 취업 | 취업 (① 분류표: jobkorea.co.kr) |  |  |
| 57 | 사람인 - 채용정보 | `https://www.saramin.co.kr/` | 알바·취준 | X (사용자 폴더) | 최근 | 취업 | 취업 (① 분류표: saramin.co.kr) |  |  |
| 65 | 대외활동 - 링커리어 | `https://linkareer.com/list/activity` | 북마크바 | O | 최근 | 취업 | 취업 (① 분류표: linkareer.com) |  |  |
| 80 | 잡플래닛 기업 리뷰 | `https://www.jobplanet.co.kr/` | 알바·취준 | X (사용자 폴더) | 오래됨 | 취업 | 취업 (① 분류표: jobplanet.co.kr) |  |  |
| 88 | 공모전 - 캠퍼스픽 | `https://www.campuspick.com/contest` | 북마크바 | O | 오래됨 | 취업 | 취업 (① 분류표: campuspick.com) | ⚠ #3 |  |
| 93 | LinkedIn | `https://www.linkedin.com/feed/` | 북마크바 | O | 오래됨 | 취업 | 취업 (① 분류표: linkedin.com) | ⚠ #7 | SNS로 보면 분류 안 됨 |
| 2 | YES24 | `https://www.yes24.com/` | 북마크바 | O | 오래됨 | 쇼핑 | 쇼핑 (① 분류표: yes24.com) | ⚠ #10 | 온라인 서점 |
| 27 | 쿠팡 | `https://www.coupang.com/` | 가져온 북마크/자취템 | X (사용자 폴더) | 오래됨 | 쇼핑 | 쇼핑 (① 분류표: coupang.com) |  |  |
| 40 | 노트북 가격비교 - 다나와 | `https://prod.danawa.com/list/?cate=112758` | 북마크바 | O | 최근 | 쇼핑 | 쇼핑 (① 분류표: danawa.com) |  |  |
| 42 | 무신사 | `https://www.musinsa.com/` | 가져온 북마크/자취템 | X (사용자 폴더) | 최근 | 쇼핑 | 쇼핑 (① 분류표: musinsa.com) |  |  |
| 44 | 11번가 | `https://www.11st.co.kr/` | 북마크바 | O | 오래됨 | 쇼핑 | 쇼핑 (① 분류표: 11st.co.kr) |  |  |
| 56 | 올리브영 | `https://www.oliveyoung.co.kr/` | 북마크바 | O | 오래됨 | 쇼핑 | 쇼핑 (① 분류표: oliveyoung.co.kr) |  |  |
| 83 | 노트북 특가 모음 | `https://deal.example.com/notebook` | 북마크바 | O | 최근 | 쇼핑 | 쇼핑 (③ 키워드: 특가) |  | 키워드로만 잡힘 |
| 95 | 네이버 쇼핑 | `https://shopping.naver.com/` | 가져온 북마크/자취템 | X (사용자 폴더) | 오래됨 | 쇼핑 | 쇼핑 (① 분류표: shopping.naver.com) |  |  |
| 96 | 당근 | `https://www.daangn.com/` | 북마크바 | O | 오래됨 | 쇼핑 | 쇼핑 (① 분류표: daangn.com) | ⚠ #10 | 중고 거래 |
| 6 | 더쿠 | `https://theqoo.net/` | 북마크바 | O | 오래됨 | 커뮤니티 | 커뮤니티 (① 분류표: theqoo.net) |  |  |
| 18 | 신입 개발자 질문 - OKKY | `https://okky.kr/questions` | 북마크바 | O | 최근 | 커뮤니티 | 커뮤니티 (① 분류표: okky.kr) | ⚠ #6 | 개발자 게시판이라 개발로도 볼 수 있음 |
| 19 | 컴공 취준 모임 : 네이버 카페 | `https://cafe.naver.com/examplecafe` | 북마크바 | O | 오래됨 | 커뮤니티 | 커뮤니티 (① 분류표: cafe.naver.com) |  | 주제(취업)는 보지 않음 |
| 24 | 에펨코리아 | `https://www.fmkorea.com/` | 북마크바 | O | 오래됨 | 커뮤니티 | 커뮤니티 (① 분류표: fmkorea.com) |  |  |
| 31 | 뽐뿌 게시판 | `https://www.ppomppu.co.kr/zboard/zboard.php?id=ppomppu` | 북마크바 | O | 오래됨 | 커뮤니티 | 커뮤니티 (① 분류표: ppomppu.co.kr) |  | 할인 정보지만 게시판 |
| 32 | r/korea - Reddit | `https://www.reddit.com/r/korea/` | 가져온 북마크 | O | 오래됨 | 커뮤니티 | 커뮤니티 (① 분류표: reddit.com) |  |  |
| 71 | 프로그래밍 갤러리 - 디시인사이드 | `https://gall.dcinside.com/board/lists?id=programming` | 북마크바 | O | 최근 | 커뮤니티 | 커뮤니티 (① 분류표: dcinside.com) |  | 제목의 '프로그래밍'은 보지 않음 |
| 86 | 블라인드 | `https://www.teamblind.com/kr/` | 북마크바 | O | 최근 | 커뮤니티 | 커뮤니티 (① 분류표: teamblind.com) |  |  |
| 16 | Instagram | `https://www.instagram.com/` | 북마크바 | O | 최근 | 분류 안 됨 | 분류 안 됨 (④ 없음) | ⚠ #4 | SNS. 커뮤니티로 볼 수도 있음 |
| 17 | 네이버 지도 | `https://map.naver.com/` | 북마크바 | O | 오래됨 | 분류 안 됨 | 분류 안 됨 (④ 없음) |  | 지도 |
| 22 | 항공사 특가 경쟁 과열 - 네이버 뉴스 | `https://n.news.naver.com/article/001/0000000001` | 북마크바 | O | 최근 | 분류 안 됨 | 분류 안 됨 (① 분류하지 않는 사이트: news.naver.com) |  | v10까지는 '특가' 키워드로 쇼핑이 되던 줄 |
| 29 | 신뢰를 공고히 하는 법 - 나무위키 | `https://namu.wiki/w/example` | 가져온 북마크 | O | 오래됨 | 분류 안 됨 | 분류 안 됨 (① 분류하지 않는 사이트: namu.wiki) |  | v10까지는 '공고' 키워드로 취업이 되던 줄 |
| 37 | 컴퓨터공학과 - 나무위키 | `https://namu.wiki/w/%EC%BB%B4%ED%93%A8%ED%84%B0%EA%B3%B5%…` | 북마크바 | O | 오래됨 | 분류 안 됨 | 분류 안 됨 (① 분류하지 않는 사이트: namu.wiki) |  | v10까지는 '학과' 키워드로 학교가 되던 줄 |
| 38 | RISS 통합검색 | `https://www.riss.kr/` | 가져온 북마크 | O | 오래됨 | 분류 안 됨 | 분류 안 됨 (④ 없음) | ⚠ #17 | 논문 검색 |
| 46 | 받은편지함 - Gmail | `https://mail.google.com/mail/u/0/#inbox` | 북마크바 | O | 최근 | 분류 안 됨 | 분류 안 됨 (④ 없음) |  | 메일 |
| 58 | 개발 서버 | `http://localhost:3000/` | 북마크바 | O | 최근 | 분류 안 됨 | 분류 안 됨 (④ 없음) |  | 주소로 알 수 없음 |
| 59 | ChatGPT | `https://chatgpt.com/` | 북마크바 | O | 최근 | 분류 안 됨 | 분류 안 됨 (④ 없음) | ⚠ #17 | AI 도구 |
| 94 | NAVER | `https://www.naver.com/` | 북마크바 | O | 오래됨 | 분류 안 됨 | 분류 안 됨 (④ 없음) |  | 포털 |

## 3. 확신 없는 줄

정답이 분류표 문서 9번의 제안에 달려 있는 줄이다. 번호는 9번 표의 번호다. 팀이 제안을 다르게 정하면 이 줄의 정답도 같이 바꾼다.

| # | 제목 | 지금 정답 | 사유 | 바뀔 수 있는 정답 |
|---|---|---|---|---|
| 2 | YES24 | 쇼핑 | #10 중고 거래·온라인 서점 | 분류 안 됨 |
| 10 | MIT OpenCourseWare | 학교 | #13 .edu 주소 끝 규칙. 대학이 운영하지만 강의 제공 사이트라 온라인 강의로도 볼 수 있음 | 분류 안 됨 / 온라인 강의 |
| 16 | Instagram | 분류 안 됨 | #4 SNS | 커뮤니티 |
| 18 | 신입 개발자 질문 - OKKY | 커뮤니티 | #6 개발자 게시판 | 개발 |
| 30 | 김OO의 개발 블로그 | 블로그·글 | #5 github.io | 개발 |
| 35 | 한국장학재단 | 학교 | #2 한국장학재단. 정부 기관 주소(.go.kr) | 분류 안 됨 |
| 36 | 미리캔버스 | 문서·협업 | #8 디자인 도구 | 분류 안 됨 |
| 38 | RISS 통합검색 | 분류 안 됨 | #17 AI 도구·논문 검색 | 새 카테고리 |
| 49 | 앱 시안 - Figma | 문서·협업 | #8 디자인 도구 | 분류 안 됨 |
| 50 | Slack - 졸업프로젝트 | 문서·협업 | #9 메신저(슬랙). 메신저로 보면 분류 안 됨 | 분류 안 됨 |
| 59 | ChatGPT | 분류 안 됨 | #17 AI 도구·논문 검색 | 새 카테고리 |
| 66 | i-Campus - 성균관대학교 | 학교 | #13 .edu 주소 끝 규칙 | 분류 안 됨 |
| 78 | TikTok | 영상 | #12 틱톡·TED. SNS로 보면 분류 안 됨 | 분류 안 됨 |
| 79 | TED: Ideas worth spreading | 영상 | #12 틱톡·TED | 영상 그대로 (#12의 다른 선택지는 틱톡만 바꿈) |
| 88 | 공모전 - 캠퍼스픽 | 취업 | #3 대외활동·공모전 | 분류 안 됨 |
| 93 | LinkedIn | 취업 | #7 링크드인. SNS로 보면 분류 안 됨 | 분류 안 됨 |
| 96 | 당근 | 쇼핑 | #10 중고 거래·온라인 서점 | 분류 안 됨 |

## 4. 쓰는 법

1. 크롬에서 새 프로필을 만들고, 북마크 관리자 → 점 3개 메뉴 → **북마크 가져오기**로 `sample-100.html`을 넣는다.
2. **가져오기 결과 (2026-10-07 확인함)**: 북마크가 하나도 없는 새 프로필에 가져오면, 북마크바 74개와 `졸업프로젝트`·`알바·취준` 폴더는 북마크바에 그대로 들어간다. 기타 북마크 자리에 둔 16개와 `자취템` 폴더는 기타 북마크가 아니라 **북마크바 맨 끝의 "가져온 북마크" 폴더** 안에 들어간다. 크롬의 HTML 가져오기는 기타 북마크에 아무것도 넣지 않기 때문이다. 이 정답지의 위치 열은 이 결과를 기준으로 적었다.
   - **명세에 반영 (F05-04, N19)**: 확장 프로그램이 크롬 가져오기 폴더("가져온 북마크")를 사용자 폴더로 보지 않고, 그 바로 아래 북마크를 정리 대상에 넣는다 (`plan.js`의 `getTargets`, F05-04·N19). 다른 브라우저에서 북마크를 옮겨 온 실제 사용자도 같은 폴더를 갖게 되므로 테스트와 실제 동작을 함께 맞추기 위한 것이다. 이 전제가 지켜지면 가져온 그대로 테스트한다.
   - **`getTargets`가 이 규칙을 구현하기 전이거나, 가져오기 폴더의 이름이 "가져온 북마크"가 아닐 때(영어 크롬 등. 명세 v14에서 한국어 크롬의 파일 가져오기만 다루기로 했다)**: 원래 규칙대로면 "가져온 북마크" 안의 16개가 정리 대상에서 빠져 74개만 남는다. 정답지와 맞추려면 북마크 관리자에서 "가져온 북마크" 폴더를 열고, Ctrl+A → Ctrl+X → 왼쪽 "기타 북마크" 누르고 Ctrl+V → 빈 "가져온 북마크" 폴더 삭제 순서로 꺼낸다. 옮겨도 저장일(`ADD_DATE`)은 그대로 남는다.
   - 북마크바가 비어 있지 않은 프로필에 가져오면 100개 전부가 "가져온 북마크" 폴더 하나에 묶인다(크롬 가져오기 코드 기준이고 직접 해 보지는 않았다). 반드시 북마크가 하나도 없는 새 프로필에서 가져온다.
3. 저장일(`ADD_DATE`)은 파일에 들어 있다. "최근 30일 안에 북마크바에서 연 북마크"(`dateLastUsed`)는 HTML로 넣을 수 없으므로, 확인이 필요하면 몇 개를 직접 열어 둔다.
4. 사용자 폴더(`졸업프로젝트`, `알바·취준`, `자취템`)의 10개는 정리 대상에서 빠진다(F05-04). 분류 정확도는 100개 전부로, 폴더 계획은 나머지로 확인한다.
5. `answer-key-100.json`의 `answer`가 `null`이면 분류 안 됨이 정답이다. `uncertain`은 3번 표의 사유 번호다. `location`은 가져온 뒤의 위치, `target`은 정리 대상 여부다 (2의 전제 기준).
