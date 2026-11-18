# 사진·글꼴·그림 출처

확장 프로그램(`extension/`)에 넣어 함께 배포하는 글꼴·사진·그림 파일과, 웹스토어에 올리는 이미지(`store/`)의 출처와 라이선스를 적는다. 웹스토어 제출 준비 #84의 S2~S4에 쓴다.

- 재배포가 허락된 파일만 넣는다(직접 만들거나 찍은 것, SIL OFL 글꼴, Unsplash·Pexels 라이선스 사진 등).
- 사람 얼굴·상표·다른 서비스의 캐릭터나 로고가 보이는 것은 넣지 않는다.
- 파일을 추가하거나 바꾸면 이 표에 한 줄을 같이 고친다.

## 확장 프로그램 안 (`extension/`)

| 파일 경로 | 종류 | 출처 | 라이선스 |
| --- | --- | --- | --- |
| `extension/icons/icon16.png` | 확장 프로그램 아이콘 (PNG) | 팀 제작인지 확인 필요 | |
| `extension/icons/icon48.png` | 확장 프로그램 아이콘 (PNG) | 팀 제작인지 확인 필요 | |
| `extension/icons/icon128.png` | 확장 프로그램 아이콘 (PNG) | 팀 제작인지 확인 필요 | |
| `extension/img/cloud-background.jpg` (+ `img/wallpapers/thumb/cloud.jpg`: 같은 사진을 줄인 것) | 기본 배경 사진 (JPG, #51) | 출처 확인 필요(D, S2) | |
| `extension/img/wallpapers/dawn.jpg` (+ `thumb/dawn.jpg`: 같은 사진을 줄인 것) | 미리 넣은 배경 사진 (JPG) · 아직 main에 없음(#87) | 출처 확인 필요(D, S2) | |
| `extension/img/wallpapers/lavender.jpg` (+ `thumb/lavender.jpg`: 같은 사진을 줄인 것) | 미리 넣은 배경 사진 (JPG) · 아직 main에 없음(#87) | 출처 확인 필요(D, S2) | |
| `extension/img/wallpapers/mint.jpg` (+ `thumb/mint.jpg`: 같은 사진을 줄인 것) | 미리 넣은 배경 사진 (JPG) · 아직 main에 없음(#87) | 출처 확인 필요(D, S2) | |
| `extension/img/wallpapers/mist.jpg` (+ `thumb/mist.jpg`: 같은 사진을 줄인 것) | 미리 넣은 배경 사진 (JPG) · 아직 main에 없음(#87) | 출처 확인 필요(D, S2) | |
| `extension/img/wallpapers/peach.jpg` (+ `thumb/peach.jpg`: 같은 사진을 줄인 것) | 미리 넣은 배경 사진 (JPG) · 아직 main에 없음(#87) | 출처 확인 필요(D, S2) | |
| `extension/img/avatars/` lavender · mint · peach · pink · sky · slate `.svg` (6개) | 계정 동그라미 대체 이미지 (SVG) · 아직 main에 없음(#87) | 직접 만든 것인지 확인 필요(D, S4) | |
| `extension/fonts/Pretendard-Regular.subset.woff2` | 글꼴 Pretendard 보통 (WOFF2, 공식 줄인 판, F18-11) · 아직 main에 없음(#87) | Pretendard 1.3.9 (orioncactus), 공식 줄인 판을 고치지 않고 넣음 | SIL OFL 1.1 |
| `extension/fonts/Pretendard-Bold.subset.woff2` | 글꼴 Pretendard 굵게 (WOFF2, 공식 줄인 판, F18-11) · 아직 main에 없음(#87) | Pretendard 1.3.9 (orioncactus), 공식 줄인 판을 고치지 않고 넣음 | SIL OFL 1.1 |
| `extension/fonts/OFL-Pretendard.txt` | Pretendard 라이선스 원문 · 아직 main에 없음(#87) | Pretendard 1.3.9 (orioncactus) | SIL OFL 1.1 |

나눔명조는 넣지 않는다. 명조는 PC에 깔린 글꼴을 쓴다(명세 v23 F18-11).

<!-- TODO: #87이 main에 합쳐지면 "아직 main에 없음(#87)"을 지운다. thumb/ 사진은 원본과 출처·라이선스가 같아야 한다 -->

## 웹스토어 자료 (`store/`)

확장 프로그램에는 넣지 않고 웹스토어 등록 화면에만 올린다.

| 파일 경로 | 종류 | 출처 | 라이선스 |
| --- | --- | --- | --- |
| `store/promo-small-440x280.png` | 작은 프로모션 타일 (PNG, 440×280) | 팀 제작인지 확인 필요 | |
| `store/screenshot-1-newtab.png` ~ `store/screenshot-5-….png` (최대 5장) | 스크린샷 (PNG, 1280×800) · 아직 없음 | 팀이 샘플 북마크 프로필로 직접 찍음 (찍는 법: `store/listing.md` 5절) | |

<!-- TODO: 스크린샷을 찍어 넣으면 위 한 줄을 파일마다 나누고 "아직 없음"을 지운다. 실제 북마크·이름·메일이 보이지 않게 한다 -->
