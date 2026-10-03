# 보리런 · BARLEY RUN

**우리 동네의 한 걸음이, 좋은 일로.** 지역별 누적 러닝 거리로 21일 시즌을 겨루고, 우승 지역의 이름으로 기부하는 앱의 디자인 및 작동하는 로컬 MVP입니다.

Expo SDK 57 / React Native / TypeScript. iOS·Android·웹 공유 코드입니다. **검증된 플랫폼은 웹(데스크톱·모바일 화면)입니다. iOS·Android Hermes 번들 생성도 통과했습니다. 네이티브 앱 빌드·야외 GPS 정확도·앱스토어 배포는 아직 검증하지 않았습니다.**

## 내 PC / VS Code에서 시작

Node.js 22.13 이상(클라우드 검증: 24.19), Git을 설치하세요.

```bash
git clone https://github.com/Dragonite-Lee/barley-running.git
cd barley-running
npm ci
code .
npm run web
```

VS Code의 터미널에서 실행하면 Expo가 개발 서버를 시작합니다. 터미널에 표시되는 주소를 내 PC 브라우저로 여세요. API 키, 계정, DB 없이 체험할 수 있습니다. 저장소가 비공개라면 GitHub의 기존 인증을 사용하세요. GitHub의 **Code → Download ZIP**으로 받아 압축을 풀어도 됩니다.

처음에는 **내 지역 선택 → 지역 확정 → 러닝 → 데모로 먼저 달려보기 → 일시정지 → 종료하고 기록 저장** 순서로 체험하세요. 데모 거리와 시간은 10배속으로 움직입니다.

실제 GPS는 위치 권한 및 HTTPS 보안 컨텍스트(로컬 PC의 loopback 포함)가 필요합니다. 폰에서 일반 HTTP LAN 주소로 연 웹에서는 위치 권한이 제한될 수 있습니다. 위치 거부 시 데모를 사용할 수 있습니다.

## iOS / Android 개발

```bash
npm start
# 설치된 Expo Go가 SDK 57을 지원하는 경우 터미널의 QR 코드로 실행
```

Expo Go와 SDK가 맞지 않으면 해당 SDK를 지원하는 development build를 사용하세요. 네이티브 로컬 빌드는 Android Studio/Android SDK 또는 macOS/Xcode가 필요합니다.

```bash
npm run android
# macOS에서
npm run ios
```

기본 bundle ID는 `com.barleyrun.app`입니다. 정식 배포 전 소유한 식별자로 변경하세요. 이 MVP에는 **백그라운드 위치 권한이나 추적 서비스가 없습니다**. 전경 GPS만 구현하며 앱이 비활성화되면 일시정지합니다. 폰 잠금·배터리 최적화·권한 변경·실외 GPS는 실기기에서 별도 검증해야 합니다.

## 구현 범위

| 기능                                        | 현재 상태                                              |
| ------------------------------------------- | ------------------------------------------------------ |
| 브랜드 / 홈 / 토너먼트 / 러닝 / 기부 / 기록 | 반응형 UI 구현                                         |
| 지역 선택                                   | 6개 샘플 지역, 시즌 중 변경 제한                       |
| 시즌                                        | 2026-09-28 00:00 KST 기준 21일, 다음 시즌 재선택       |
| 러닝                                        | 전경 GPS 거리·시간·평균 페이스, 일시정지/재개/저장     |
| 데모 러닝                                   | 위치 권한 없이 10배속 가상 러닝                        |
| 개인 기록                                   | AsyncStorage 로컬 저장, 닉네임·이름 공개 선택 동의     |
| 순위                                        | 샘플 거리 + 현재 기기 기록, 실제 다중 사용자 경쟁 아님 |
| 기부 / 수익                                 | 콘셉트 UI, 샘플 금액, 실제 집행·광고 없음              |
| 회원 인증 / 서버 / DB / 정산                | 미구현, 후속 설계는 docs/PRODUCT.md                    |

정식 대회에는 클라이언트 시간을 신뢰할 수 없습니다. 현재 지역 고정·시즌·GPS 필터는 UX 검증용이며 보안 경계가 아닙니다. 로컬 데이터 삭제로 지역을 재선택할 수 있고, 조작·중복·부정 기록은 서버 도입 후 검증해야 합니다. 샘플 리그 거리는 시즌별로 같은 예시를 재사용하며 개인 기여분만 해당 시즌에 합산합니다. 기록은 시작 시즌에 귀속되고 시즌 경계에서 측정을 자동으로 멈춥니다. 이어 달릴 때 정지 중 이동 거리는 제외합니다.

종료·저장 전 새로고침/강제 종료 시 진행 중 기록은 복구되지 않습니다. 저장한 GPS 좌표는 기기에만 남고 서버 전송이나 실제 경로 지도는 없습니다. 기록 삭제는 확인 후 전체 삭제합니다.

## 디자인 초안

- [데스크톱 홈](docs/design/home-desktop.png)
- [모바일 홈](docs/design/home-mobile.png)
- [모바일 러닝](docs/design/run-mobile.png)
- [모바일 토너먼트](docs/design/tournament-mobile.png)
- [모바일 기부](docs/design/impact-mobile.png)
- [브랜드·화면 설계](docs/DESIGN.md)
- [제품 규칙 / 서버·DB 후속 설계](docs/PRODUCT.md)

Figma 연결은 제공되지 않아 코드 기반으로 제작했습니다. 로고·보리·러너 일러스트는 `src/components/Art.tsx`의 수정 가능한 SVG입니다. 외부 이미지·지도 API·폰트 CDN을 요구하지 않습니다.

## 검증

```bash
npm run typecheck
npm test
npm run build:web
npx playwright install chromium
npm run test:e2e
```

이미 설치된 Chromium을 사용하는 Linux 환경에서는:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

브라우저 테스트는 먼저 생성한 `dist`를 사용합니다. 코드를 수정한 뒤에는 `npm run build:web`를 다시 실행하세요. 테스트의 GPS는 브라우저가 제공하는 모의 위치이며 실외 정확도 검증이 아닙니다. 웹 미리보기는 `node scripts/serve-web.mjs`로도 실행할 수 있습니다.

클라우드에서 홈 디렉터리를 쓸 수 없으면 `npm --cache /tmp/barley-npm-cache ci`, `EXPO_NO_TELEMETRY=1 npm run build:web`를 사용합니다.

## 주요 코드

- `App.tsx`: 5개 화면, 지역 선택·삭제 모달, 로컬 저장 흐름
- `src/components/Art.tsx`: 브랜드 SVG·아이콘
- `src/lib/domain.ts`: 시즌·거리·페이스·리그·저장 검증
- `src/lib/useRunner.ts`: 러닝 생명주기와 GPS 연결
- `tests/`: 도메인 테스트와 브라우저 흐름 테스트

광고 배분 70:30은 설명을 위한 가상 예시이며, 법적으로 정해진 허용 비율이 아닙니다. 실제 비율과 기부처는 검토·확정 후 별도로 공개해야 합니다.
