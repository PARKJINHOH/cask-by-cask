# CaskByCask — Claude Code 컨텍스트
- 운영중인 사이트야.

## 프로젝트
위스키·와인·꼬냑 주류 리뷰 커뮤니티 플랫폼.
백엔드(caskbycask-api)와 프론트엔드(caskbycask-web) 두 프로젝트로 구성.

## 핵심 원칙
- 빠르게보다 정확하게: 각 Step 완료 후 검증 체크리스트 통과 확인 후 진행
- 보안: 모든 쿼리는 로그인 사용자 userId 기준 필터링, 타인 데이터 접근 금지
- 아키텍처: 백엔드·프론트엔드 모두 DDD 구조
- 최고관리자는 랭킹, 점수획득, 점수차감, 출석체크 등 관련된건 X.

## 백엔드 (caskbycask-api)
- Java 21 / Spring Boot 3.5.x / Gradle Kotlin DSL
- Spring Security + JWT (Stateless, Redis Refresh Token)
- Spring Data JPA + QueryDSL (jakarta)
- MariaDB — local/dev/prod 환경 분리
- **DB 스키마는 Flyway 가 소유 (클린 베이스라인)**: `V1__init_baseline.sql` = 현재 엔티티 전체 스키마. 이후 변경은 `V{n}__*.sql` 추가.
  - ddl-auto: local/dev = `validate`, prod = `none`. 즉 엔티티 스키마를 바꾸면 **반드시 마이그레이션을 추가**해야 부팅됨.
    (local 빠른 반복 시 일시적으로 `update` 전환 가능하나, 커밋 전 마이그레이션으로 정리)
  - 새 DB(빈 스키마)는 Flyway 가 V1~V{n} 으로 스키마+seed 를 모두 구성 → 처음부터 부팅 가능.
  - V1 재생성이 필요하면 엔티티로부터 Hibernate 스키마를 다시 덤프해 교체. (한글 seed 편집 시 PowerShell `Get-Content -Raw` 금지 — UTF-8 깨짐. .NET `File.ReadAllText` 사용)
- 공통 응답: ApiResponse<T> 래퍼
- 예외: GlobalExceptionHandler + ErrorCode Enum
- 구현 후 항상 gradle build 테스트 해줘
- JAVA_HOME = "C:\Users\EM_NB139\.jdks\temurin-21.0.10"
- JAVA_HOME = "C:\Users\JINHOH_PC\.jdks\temurin-21.0.10"

## 인프라/배포 (개인 운영 커뮤니티 — 사업자 없음)
- **서버: Oracle Cloud Infrastructure, 대한민국 춘천 리전** (현재). 이용자 증가 시 추후 AWS 전환 가능.
- 파일 저장: 현재 Oracle Cloud 인스턴스 내 디스크에 직접 저장(서버 로컬, `storage.local.base-path: ./uploads`) → 같은 서버가 직접 서빙. `S3FileStorageService`는 추후 외부 오브젝트 스토리지 연동용 빈 스텁(미사용).
- 이메일: Gmail SMTP (Google, drinkindex.cs@gmail.com). `AwsSesEmailSender`는 비활성(`app.email.provider: smtp`).
- 개인정보 보호책임자 / 서비스 운영자: 박진호
- ※ 약관·개인정보 처리방침에 위 인프라(국내 보관 등)가 반영됨 — 인프라 변경 시 `LegalDocumentTemplate.java` + `defaultTemplates.ts` 동기 수정 필요.
- ※ **운영 문서 동기화**: 배포 방법(`.github/workflows/deploy.yml`)·서버 구성·systemd 유닛(`deploy/systemd/*`)·운영 스크립트(`deploy/server/*.sh`)·환경변수(`deploy/env/api.env.example`)·알람을 변경하면 **반드시 `deploy/OPERATIONS-GUIDE.md` 의 해당 절(배포/Secrets/스크립트/알람/Cheat Sheet)도 함께 갱신**한다. 코드와 운영 매뉴얼이 어긋나지 않게 한 PR 안에서 같이 수정할 것.

## 프론트엔드 (caskbycask-web)
- React + TypeScript + Vite
- Zustand (authStore, 각 도메인 store)
- React Query (서버 상태)
- Axios (인터셉터: 자동 토큰 갱신)
- Tailwind V4 (primary: amber)
- react-i18next (ko 기본, en 지원)
- PC, 모바일 반응형 고려해서 구현
- PC에서는 화면을 보다 넓게 사용하는 UI/UX로 구현.
- node = "C:\Program Files\nodejs"
- API가 추가되면 Localhost에서 테스트가 가능하도록 vite.config.ts에 api URL 추가하기.

## 다국어(i18n) 개발 원칙
- **모든 UI 문자열은 반드시 `t()` 번역키 사용** — 하드코딩 한글/영어 금지 (관리자 페이지 제외)
- 번역 파일: `src/locales/ko.json` (한국어), `src/locales/en.json` (영어)
- 언어 저장: localStorage `di_lang` / 토글: MainLayout `LangToggle` 컴포넌트
- **술 이름(nameKo / nameEn) 표시 규칙**
  - `ko` 모드: `nameKo` = 메인 타이틀(굵게/크게), `nameEn` = 서브타이틀(작게/흐리게)
  - `en` 모드: `nameEn` = 메인 타이틀, `nameKo` = 서브타이틀
  - `nameEn`이 없을 경우 `nameKo` fallback 적용 (`nameEn || nameKo`)
  - 동일 규칙을 SpiritCard, SpiritDetailPage, 검색결과 등 모든 술 표시 위치에 일관 적용
  - 증류소명(distilleryNameKo / distilleryNameEn)도 동일 규칙 적용
- 새 기능 구현 시 체크리스트:
  1. `ko.json` / `en.json` 양쪽에 번역키 동시 추가
  2. 컴포넌트에서 `const { t, i18n } = useTranslation()` 훅 사용
  3. 술 이름 표시가 있으면 `isEn = i18n.language === 'en'` 기반 스왑 적용
  4. 관리자(`/admin/**`) 페이지는 한국어 고정 유지

## ⚠️ 술 데이터 폼 — 단일 소스 (SINGLE SOURCE OF TRUTH) — 제일 중요

술(Spirit)의 데이터 항목(필드)·검증·페이로드·프리필은 **단 하나의 파일**에서만 정의한다.
**한 곳을 고치면 등록·수정·요청승인 세 화면에 자동 반영**되어야 한다. 절대 화면별로 복붙하지 말 것.

### 단일 소스 파일
- `caskbycask-web/src/domain/admin/components/SpiritFormFields.tsx`
  - `useSpiritForm()` 훅 — 폼 상태 + `validate()` + `buildPayload()` + `prefillFromSpirit()` / `prefillFromRequest()`
  - `<SpiritFormFields>` 컴포넌트 — 4섹션 UI(① 기본 ② 생산·병입 ③ 카테고리 상세 ④ 공통 상세)
  - 공용 상수(`CATEGORIES`, `CATEGORY_LABEL`, `PRODUCER_LABEL`, `DATE_RE`, `CARD`, `SectionTitle`)도 여기서 export
- 카테고리별 입력 UI는 하위 섹션 컴포넌트에 위임(이들도 공유):
  `SpiritCommonDetailSection`, `WhiskyDetailSection`, `WineDetailSection`, `CognacDetailSection`, `OtherDetailSection`

### 이 단일 소스를 쓰는 3개 관리자 화면 (UI 골격만 가짐, 데이터 로직 X)
| 화면 | 파일 | 차이점 |
|---|---|---|
| 새 술 등록 | `pages/admin/AdminSpiritFormPage.tsx` | 빈 폼 → `create` |
| 주류 관리 상세 = 수정 | `pages/admin/AdminSpiritDetailPage.tsx` | `prefillFromSpirit` + **카테고리 고정**(`categoryLocked`) → `update`. 메타정보/이미지/숨김 처리 추가 |
| 등록 요청 상세 = 승인 | `pages/admin/AdminRequestDetailPage.tsx` | `prefillFromRequest` + 카테고리 변경 가능 → `approve`. 신청자 정보/반려 추가 |

- 페이지별 고유 영역(이미지 카드 등)은 `<SpiritFormFields imageSlot={...}>` 슬롯으로 주입.
- 주류 상세는 별도 수정 페이지 없음 — 상세 화면 자체가 풀 편집기다. (`spirits/:id/edit` 라우트 제거됨)
- 사용자 등록 요청 페이지(`SpiritRequestPage`)는 의도적으로 **일부 필드만 노출**(별도 폼). 관리자 폼이 전체 필드의 기준.

### 술 데이터 항목을 추가·변경할 때 (체크리스트)
1. **프론트**: `SpiritFormFields.tsx` 에서 — 폼 상태(`useSpiritForm`) + UI(섹션 컴포넌트) + `validate()` + `buildPayload()` + `prefillFromSpirit`/`prefillFromRequest` 를 모두 수정 (한 파일 안에서 끝남)
2. **타입**: `domain/admin/types/admin.types.ts` 의 `CreateSpiritPayload`/`UpdateSpiritPayload`/`AdminSpiritDetail`/`SpiritRegisterRequestDetail`(+ 해당 Request/Response DTO 타입)
3. **백엔드**: Spirit 엔티티/세부 엔티티 + 요청·응답 DTO + 서비스 매핑 + **Flyway 마이그레이션 추가**(스키마 변경 시)
4. 신규 필드가 사용자에게도 보여야 하면 `SpiritDetailPage`(사용자 상세) 표시 로직과 i18n 키도 추가
