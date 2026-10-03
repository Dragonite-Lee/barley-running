# 보리런 제품 명세 / 다음 구현 단계

## 이번 버전에서 검증할 가설

러닝을 이미 하는 사람이 개인 기록 외에 동네의 이름과 기부라는 이유로 다시 달리는가? GPS의 정밀도를 포함한 상용 트래커 대체가 아니라, 지역 선택 → 달리기 → 팀 기여 → 기부 이야기의 가치 흐름을 먼저 검증한다.

확인할 지표: 지역 선택 완료율, 첫 기록 완료율, 7일 재방문, 시즌 2회 이상 달리기, 기부 이야기 열람, 이름 공개 선택률. 현재 분석 SDK나 사용자 수집은 설치하지 않았다.

## 시즌과 지역

- 전 지역이 동일한 KST 기준 21일 시즌을 공유한다. 현재 예시 시작은 2026-09-28.
- 회원은 시즌별 지역을 1회 선택한다. 현재 MVP는 주소 인증 없이 응원 지역을 고르는 방식이다.
- 시즌 중 지역 변경을 제한하고 종료 후 다시 고르게 한다.
- 다음 시즌 개인 기록을 삭제하지 않고 시즌 집계만 새로 시작한다.
- 실제 서버는 UTC timestamp로 저장하고 KST로 표시한다.
- 현재 앱은 시즌 경계에서 진행 중 측정을 멈추고 시작 시즌에 저장한다. 서버에서도 마감·업로드 유예 정책을 확정해야 한다.
- 순위 기준은 요청대로 누적 km다. 인구가 큰 지역의 이점을 숨기지 않는다. 별도 인당 기록상·참여율상은 후속 실험 후보이며 주 순위를 임의로 변경하지 않는다.
- 같은 누적 거리의 처리, 행정구역 개편, 허용 지역 목록, 인증 기준은 정식 리그 전에 결정한다. UI의 샘플 6개 지역은 전국 행정구역 데이터가 아니다.

## 수익과 기부

광고의 정산 수익으로 운영비와 기부금을 마련한다는 모델이다. 사용자의 현금 기부/모금 기능은 아직 없다. 특정 비율까지 자체 수익으로 가져가도 된다는 법적 전제를 두지 않는다. UI 70% 기부 / 30% 운영은 **확정되지 않은 가상 예시**다.

실제 시작 전에 검토할 사항:

- 광고사(예: AdMob) 약관과 기부 관련 표현, 수익 정산 지연 및 무효 트래픽 차감
- 총매출/세금/수수료/순수익 중 배분 기준, 고정 비율과 변경 공지
- 수혜 기관의 실체·동의·계좌·영수증과 활동 증빙
- 우승 지역 이름 사용과 참여 회원 이름 공개의 별도 선택 동의
- 개인정보·위치정보 처리, 약관과 삭제/보존 정책

직접 광고 클릭을 요구하거나 달리는 도중 광고를 강제로 노출하지 않는다. 추후 광고는 기록 종료 후 비방해 영역부터 검토하며 실제 광고 단위 ID를 테스트 환경에서 사용하지 않는다. 현재 SDK·광고 요청·매출·기부 송금은 없다.

“보리밭”은 아직 수혜처가 아니라 브랜드 콘셉트다. 농촌 환경, 보리 재배, 지역사회 지원 등 검증 가능한 실제 기관을 정한 다음 연결한다. 이후 시즌마다 다른 기부처도 가능하게 한다.

## 서버: NestJS + PostgreSQL 권장

지금은 프런트엔드와 로컬 저장만 구현했다. 다음 단계에서 같은 저장 인터페이스를 API로 전환한다. 관계형 데이터와 정산 이력을 다루므로 PostgreSQL이 적합하고, GPS 공간 질의가 필요해지면 PostGIS를 추가한다. 초기 NoSQL·Redis·마이크로서비스는 필요하지 않다.

예상 엔터티:

| 엔터티            | 주요 컬럼 / 제약                                                                                            |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| User              | id, provider identity, displayName, consent/version, deletedAt                                              |
| Region            | id, officialCode(unique), city, name, active                                                                |
| Season            | id, startsAt, endsAt, status, beneficiaryId                                                                 |
| Membership        | userId, seasonId, regionId; unique(userId, seasonId)                                                        |
| Run               | id, userId, membershipId, startedAt, endedAt, distanceMeters, activeSeconds, status; idempotencyKey(unique) |
| RunPoint          | runId, sequence, lat/lng, timestamp, accuracy; unique(runId, sequence)                                      |
| SeasonRegionTotal | seasonId, regionId, verifiedMeters; unique(seasonId, regionId)                                              |
| Beneficiary       | id, verifiedName, description, status                                                                       |
| RevenueSettlement | provider, period, gross, adjustments, net, currency, immutable reference                                    |
| Donation          | seasonId, winnerRegionId, beneficiaryId, amount, status, proofUrl                                           |

금액은 원 단위 정수로, 거리는 미터 단위 정밀 값으로 저장하고 표시 시 반올림한다. 전체 GPS 궤적은 공개하지 않는다. 시즌 순위에는 서버가 검증한 기록만 합산하고, 기록 업로드·검증·집계는 트랜잭션과 멱등성 키로 중복 반영을 막는다.

예상 API:

- `GET /seasons/current`, `GET /regions`, `POST /seasons/:id/membership`
- `POST /runs`(서버 거리 재계산/중복 방지), `GET /me/runs`
- `GET /seasons/:id/leaderboard`, `GET /seasons/:id/donation`
- `PATCH /me`(닉네임/선택 동의), `DELETE /me`

인증 토큰에서 사용자 신원을 가져오고 클라이언트가 전달한 userId·총거리·시각을 신뢰하지 않는다. 동시 지역 선택에 unique 제약, 부정 속도/시간/경로 검증과 보류 상태, 재심 정책을 둔다. 공개 감사 목록에서는 명시적으로 동의한 별명만 제공한다.

## 후속 구현 순서

1. 네이티브 실기기 테스트: GPS·권한·잠금 화면·배터리·중단 복구. Expo TaskManager/Location 기반 background tracking은 development build에서 별도 구현.
2. 로그인 + NestJS/PostgreSQL + 실제 지역 코드. 로컬 기록 업로드와 서버 검증, 시즌 및 순위 구현.
3. 관리자 정산·기부처 관리·영수증 게시. 광고는 승인된 수익 모델과 테스트 ID부터 연결.
4. 소규모 지역 파일럿, 앱 심사·위치정보 관련 검토, 운영 정책 확정 후 배포.
