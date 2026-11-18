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
| `extension/img/wallpapers/dawn.jpg` (+ `thumb/dawn.jpg`: 같은 사진을 줄인 것) | 미리 넣은 배경 사진 (JPG) · 아직 main에 없음 | 출처 확인 필요(D, S2) | |
| `extension/img/wallpapers/lavender.jpg` (+ `thumb/lavender.jpg`: 같은 사진을 줄인 것) | 미리 넣은 배경 사진 (JPG) · 아직 main에 없음 | 출처 확인 필요(D, S2) | |
| `extension/img/wallpapers/mint.jpg` (+ `thumb/mint.jpg`: 같은 사진을 줄인 것) | 미리 넣은 배경 사진 (JPG) · 아직 main에 없음 | 출처 확인 필요(D, S2) | |
| `extension/img/wallpapers/mist.jpg` (+ `thumb/mist.jpg`: 같은 사진을 줄인 것) | 미리 넣은 배경 사진 (JPG) · 아직 main에 없음 | 출처 확인 필요(D, S2) | |
| `extension/img/wallpapers/peach.jpg` (+ `thumb/peach.jpg`: 같은 사진을 줄인 것) | 미리 넣은 배경 사진 (JPG) · 아직 main에 없음 | 출처 확인 필요(D, S2) | |
| `extension/img/avatars/` lavender · mint · peach · pink · sky · slate `.svg` (6개) | 계정 동그라미 대체 이미지 (SVG) · 아직 main에 없음 | 직접 만든 것인지 확인 필요(D, S4) | |
| `extension/fonts/` | 글꼴 Pretendard · 나눔명조 | | |

<!-- TODO: 11/24 기능 고정 뒤 확인. 배경 사진·대체 이미지는 11/18 현재 main에 없고 origin/feat/F12-newtab-p3(팀원 D)에만 있다. 들어오면 "아직 main에 없음"을 지운다. thumb/ 사진은 원본과 출처·라이선스가 같아야 한다 -->
<!-- TODO: 11/24 기능 고정 뒤 확인. Pretendard·나눔명조, SIL OFL, fonts/에 OFL 파일 함께(S3) — D newtab-p3 뒤 확인. fonts/ 폴더와 @font-face는 main에도 newtab-p3에도 아직 없다. 들어오면 위 한 줄을 파일마다 나누고 OFL 파일 경로도 적는다 -->

## 웹스토어 자료 (`store/`)

확장 프로그램에는 넣지 않고 웹스토어 등록 화면에만 올린다.

| 파일 경로 | 종류 | 출처 | 라이선스 |
| --- | --- | --- | --- |
| `store/promo-small-440x280.png` | 작은 프로모션 타일 (PNG, 440×280) | 팀 제작인지 확인 필요 | |

<!-- TODO: 스크린샷(1280×800)을 store/에 넣으면 여기에 줄을 더한다. 샘플 북마크 프로필로 찍고 실제 북마크·이름·메일이 보이지 않게 한다 -->
