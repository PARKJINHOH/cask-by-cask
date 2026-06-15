# CaskByCask

> 위스키·와인·꼬냑 주류 리뷰 커뮤니티 플랫폼

CaskByCask는 주류(위스키·와인·꼬냑·기타) 정보와 사용자 리뷰를 중심으로 한 커뮤니티 서비스입니다.
주류 정보·리뷰, 게시판·BYOB 커뮤니티, 가격 추적, 랭킹·점수 시스템, 핫딜 자동 수집, 관리자 시스템을 제공합니다.

> ⚠️ 현재 **운영서버 배포 전, 개발 중** 단계입니다. (개인 운영 커뮤니티 — 사업자 없음)

---

## 모노레포 구성

이 저장소는 3개의 독립 애플리케이션과 배포 자동화를 한 곳에서 관리하는 모노레포입니다.

| 디렉토리 | 역할 | 스택 |
|---|---|---|
| [`caskbycask-api`](./caskbycask-api) | 백엔드 REST API | Java 21 / Spring Boot 3.5 |
| [`caskbycask-web`](./caskbycask-web) | 프론트엔드 SPA | React 19 / TypeScript / Vite |
| [`caskbycask-crawler`](./caskbycask-crawler) | 핫딜 자동 수집 크롤러 | Python / OpenAI |
| [`deploy`](./deploy) | 배포 스크립트·운영 문서·nginx·systemd | GitHub Actions |

---

## 기술 스택

### 백엔드 (`caskbycask-api`)
- Java 21 / Spring Boot 3.5.x / Gradle (Kotlin DSL)
- Spring Security + JWT (Stateless, Redis Refresh Token, 키 회전 지원)
- Spring Data JPA + QueryDSL (Jakarta)
- MariaDB · Flyway (스키마 마이그레이션)
- Redis (Lettuce) + Caffeine (인증 hot-path 캐싱)
- Bucket4j (Redis 기반 Rate Limiting)
- SpringDoc OpenAPI (Swagger UI — local/dev 한정)

### 프론트엔드 (`caskbycask-web`)
- React 19 / TypeScript / Vite 8
- Tailwind CSS v4 (primary: amber)
- Zustand (auth 등 전역 상태) · TanStack React Query (서버 상태)
- React Hook Form + Zod (폼·검증)
- TipTap (리치 텍스트 에디터)
- react-i18next (ko 기본 / en 지원)
- Axios (인터셉터 기반 자동 토큰 갱신)
- 정적 프리렌더링(Puppeteer)으로 SEO 최적화

### 크롤러 (`caskbycask-crawler`)
- Python 3.8+ · OpenAI GPT-4o-mini (분석)
- SQLite (중복 방지)

---

## 아키텍처 / 데이터 흐름

```
[사용자] ─ HTTPS ─ [Cloudflare] ─ [nginx] ─┬─ 정적(dist) → caskbycask-web (React SPA)
                                            │
                                            └─ /api → Spring Boot (caskbycask-api) ─┬─ MariaDB
                                                                                    └─ Redis

[시놀로지 NAS] caskbycask-crawler ── 20분 주기 크롤링 → OpenAI 분석
        └─ POST /api/internal/deals (X-Internal-Key) → 관리자 검토 큐 (status=PENDING, is_visible=false)
```

핫딜 크롤러는 네이버 카페·디시인사이드 등에서 주류 할인 게시글을 수집하고 GPT로 분석한 뒤,
내부 API로 전송하여 **관리자 검토 큐**에 적재합니다. 관리자가 원문 교차검증 후 수동으로 노출 전환합니다.

---

## 주요 기능

- **주류 정보·리뷰**: 위스키·와인·꼬냑·기타 카테고리별 상세 정보, 사용자 리뷰(Nose/Taste/Finish), 보틀 컬렉션
- **커뮤니티**: 자유/공지 게시판, BYOB(Bring Your Own Bottle) 모임, 댓글, 신고, 거래/딜 게시물
- **가격 추적**: 매장·가격 리포트·가격 알림
- **랭킹·점수**: 회원 레벨, 점수 획득/차감, 출석 체크, 위시리스트
- **핫딜 자동 수집**: 크롤러 → 관리자 검토 큐
- **관리자 시스템**: 회원·주류·게시물·이메일·배너·팝업·공지 관리, 대시보드(KPI/통계)
- **다국어(i18n)**: 한국어 기본, 영어 지원 (관리자 페이지는 한국어 고정)

---

## 로컬 개발 환경 셋업

### 사전 요구사항
- JDK 21 (Temurin 권장)
- Node.js
- MariaDB
- Redis

### 백엔드 실행

```bash
cd caskbycask-api
./gradlew bootRun          # Windows: gradlew.bat bootRun
```

- 기본 프로필 `local`, 포트 **8080**
- 빈 스키마라도 Flyway가 V1~V8로 스키마 + seed 데이터를 모두 구성하므로 처음부터 부팅 가능
- 다음 환경변수가 필요합니다(값은 각자 환경에 맞게 설정 — 실제 값은 저장소에 포함되지 않음):
  - 인증: `JWT_SECRET` (선택: `JWT_SECRET_PREVIOUS` 키 회전), `OAUTH_TOKEN_ENCRYPTION_KEY`
  - DB: `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`
  - Redis: `REDIS_HOST`, `REDIS_PASSWORD`
  - OAuth2: `OAUTH_NAVER_CLIENT_ID`, `OAUTH_NAVER_CLIENT_SECRET`, `OAUTH_GOOGLE_CLIENT_ID`, `OAUTH_GOOGLE_CLIENT_SECRET`
  - 메일: `GMAIL_APP_PASSWORD`
  - 관리자: `ADMIN_EMAIL`, `ADMIN_PASSWORD`
  - 크롤러 연동: `CASKBYCASK_INTERNAL_KEY`

### 프론트엔드 실행

```bash
cd caskbycask-web
npm install
npm run dev
```

- Vite 개발 서버 포트 **5173**
- `/api`, `/uploads` 요청은 `http://localhost:8080`(백엔드)으로 프록시됩니다.

### 크롤러
별도 가이드를 참조하세요 → [`caskbycask-crawler/README.md`](./caskbycask-crawler/README.md)

---

## 빌드 & 테스트

### 백엔드
```bash
cd caskbycask-api
./gradlew build            # Windows: gradlew.bat build
```

### 프론트엔드
```bash
cd caskbycask-web
npm run build              # tsc → vite build → 정적 HTML 프리렌더링(prerender.mjs)
npm run build:no-prerender # 프리렌더링 생략 빌드
```

---

## 데이터베이스 / Flyway

DB 스키마는 **Flyway가 소유**합니다(클린 베이스라인). `V1__init_baseline.sql`이 현재 엔티티 전체 스키마이며,
이후 변경은 `V{n}__*.sql`을 추가합니다.

| 버전 | 내용 |
|---|---|
| `V1__init_baseline.sql` | 초기 전체 스키마 |
| `V2__seed_score_config.sql` | 점수 설정 seed |
| `V3__seed_member_level_config.sql` | 회원 레벨 설정 seed |
| `V4__seed_producer_distillery.sql` | 위스키 증류소 seed |
| `V5__seed_producer_winery.sql` | 와인 양조장 seed |
| `V6__seed_producer_cognac.sql` | 꼬냑 생산자 seed |
| `V7__seed_faq.sql` | FAQ seed |
| `V8__seed_nickname_bad_words.sql` | 닉네임 금지어 seed |

> `ddl-auto`: local/dev = `update`, prod = `none`.
> 엔티티 스키마를 변경하면 **반드시 마이그레이션을 추가**해야 합니다.

---

## 배포 / 인프라

- **서버**: Oracle Cloud Infrastructure (대한민국 춘천 리전), Ubuntu (aarch64)
- **네트워크**: Cloudflare(프록시·SSL) → nginx → Spring Boot / 정적 dist
- **배포**: GitHub Actions 수동 트리거(`workflow_dispatch`, 대상 `both`/`api`/`web`)
  - x86 러너에서 빌드 → 서버로 전송 → 무중단 swap + readiness health check + 실패 시 자동 rollback

자세한 절차는 다음 문서를 참고하세요.
- [`deploy/DEPLOY-PIPELINE.md`](./deploy/DEPLOY-PIPELINE.md) — 배포 파이프라인 개요
- [`deploy/OPERATIONS-GUIDE.md`](./deploy/OPERATIONS-GUIDE.md) — 운영 가이드(배포/점검/백업/복원)

---

## 프로젝트 문서

- [`CLAUDE.md`](./CLAUDE.md) — 개발 컨텍스트 및 규칙(아키텍처 원칙, i18n, 술 데이터 단일 소스 등)
- [`deploy/DEPLOY-PIPELINE.md`](./deploy/DEPLOY-PIPELINE.md) — 배포 파이프라인
- [`deploy/OPERATIONS-GUIDE.md`](./deploy/OPERATIONS-GUIDE.md) — 운영 가이드
- [`deploy/SEO.md`](./deploy/SEO.md) — SEO 설정
- [`caskbycask-crawler/README.md`](./caskbycask-crawler/README.md) — 핫딜 크롤러 가이드
