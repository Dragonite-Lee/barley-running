# 검증 기록

2026-10-03, Linux 클라우드 / Node.js 24.19.0에서 검증했습니다.

- `npm ci`: lockfile 기반 재설치 성공.
- `npm run typecheck`: 성공.
- `npm test`: 시즌 경계, 지역 고정/재선택, 거리·페이스, GPS 필터, 저장 데이터, 중복 기록, 시즌별 순위 테스트 9개 통과.
- `npm run build:web`: 웹 production export 성공.
- Playwright / 시스템 Chromium: 데스크톱과 모바일 화면에서 각각 5개, 총 10개 통과. 대시보드, 지역 선택·고정, 데모 러닝·정지·저장·새로고침 복원, 닉네임·동의, 삭제/취소, GPS 위치 갱신, 권한 거부, 손상된 저장소 처리.
- Expo development server: 홈 로드와 러닝 화면 이동을 실제 브라우저로 확인.
- `expo export --platform ios --platform android`: 양쪽 Hermes 번들 생성 성공. 네이티브 앱 설치/실행 검증을 의미하지 않음.
- Expo dependency check: 온라인 확인은 네트워크 정책으로 거부됨. `EXPO_OFFLINE=1`에서는 설치된 SDK의 번들 호환 목록 기준 통과. 최신 온라인 호환성 검증과는 구분함.
- React Native DevTools: 클라우드 홈 디렉터리가 읽기 전용이므로 최신 DevTools 캐시 다운로드는 실패. Expo가 제공한 fallback 사용, 앱 개발 서버 동작 확인.

GPS 브라우저 검증은 모의 위치 주입입니다. 실제 폰의 GPS 정확도, 야외 러닝, 백그라운드 추적, Apple/Google 앱 심사, 다중 사용자 서버, 인증, 광고, 실제 송금·기부, 새 클라우드 작업 복원은 검증하지 않았습니다.

초기 브라우저 테스트 중 모바일 프로필 카드 겹침을 찾아 레이아웃을 수정했습니다. 나머지 초기 실패는 순간적인 거리 값 의존, 권한 문구의 중복 선택, readonly/disabled 구분 문제였으며 테스트가 실제 기능을 검증하도록 수정한 뒤 최종 10개 통과했습니다.
