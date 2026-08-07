# 관리자 와인 수집 페이지 PRD

- 문서 상태: 구현 전 검토안
- 작성일: 2026-08-06
- 화면명: `와인 수집`
- 메뉴 위치: `관리자 > 주류 > 와인 수집`
- 화면 경로: `/admin/spirits/wine-crawler`
- 관리자 API: `/api/admin/wine-crawler/**`
- 관련 문서:
  - `docs/wine-vintage-vivino-ingestion-prd.md`
  - `docs/vivino-wine-continuous-crawler-prd.md`

## 1. 결론

관리자에 `와인 수집` 페이지를 신설한다. 이 페이지는 단순 로그 뷰어가 아니라 다음 네 가지를 한곳에서
관리하는 운영 콘솔이다.

1. 자동 수집 활성화 여부와 웹 크롤링 허가/worker 준비 상태 확인
2. `지금 수집` 버튼을 통한 비동기 수집 요청 및 안전한 중단 요청
3. 현재 실행의 진행률과 단계별 상태 확인
4. 실행 이력과 와인별 등록 성공·갱신·중복 PASS·재시도·실패 목록 확인

관리자 API가 Python 프로세스를 직접 실행하지 않는다. 관리자가 버튼을 누르면 DB에 `QUEUED` 실행 요청을
만들고, 서버의 와인 crawler가 이를 원자적으로 claim해 처리한다. 이 구조는 API 서버와 crawler가 서로 다른
프로세스/릴리스여도 동작하고, 중복 클릭·서버 재시작·배포 중 race를 제어할 수 있다.

서면 허가 전 화면에서는 실제 Vivino 웹 수집 버튼을 비활성화한다. 대신 합성 fixture 또는 Vivino가 승인한
샘플을 사용하는 `허가 검토 데모`만 실행할 수 있으며 누적 3건·로컬·HIDDEN 제한을 그대로 적용한다.

## 2. 현재 관리자 구조에서 재사용할 부분

현재 애플리케이션에는 별도 와인 crawler 관리 화면이 없다. 다음 기존 패턴을 재사용한다.

| 기존 구현 | 재사용 방향 |
|---|---|
| `ADMIN_NAV` 단일 메뉴 정의 | 주류 그룹에 `와인 수집` 추가 |
| `App.tsx` lazy route | 정적 crawler route를 `spirits/:id` 앞에 추가 |
| `AdminAiNewsPage` 탭·설정·실행 이력 | 와인 수집의 현황·결과·실행 이력·설정 탭 UI 기준 |
| React Query | 목록 조회, mutation, 실행 중 polling |
| `Pagination`, `Spinner`, 날짜 formatter | 공통 UI 재사용 |
| `ApiResponse<T>`, `PageResponse<T>` | 관리자/내부 API 응답 규약 |
| AI 소식 `AiNewsRun` | 실행 이력 모델의 참고 구조 |
| 기존 `SlackNotifier` | 와인별 실패 묶음 알림 전송 |
| 관리자 변경 이력 | 자동화 ON/OFF, 수동 실행, 중단, 재시도 action 기록 |

중요한 보안 차이:

- UI 경로는 주류 메뉴 아래인 `/admin/spirits/wine-crawler`를 사용한다.
- API는 `/api/admin/spirits/**` 아래에 만들지 않는다. 이 경로는 현재 `PARTNER`도 일부 접근 가능하다.
- 운영 제어 API는 `/api/admin/wine-crawler/**`로 분리하고 `ADMIN/SUPER_ADMIN`만 허용한다.
- 메뉴도 파트너의 `allowedMenus` 부여 대상에서 제외하는 `adminOnly` 또는 `grantable=false` 속성을 추가한다.

## 3. 목표와 비목표

### 3.1 목표

- 관리자가 crawler 활성화·비활성화 상태를 명확히 확인하고 변경한다.
- 관리자가 현재 허용된 모드에서 최대 건수를 정해 `지금 수집`을 요청한다.
- 한 번의 클릭이 하나의 실행 요청만 만들도록 멱등 처리한다.
- 현재 실행의 선택 건수, 처리 건수, 현재 와인, heartbeat를 확인한다.
- 관리자 중단은 안전한 candidate 경계에서 처리한다.
- 실행별 통계와 와인별 결과를 분리해 확인한다.
- 등록 성공 와인에서 관리자 주류 상세로 바로 이동한다.
- 실패한 와인은 이름·링크·사유·시도 횟수·다음 재시도 시각을 확인한다.
- 확정 중복은 실패가 아닌 `중복 PASS`로 명확히 구분한다.
- 라이선스/worker/설정 이상으로 실행할 수 없는 이유를 버튼 옆에 표시한다.
- PC에서는 넓은 테이블, 모바일에서는 카드형 결과로 사용할 수 있게 한다.

### 3.2 비목표

- 브라우저 요청이 끝날 때까지 crawler 처리를 동기 대기
- API 서버에서 `ProcessBuilder`, shell, SSH로 Python crawler 직접 실행
- 진행 중 프로세스를 OS kill로 강제 종료
- 관리자 화면에 API key, webhook, 내부 key, signed URL 표시·수정
- 실패 데이터를 화면에서 임의 수정한 뒤 출처 검증 없이 즉시 ACTIVE 등록
- 라이선스가 없는데 화면 버튼만으로 실제 Vivino 네트워크 접근 허용
- crawler가 등록한 와인을 자동 ACTIVE로 전환하는 기능
- Slack 대신 관리자 페이지만 보고 장애를 알아야 하는 구조

## 4. 정보 구조

페이지 제목과 사이드바 라벨은 관리자 용어 규칙에 따라 모두 `와인 수집`으로 통일한다.

```text
와인 수집
├─ 상단 운영 상태
│  ├─ 라이선스/공급자 상태
│  ├─ crawler heartbeat
│  ├─ 자동 수집 ON/OFF
│  ├─ 최근 실행 결과
│  └─ 지금 수집 / 중단 요청
├─ 현황 탭
│  ├─ 현재 실행 진행률
│  ├─ 오늘/최근 24시간 통계
│  └─ 최근 실패·충돌
├─ 수집 결과 탭
│  └─ 와인 빈티지별 성공/갱신/PASS/재시도/실패 목록
├─ 실행 이력 탭
│  └─ 실행 단위 통계와 상세
└─ 설정 탭
   ├─ 자동 수집
   ├─ 시간당 한도
   ├─ target 상태
   └─ 권한 상태(읽기 전용)
```

탭은 URL query에 보존한다.

```text
/admin/spirits/wine-crawler?tab=overview
/admin/spirits/wine-crawler?tab=results
/admin/spirits/wine-crawler?tab=runs
/admin/spirits/wine-crawler?tab=settings
```

필터와 페이지도 query string에 보존해 상세에서 뒤로 갔을 때 목록 상태를 유지한다.

## 5. 상단 운영 상태와 제어

### 5.1 상태 카드

| 카드 | 표시 내용 |
|---|---|
| 공급자 | Fixture / 승인 샘플 / Vivino Web Crawler |
| 웹 크롤링 허가 | 미설정 / 제한 PoC / 정식 허가 / 설정 불일치 |
| Worker | 정상 / 지연 / 오프라인, 마지막 heartbeat |
| 자동 수집 | ON / OFF, 다음 예정 시각 |
| 현재 실행 | 대기 / 실행 중 / 중단 요청 / 없음 |
| 오늘 결과 | 등록·갱신·중복 PASS·재시도·거절·충돌 |
| 데모 한도 | `2 / 3건 사용`, 정식 모드에서는 숨김 |
| 시간당 한도 | `선택 7 / 10`, 다음 quota 초기화 시각 |

상태 색상:

- 초록: 정상·허가 완료·성공
- 파랑: 대기·실행 중·재시도 예정
- 회색: OFF·수집 전·중복 PASS
- 주황: 설정 미완료·중단 요청·검토 필요
- 빨강: worker 오프라인·인증 실패·실행 실패·상한 위반

색상만으로 상태를 전달하지 않고 텍스트와 아이콘을 같이 사용한다.

### 5.2 자동 수집 토글

- 라벨: `자동 수집`
- ON: 매시 37분 스케줄 실행 요청을 허용한다.
- OFF: 새로운 스케줄 실행을 만들지 않는다.
- OFF로 바꿔도 현재 실행을 강제 중단하지 않는다.
- 현재 실행도 멈추려면 별도의 `중단 요청`을 눌러야 한다.
- 변경 전 확인창에 영향 범위를 표시한다.
- 변경 결과는 관리자 변경 이력에 사용자 ID·이전값·새값·시각을 남긴다.
- provider 권한이 미완료이면 ON 저장을 409로 거부하고 누락 설정명을 반환한다.

### 5.3 `지금 수집` 버튼

버튼을 누르면 작은 실행 설정 modal을 연다.

입력값:

- 실행 모드: 현재 서버가 허용한 모드만 표시
- 처리 건수: 1~잔여 상한
- 저장 여부: `드라이런` 또는 `HIDDEN 등록`
- 실패 후보 재시도 포함 여부
- 관리자 메모: 선택, 최대 300자

기본값:

- `LICENSE_REVIEW_DEMO`: 최대 3과 남은 누적 quota 중 작은 값, HIDDEN만 허용
- `LICENSED_SANDBOX`: 1건, HIDDEN
- `LICENSED_PRODUCTION`: 3건, HIDDEN
- 운영 안정화 후에도 UI 최대값은 10

버튼 비활성 조건:

- active 또는 queued run이 이미 있음
- crawler worker heartbeat가 기준 시간보다 오래됨
- 권한 설정이 현재 모드에 불충분
- 데모 누적 3건 소진
- 시간당 quota 잔여 0
- 배포/점검 잠금 상태
- 서버 전체 disable switch OFF

비활성 버튼 아래에 `왜 실행할 수 없는지`를 한글로 표시한다.

### 5.4 중복 클릭 방지

- modal 확인 시 client request ID(UUID)를 만든다.
- `POST /api/admin/wine-crawler/runs`에 `Idempotency-Key`로 전달한다.
- 서버는 `(requestedBy, idempotencyKey)` unique 제약으로 같은 요청을 한 번만 생성한다.
- 요청 중 버튼을 disable한다.
- 네트워크 timeout 후 같은 key로 재전송하면 기존 run을 반환한다.
- 이미 active run이 있으면 409와 해당 run ID를 반환하고 화면은 그 실행으로 이동한다.

### 5.5 `중단 요청` 버튼

- `RUNNING` 실행에만 표시한다.
- 확인창에는 “현재 처리 중인 한 건은 완료될 수 있으며 다음 후보부터 중단됩니다”를 표시한다.
- 상태를 `CANCEL_REQUESTED`로 바꾼다.
- crawler는 상세 단계 사이와 candidate 경계에서 상태를 확인한다.
- 이미지 파일 업로드 또는 DB transaction 도중에는 강제 종료하지 않는다.
- 종료 후 최종 상태는 `CANCELLED`; 이미 완료된 결과는 유지한다.
- 2분 이상 응답이 없으면 UI는 `중단 지연`을 표시하고 danger Slack 대상에 포함한다.

## 6. 현황 탭

### 6.1 현재 실행 카드

실행 중이면 다음을 표시한다.

- run ID와 실행 유형(`SCHEDULED/MANUAL/DEMO/RETRY`)
- 시작자 또는 `SYSTEM`
- 시작 시각과 경과 시간
- 선택 `N건`, 처리 `N건`, 남은 `N건`
- 현재 단계: discovery/fetch/enrich/dedupe/import
- 현재 와인명·빈티지와 원문 링크
- 마지막 heartbeat
- 진행률 bar
- 등록/갱신/중복 PASS/재시도/실패 실시간 집계

현재 candidate의 단계는 운영 편의를 위한 정보이며, 원문 응답·credential·내부 stack trace는 표시하지 않는다.

### 6.2 오늘/최근 24시간 요약

- 실행 횟수
- 선택 후보
- 신규 등록
- 외부 정보 갱신
- 중복 PASS
- 재시도 예정
- 영구 거절
- 애매한 충돌
- 성공률: `(등록 + 갱신 + 중복 PASS) / 처리 완료`
- 평균 후보 처리 시간

`중복 PASS`를 성공률에 포함하되 신규 등록 수에는 포함하지 않는다.

### 6.3 최근 확인 필요

최대 5건의 `CONFLICT`, 최종 `REJECTED`, provider 장애를 보여 준다.

- 와인명·빈티지
- 사유 요약
- 발생 시각
- 상세 보기
- 등록된 와인 후보가 있으면 비교 링크

## 7. 수집 결과 탭

### 7.1 필터

- 검색: Vivino 영문명, 관리자가 입력한 국문명, external wine/vintage ID
- 결과 상태:
  - 전체
  - 등록 완료
  - 정보 갱신
  - 중복 PASS
  - 재시도 예정
  - 등록 제외
  - 확인 필요
- 실행 유형: 자동/수동/데모/재시도
- 공급자
- 빈티지 연도 또는 NV
- 날짜 범위
- Slack 발송 여부

필터 변경 시 page를 0으로 초기화하고 URL query를 갱신한다.

### 7.2 PC 목록 컬럼

| 컬럼 | 내용 |
|---|---|
| 처리 시각 | run item 종료 시각 |
| 와인 | Vivino 영문명, 생산자, 국문명 검수 상태 |
| 빈티지 | 연도 또는 NV |
| 공급자 | VIVINO/FIXTURE/APPROVED_SAMPLE |
| 결과 | 한국어 상태 badge |
| 사유 | reason code의 한국어 요약 |
| 시도 | 현재/최대 횟수 |
| 연결 | 등록 Spirit 또는 중복 match |
| Slack | 발송/억제/대상 아님 |
| 작업 | 원문, 마스터 국문명 수정, 빈티지 보기, 검수 완료·공개 |

상태 라벨:

| 내부 상태 | 관리자 표시 | 성공/실패 집계 |
|---|---|---|
| `IMPORTED_CREATED` | 등록 완료 | 성공 |
| `IMPORTED_UPDATED` | 정보 갱신 | 성공 |
| `DUPLICATE_PASS` | 중복 PASS | 정상 PASS |
| `RETRY` | 재시도 예정 | 미완료 |
| `REJECTED` | 등록 제외 | 실패 |
| `CONFLICT` | 확인 필요 | 실패/검토 |
| `CANCELLED` | 중단됨 | 미처리 |

### 7.3 모바일 목록

화면 폭이 좁으면 테이블을 가로 축소하지 않고 카드로 전환한다.

- 첫 줄: 결과 badge, 빈티지, 처리 시각
- 본문: 영문명/생산자/국문명 입력 필요 여부
- 사유 2줄
- 하단: 원문·마스터 수정·빈티지 보기·검수 완료·공개
- external ID와 기술 코드는 상세를 열었을 때만 표시

### 7.4 건별 상세 drawer 또는 페이지

초기 구현은 drawer를 권장한다. 직접 URL 공유가 필요하면
`/admin/spirits/wine-crawler/results/:runItemId` 상세 route로 승격한다.

상세 항목:

- 와인명, 생산자, 빈티지, source URL
- provider/external ID
- run ID와 처리 순서
- 단계별 timeline과 소요 시간
- 최종 상태와 reason code/한국어 설명
- 시도 횟수와 next retry
- 중복 판정 단계와 matched spirit
- 국문명 수동 입력 여부와 검수 완료 시각
- 필드별 provenance
- 필수값 누락 목록
- 이미지 사용 허가 참조와 검증 결과
- Slack 발송 시각 또는 억제 사유
- 등록 Spirit 링크

허가된 범위의 normalized payload는 접힌 JSON으로 볼 수 있다. raw provider payload는 보관 계약이 허용하고
민감정보가 제거된 경우에만 제공한다.

### 7.5 건별 작업

- `원문 보기`: canonical HTTPS URL만 새 창으로 연다.
- `등록 주류 보기`: `/admin/spirits/{spiritId}`로 이동한다.
- `재시도`: `RETRY`, 해결 가능한 `REJECTED/CONFLICT`에만 표시한다.
- `중복 대상 연결`: 별도 확인 modal에서 한 개 Spirit를 선택하고 근거 메모를 필수로 받는다.
- `등록 제외 확정`: 자동 재시도에서 제외하며 관리자 메모를 남긴다.

재시도는 기존 row를 직접 `DISCOVERED`로 덮어쓰지 않는다. 새 `MANUAL_RETRY` run item을 생성해 과거 실패
이력을 보존한다.

## 8. 실행 이력 탭

### 8.1 목록 컬럼

- run ID
- 요청 시각/시작/종료
- 유형: SCHEDULED/MANUAL/DEMO/MANUAL_RETRY
- 요청자
- 모드와 provider
- 상태: QUEUED/RUNNING/CANCEL_REQUESTED/SUCCEEDED/PARTIAL/FAILED/CANCELLED
- 선택 수
- 등록/갱신/중복 PASS/재시도/거절/충돌 수
- 소요 시간
- 오류 요약

### 8.2 실행 상세

- 실행 설정 snapshot
- random seed
- quota 사용량
- provider 요청 수
- worker ID와 heartbeat
- 전체 통계
- run item 목록
- fatal error 요약
- Slack 실행 요약 발송 결과
- 관리자 메모

실행 설정은 현재 settings와 별개로 snapshot을 남겨 나중에 “그 실행이 어떤 설정으로 동작했는지” 확인할 수
있어야 한다.

### 8.3 상태 판정

- `SUCCEEDED`: 모든 선택 항목이 성공 또는 확정 중복 PASS
- `PARTIAL`: 일부 성공/PASS, 일부 RETRY/REJECTED/CONFLICT
- `FAILED`: 시작 전 provider/auth 오류 또는 처리 완료 항목 없이 fatal error
- `CANCELLED`: 관리자의 중단 요청을 정상 반영
- worker heartbeat가 끊겨도 즉시 FAILED로 덮지 않고 lease 만료 후 recovery job이 판정한다.

## 9. 설정 탭

### 9.1 관리자가 수정하는 값

- 자동 수집 활성화
- 실행당 처리 한도 1~10
- 초기 저장 상태: `HIDDEN` 고정, 향후 별도 승인 없이는 변경 불가
- 재시도 후보 포함 비율: 기본 최대 20%, 최대 2건
- Slack 와인별 실패 알림 활성화
- Slack 동일 실패 억제 시간: 기본 24시간
- 일일 요약 활성화

### 9.2 읽기 전용 값

- 실행 모드
- provider 종류
- `VIVINO_USAGE_GRANT_REF`의 마스킹된 식별자
- 허용 필드 목록
- rating/logo/image 허가 여부
- 계약 요청량 상한
- cron 예정 시각
- worker 버전/최근 배포 시각/heartbeat
- demo 누적 사용량

credential, internal key, Slack webhook은 값 존재 여부만 `설정됨/미설정`으로 표시한다.

### 9.3 이중 상한

- 관리자 DB 설정은 운영 편의를 위한 soft limit다.
- 환경변수 또는 코드의 hard limit 10을 넘을 수 없다.
- 관리자 API가 11 이상을 받으면 400으로 거부한다.
- 계약 한도가 10보다 낮으면 계약 한도가 우선한다.
- demo는 관리자 설정과 무관하게 누적 3건을 넘을 수 없다.

## 10. 비동기 실행 흐름

```text
관리자 `지금 수집`
  → Admin API가 QUEUED run 생성
  → crawler poll/cron이 claim
  → RUNNING + worker/lease/heartbeat 기록
  → 후보 최대 N건 예약
  → 각 후보마다 run item 생성 및 단계 갱신
  → 내부 import API 처리
  → run item 결과 확정
  → run 통계 집계
  → SUCCEEDED/PARTIAL/FAILED/CANCELLED
  → 관리자 화면 polling 반영 + Slack
```

권장 실행 방식:

- 운영 crawler cron은 매분 `run-wine.sh --claim-manual`을 호출해 관리자 요청을 빠르게 claim한다.
- 매시 37분에는 같은 entrypoint가 scheduled run 생성/claim도 시도한다.
- `flock`을 공통으로 써 manual과 scheduled가 동시에 실행되지 않게 한다.
- active run이 있으면 scheduled run을 새로 만들지 않고 `SKIPPED_ACTIVE_RUN` 운영 이벤트만 남긴다.
- API 서버가 shell 명령을 호출하거나 crawler 서버에 SSH하지 않는다.

버튼 클릭 후 일반적으로 1분 안에 시작한다. 더 짧은 응답이 필요해지면 동일 DB queue를 유지한 채 persistent
worker로 바꿀 수 있으며 관리자 API 계약은 변경하지 않는다.

## 11. 데이터 모델

### 11.1 `wine_crawler_settings`

singleton 설정이다.

| 컬럼 | 용도 |
|---|---|
| `id` | 고정 PK |
| `automation_enabled` | 자동 실행 여부 |
| `per_run_limit` | 1~10 soft limit |
| `target_status` | 초기 HIDDEN |
| `include_retry` | 재시도 후보 포함 |
| `slack_enabled` | 실패 알림 |
| `alert_ttl_hours` | 기본 24 |
| `daily_summary_enabled` | 일일 요약 |
| `updated_by`, `updated_at` | 변경 감사 |
| `version` | optimistic locking |

### 11.2 `wine_ingest_run`

지속 수집 PRD의 run 모델을 관리자 제어까지 확장한다.

| 컬럼 | 용도 |
|---|---|
| `id`, `run_key` | PK/멱등키 |
| `request_type` | SCHEDULED/MANUAL/DEMO/MANUAL_RETRY |
| `mode`, `provider` | 실행 모드 snapshot |
| `status` | 실행 상태 |
| `requested_limit` | 요청 건수 |
| `requested_by` | 관리자 user ID, 시스템은 null |
| `request_note` | 관리자 메모 |
| `idempotency_key` | 중복 클릭 방지 |
| `seed` | 무작위 재현 |
| `worker_id`, `lease_until`, `heartbeat_at` | claim/장애 복구 |
| count 컬럼 | 선택/처리/등록/갱신/PASS/retry/reject/conflict |
| `current_candidate_id`, `current_stage` | 진행 상태 |
| `cancel_requested_at/by` | 안전 중단 |
| `error_code/message` | fatal 요약 |
| 시간 컬럼 | 요청/시작/종료 |
| `settings_snapshot` | 실행 시 설정 JSON |

제약:

- `UNIQUE(run_key)`
- `UNIQUE(requested_by, idempotency_key)`는 key가 있는 수동 요청에 적용
- active run 하나만 허용하는 것은 DB advisory/unique lock 또는 service transaction으로 보장
- status/started_at, requested_at index

### 11.3 `wine_ingest_run_item`

candidate의 현재 상태와 실행 당시 결과를 분리하기 위한 attempt 이력이다.

| 컬럼 | 용도 |
|---|---|
| `id`, `run_id`, `candidate_id` | PK/FK |
| `sequence_no` | 실행 내 순서 |
| `wine_name_en/ko`, `producer_name`, `vintage_key` | 목록 snapshot |
| `source_url`, `external_key` | 추적 snapshot |
| `status`, `stage`, `result_code` | 결과/진행 |
| `reason_detail` | 관리자·Slack용 설명 |
| `attempt_no`, `next_retry_at` | 재시도 |
| `matched_spirit_id`, `created_spirit_id` | 연결 결과 |
| 단계 시간 컬럼 | fetch/enrich/dedupe/import 소요 |
| `slack_status`, `slack_sent_at` | 알림 상태 |
| 시간 컬럼 | 시작/종료 |

제약:

- `UNIQUE(run_id, candidate_id)`
- `INDEX(status, finished_at)`
- `INDEX(candidate_id, id desc)`
- 이름과 URL snapshot을 남겨 candidate가 나중에 보강되어도 과거 목록이 바뀌지 않게 한다.

### 11.4 migration 버전

와인 기능을 한 구현 PR에서 진행하고 V79가 아직 적용되지 않았다면 관련 테이블을 V79 계획에 통합할 수 있다.
V79가 로컬·개발·운영 중 한 곳에라도 적용된 뒤에는 기존 migration을 고치지 않고 V80 이상을 추가한다.

## 12. 관리자 API

모든 응답은 `ApiResponse<T>`, 목록은 `PageResponse<T>`를 사용한다.

### 12.1 조회

```text
GET /api/admin/wine-crawler/dashboard
GET /api/admin/wine-crawler/settings
GET /api/admin/wine-crawler/runs
GET /api/admin/wine-crawler/runs/{runId}
GET /api/admin/wine-crawler/runs/{runId}/items
GET /api/admin/wine-crawler/results
GET /api/admin/wine-crawler/results/{runItemId}
```

목록 query:

- `page`, `size`
- `status`, `requestType`, `provider`
- `keyword`, `vintageKey`
- `from`, `to`
- `slackStatus`

페이지 크기는 기본 20, 최대 100이다. run/items/candidate를 한 번에 lazy collection으로 읽지 않고 projection
또는 QueryDSL로 조회해 N+1을 방지한다.

### 12.2 제어

```text
PUT  /api/admin/wine-crawler/settings
POST /api/admin/wine-crawler/runs
POST /api/admin/wine-crawler/runs/{runId}/cancel
POST /api/admin/wine-crawler/results/{runItemId}/retry
POST /api/admin/wine-crawler/results/{runItemId}/resolve-duplicate
POST /api/admin/wine-crawler/results/{runItemId}/exclude
```

쓰기 API는 로그인 사용자 ID를 반드시 감사 데이터에 저장한다. 대상 run item과 후보를 ID만으로 조회하지 않고
상태·현재 연결을 함께 검증해 이미 처리된 타인의 stale browser action을 막는다.

주요 오류:

- 400: 한도·상태 전이·입력값 오류
- 403: ADMIN/SUPER_ADMIN 아님
- 404: 대상 없음
- 409: active run, demo/quota 소진, 권한 설정 불충분, optimistic lock 충돌
- 422: 재시도해도 해결되지 않는 필수값/권한 문제

### 12.3 내부 crawler API

```text
GET  /api/internal/wine-crawler/config
POST /api/internal/wine-crawler/runs/claim
POST /api/internal/wine-crawler/runs/{runId}/heartbeat
POST /api/internal/wine-crawler/runs/{runId}/items/start
PATCH /api/internal/wine-crawler/runs/{runId}/items/{itemId}
POST /api/internal/wine-crawler/runs/{runId}/finish
GET  /api/internal/wine-crawler/runs/{runId}/control
```

`claim`은 한 transaction에서 oldest QUEUED run을 `RUNNING`으로 바꾼다. 동일 run을 두 worker가 가져갈 수
없도록 pessimistic lock 또는 조건부 update row count를 사용한다.

## 13. 화면 갱신과 장애 UX

- 현재 run이 QUEUED/RUNNING/CANCEL_REQUESTED이면 dashboard와 run detail을 3초마다 polling한다.
- 실행이 없으면 30초마다 worker/요약만 갱신한다.
- 탭이 background이면 polling을 30초로 낮춘다.
- mutation 성공 후 관련 React Query key를 invalidate한다.
- polling 요청이 한 번 실패해도 “수집 실패”로 표시하지 않고 “화면 갱신 실패”를 분리한다.
- 연속 3회 API 조회 실패 시 상단에 연결 오류 banner를 표시한다.
- worker heartbeat 기준은 환경변수로 두되 초기 권장값은 2분이다.
- 브라우저를 닫아도 실행은 계속된다.

## 14. Slack과 관리자 페이지의 역할 분리

Slack은 즉시 인지, 관리자 페이지는 원인 분석과 조치에 사용한다.

- danger: provider 인증/권한, worker 오프라인, 실행 fatal, quota breach
- warning: 와인별 수집 실패를 실행 종료 시 묶음 발송
- no alert: 확정 `DUPLICATE_PASS`
- 관리자 결과 목록에는 Slack 발송 성공/24시간 억제/비대상 상태를 표시
- Slack 메시지의 run ID와 candidate ID로 관리자 페이지를 찾을 수 있게 한다.
- 운영 사이트의 관리자 URL을 Slack에 넣을 경우 공개 base URL만 사용하고 token을 query에 넣지 않는다.
- Slack 전송 실패는 run 결과를 실패로 바꾸지 않지만 `slackStatus=SEND_FAILED`를 남긴다.

## 15. 권한과 감사 로그

- 페이지 조회·설정·실행·중단·재시도는 `ADMIN/SUPER_ADMIN`만 허용한다.
- PARTNER/IMPORTER/MODERATOR는 메뉴와 API 모두 접근 불가다.
- crawler 내부 API는 기존 `X-Internal-Key`를 사용하고 사용자 JWT를 받지 않는다.
- 모든 관리자 action은 변경 이력에 다음을 저장한다.
  - user ID
  - action type
  - run/candidate/run item ID
  - 이전/새 상태
  - 요청 메모·사유
  - IP/user-agent는 기존 감사 정책 범위 안에서만 저장
- raw payload에는 사용자 리뷰·개인정보를 넣지 않는다.
- 민감 설정 값은 응답 DTO에 포함하지 않는다.

## 16. 와인 등록 화면과의 연결

수집 성공 항목의 `주류 보기`는 신규 와인 마스터가 아니라 실제 등록된 빈티지 자식 또는 관리자 상세의
해당 빈티지 section으로 이동한다. 관리자 상세에는 다음 수집 읽기 전용 영역을 추가한다.

- 공급자와 원문 링크
- 외부 제품/빈티지 ID
- 최근 수집 시각
- Vivino 평점/평가 수
- 국문명 수동 입력·검수 상태
- 필드별 provenance
- 수집 run ID
- 중복 identity key는 원문 hash 전체 대신 앞 8자만 운영 진단용으로 표시

관리자가 수동 수정한 필드는 `manual override`로 표시하고 이후 외부 갱신이 덮어쓰지 않게 한다.

## 17. 반응형·접근성

- PC는 `min-w` 테이블과 넓은 필터 영역을 사용한다.
- 모바일은 상단 제어를 세로 배치하고 결과를 카드로 전환한다.
- 실행/중단 버튼은 한 화면에서 동시에 보이지 않게 상태에 따라 교체한다.
- 위험 action은 빨간색과 확인 문구를 사용한다.
- badge에는 색상 외 텍스트를 제공한다.
- 진행률에는 `aria-valuenow/min/max`를 제공한다.
- polling 갱신은 screen reader에 매 3초 알리지 않고 최종 상태 전이만 live region으로 알린다.
- 표의 원문/주류 링크는 키보드 접근 가능해야 한다.

관리자 페이지는 한국어 고정 규칙을 따르므로 ko/en 번역키 추가 대상이 아니다.

## 18. 테스트 계획

### 18.1 백엔드

- ADMIN/SUPER_ADMIN 조회·제어 성공
- PARTNER/IMPORTER/MODERATOR 403
- UI 경로와 달리 API가 `/api/admin/spirits/**` 밖에 있는지 보안 회귀 테스트
- settings 1~10 검증과 optimistic lock
- 라이선스 미완료 상태에서 auto ON/실제 provider run 409
- demo 누적 3건 후 run 생성 409
- 같은 idempotency key 재전송 시 같은 run 반환
- active run 존재 시 두 번째 run 409
- 두 worker 동시 claim에서 하나만 성공
- heartbeat/lease 만료와 recovery
- RUNNING → CANCEL_REQUESTED → CANCELLED 전이
- 종료된 run 중단/재중단 거부
- run count가 run item 집계와 일치
- run item snapshot 보존
- 결과 검색·필터·paging QueryDSL과 N+1 없음
- 관리자 action 변경 이력 기록
- 기존 위스키·꼬냑 데이터 불변

### 18.2 프론트엔드

- ADMIN 메뉴에 `와인 수집`, 파트너 권한 목록에는 미노출
- route가 `spirits/:id`와 충돌하지 않음
- sidebar label과 h1이 모두 `와인 수집`
- 상태별 버튼 enable/disable과 이유 문구
- 중복 클릭 시 mutation 한 번
- 실행 중 3초 polling, 종료 후 polling 완화
- 자동 OFF가 현재 run을 취소한 것처럼 표시하지 않음
- 중단 확인 문구와 CANCEL_REQUESTED 표시
- 상태 badge 한글 매핑
- `DUPLICATE_PASS`가 실패 count에 포함되지 않음
- 필터 query string/뒤로가기 복원
- 성공 항목 주류 상세 링크
- 실패 이름·링크·사유 표시
- PC table/모바일 card rendering
- API 조회 실패와 crawler 실행 실패 메시지 분리
- `npm run test:admin-menu` 통과

### 18.3 crawler 통합

- manual run을 1분 이내 claim
- scheduled/manual 동시 실행 방지
- candidate마다 run item 단계 갱신
- 취소 요청을 candidate 경계에서 반영
- 프로세스 종료 후 lease recovery 및 내부 API 멱등
- 실패 Slack과 관리자 결과의 이름·링크·사유 일치
- duplicate PASS는 Slack 없이 관리자 목록에 표시
- limit 10과 demo 누적 3 유지

### 18.4 migration

- 빈 DB V1~신규 migration 전체 적용
- `ddl-auto=validate`
- 이미 적용된 migration 불변
- 기존 위스키·꼬냑 수·parent/variant 관계 불변
- run/candidate/run item FK와 index 검증

## 19. 운영 배포와 확인

1. DB/API를 먼저 배포한다. 구 crawler가 신규 API를 호출하지 않아도 동작해야 한다.
2. Web을 배포하되 crawler가 없으면 worker 오프라인으로 표시한다.
3. Crawler를 배포하고 `FIXTURE_DRY_RUN` heartbeat를 확인한다.
4. ADMIN으로 메뉴·조회, PARTNER로 403/미노출을 확인한다.
5. 라이선스 검토 데모 1건을 버튼으로 요청한다.
6. QUEUED → RUNNING → SUCCEEDED와 결과 목록을 확인한다.
7. 같은 fixture를 다시 실행해 `DUPLICATE_PASS`를 확인한다.
8. 실패 fixture로 Slack의 이름·링크·사유와 관리자 목록 일치를 확인한다.
9. 3건 데모 상한과 네 번째 요청 차단을 확인한다.
10. 자동 수집은 라이선스 전 OFF로 유지한다.

운영 관련 파일을 바꾸므로 구현 PR에서는 다음을 함께 갱신한다.

- `caskbycask-crawler/.env.example`
- `caskbycask-crawler/DEPLOY.md`
- `deploy/server/deploy-crawler.sh`
- `deploy/tests/test-crawler-runtime.sh`
- `.github/workflows/deploy.yml`
- systemd/cron 설정
- `deploy/OPERATIONS-GUIDE.md`의 배포·Secrets·cron·잠금·로그·알람·Cheat Sheet

## 20. 구현 대상 파일

### 프론트엔드

```text
caskbycask-web/src/views-spa/admin/AdminWineCrawlerPage.tsx
caskbycask-web/src/domain/admin/api/adminWineCrawlerApi.ts
caskbycask-web/src/domain/admin/types/wineCrawler.types.ts
caskbycask-web/src/domain/admin/constants/adminMenu.ts
caskbycask-web/src/App.tsx
```

상태 badge, result card, run progress가 커지면
`src/domain/admin/components/wine-crawler/`로 분리한다.

### 백엔드

```text
domain/wineingest/controller/WineCrawlerAdminController.java
domain/wineingest/controller/WineCrawlerInternalController.java
domain/wineingest/service/WineCrawlerAdminService.java
domain/wineingest/service/WineCrawlerRunService.java
domain/wineingest/entity/WineCrawlerSettings.java
domain/wineingest/entity/WineIngestRun.java
domain/wineingest/entity/WineIngestRunItem.java
domain/wineingest/repository/*
domain/wineingest/dto/*
```

기존 spirit 도메인에 운영 실행 모델을 억지로 넣지 않고 `wineingest` 경계로 분리한다. 최종 Spirit 생성은
기존 spirit application service를 호출한다.

### 크롤러

- manual run claim과 heartbeat
- candidate/run-item 진행 보고
- cancel 상태 polling
- exit 시 run finish 보장
- scheduled/manual 공통 lock

## 21. 구현 순서

1. run/run-item/settings migration과 엔티티
2. 관리자 조회 API와 권한
3. 내부 claim/heartbeat/result API
4. crawler의 queue claim·진행 보고·cancel
5. 관리자 메뉴·route·API client·타입
6. 현황/결과/실행 이력/설정 탭
7. Slack 상태 연동과 감사 로그
8. fixture 통합 테스트
9. 운영 cron/문서 동기화
10. 로컬 3건 데모 검증

## 22. 완료 조건

- 관리자 사이드바와 페이지 제목이 `와인 수집`으로 일치한다.
- ADMIN/SUPER_ADMIN만 페이지와 API를 사용할 수 있다.
- 관리자가 자동 수집 ON/OFF, 지금 수집, 안전한 중단 요청을 할 수 있다.
- 버튼 요청은 DB queue 기반 비동기 처리이며 API 서버가 Python을 직접 실행하지 않는다.
- 중복 클릭과 동시 worker가 run을 중복 생성·처리하지 않는다.
- 현재 진행률과 worker heartbeat가 표시된다.
- 실행 이력에서 설정 snapshot과 통계를 확인할 수 있다.
- 결과 목록에서 등록·갱신·중복 PASS·재시도·등록 제외·확인 필요를 구분한다.
- 실패 항목에 와인명·링크·사유가 항상 표시된다.
- 성공 항목에서 등록된 주류 상세로 이동할 수 있다.
- 확정 중복은 실패·Slack 알림으로 집계되지 않는다.
- 라이선스 미완료 시 실제 Vivino 실행 버튼이 차단된다.
- 데모 누적 3건과 시간당 최대 10건이 UI와 서버 양쪽에서 보장된다.
- PC·모바일 UI와 접근성 테스트가 통과한다.
- 기존 위스키·꼬냑과 관리자 주류 기능에 회귀가 없다.
- 운영 문서가 실제 cron·환경변수·알림 구조와 일치한다.
