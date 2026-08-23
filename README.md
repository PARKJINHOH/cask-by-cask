# CaskByCask

> 위스키 · 와인 · 꼬냑 주류 리뷰 커뮤니티 플랫폼

CaskByCask는 주류 정보와 사용자 리뷰를 중심으로 한 풀스택 커뮤니티 서비스입니다.  
주류 데이터베이스, 리뷰 시스템, 커뮤니티, 가격 추적, AI 기반 소식 수집까지 — 기획·설계·개발·배포·운영을 1인으로 수행하고 있습니다.

🔗 **[www.caskbycask.net](https://www.caskbycask.net)** — 운영 중

---

## 프로젝트 구성

모노레포로 백엔드 · 프론트엔드 · 크롤러 · 배포 자동화를 한 저장소에서 관리합니다.

| 디렉토리 | 역할 | 스택 |
|---|---|---|
| `caskbycask-api` | REST API 서버 | Java 21 · Spring Boot 3.5 · MariaDB |
| `caskbycask-web` | 웹 프론트엔드 | React 19 · Next.js 16 · TypeScript |
| `caskbycask-crawler` | 가격 수집 · AI 소식 생성 | Python · Gemini · Tavily |
| `deploy` | 배포 스크립트 · nginx · systemd | GitHub Actions |

---

## 기술 스택

### Backend

| 분류 | 기술 |
|---|---|
| Core | Java 21 · Spring Boot 3.5 · Gradle (Kotlin DSL) |
| 인증 | Spring Security · JWT (Stateless) · Redis Refresh Token · OAuth2 (네이버 · 구글) |
| 데이터 | Spring Data JPA · QueryDSL (Jakarta) · MariaDB · Flyway |
| 검색 | Hibernate Search (Embedded Lucene) · Nori 한국어 형태소 분석기 |
| 캐시 · 제한 | Redis (Lettuce) · Caffeine · Bucket4j (Rate Limiting) |
| 이미지 | Scrimage (WebP 변환 · 리사이즈) |
| 모니터링 | Spring Actuator · Micrometer Prometheus |
| API 문서 | SpringDoc OpenAPI (Swagger UI) |

### Frontend

| 분류 | 기술 |
|---|---|
| Core | React 19 · Next.js 16 (Standalone · SSR/ISR) · TypeScript |
| 스타일 | Tailwind CSS v4 |
| 상태 관리 | Zustand (클라이언트) · TanStack React Query (서버) |
| 폼 | React Hook Form · Zod |
| 에디터 | TipTap (리치 텍스트) |
| 차트 · 시각화 | Recharts · React Flow |
| 다국어 | react-i18next (한국어 기본 · 영어 지원) |
| SEO | Next.js SSR · JSON-LD 구조화 데이터 · Sitemap · IndexNow |

### Crawler

| 분류 | 기술 |
|---|---|
| Core | Python 3 |
| AI | Google Gemini (소식 작성) · Tavily (웹 검색) |
| 분석 | 가격 파싱 · 주류 매칭 · 중복 제거 (SQLite) |

### Infra · DevOps

| 분류 | 기술 |
|---|---|
| 서버 | Oracle Cloud Infrastructure (대한민국 춘천 리전 · ARM64) |
| 네트워크 | Cloudflare (프록시 · SSL) → nginx → 애플리케이션 |
| CI/CD | GitHub Actions (수동 트리거 · 빌드 → 전송 → 무중단 교체 · 헬스체크 · 자동 롤백) |
| DB 마이그레이션 | Flyway (클린 베이스라인, 증분 마이그레이션) |
| 알림 | Slack Webhook (배포 · 에러 · 리소스 점검) |

---

## 아키텍처

```
사용자 ─ HTTPS ─ Cloudflare ─ nginx ─┬─ /         → Next.js   (:3000, SSR/정적)
                                     ├─ /uploads  → 로컬 디스크
                                     └─ /api      → Spring Boot (:8080) ─┬─ MariaDB
                                                                         └─ Redis

크롤러 (OCI) ── 주기적 수집 → Gemini/Tavily 분석
    └─ POST /api/internal/* (인증키) → 관리자 검토 큐
```

---

## 주요 기능

### 사용자

- **주류 탐색**: 위스키 · 와인 · 꼬냑 · 기타 카테고리별 상세 정보, 배치/병입별 필터, 한국어 형태소 검색
- **주류 등록 요청**: 목록에 없는 술을 관리자와 같은 폼으로 신청, 이미 있는 주류에는 새 에디션(배치·빈티지) 추가 요청
- **리뷰 시스템**: Nose/Taste/Finish 평점, 리치 텍스트 에디터, 포토카드
- **산지 지도**: 국가 → 세부 산지 인터랙티브 확대 지도 (공개 지리 데이터 기반, 22개국 226개 산지)
- **가격 추적**: 사용자 가격 제보, 가격 동향 차트, 환율 자동 환산
- **커뮤니티**: 자유/공지 게시판, BYOB 모임, 댓글, 신고
- **보틀 컬렉션**: 보유 바틀 관리, 위시리스트
- **랭킹 · 포인트**: 활동 기반 점수 · 레벨 · 출석체크
- **다국어**: 한국어/영어 전환, 주류명 이중 표기

### 관리자

- **대시보드**: KPI 통계, 가입 · 리뷰 · 게시글 추이
- **주류 · 생산자 관리**: CRUD, AI 조사 프롬프트 연동, 산지 코드 지정
- **가격 관리**: 사용자 제보 승인, 가격 동향 직접 등록
- **AI 소식**: Gemini 기반 자동 기사 생성, 출처 관리 (자동 발견 · 차단)
- **SNS 자동 게시**: Instagram · Threads 연동 (OAuth)
- **콘텐츠 관리**: 배너, 팝업, FAQ, 약관, 이메일 발송

---

## 로컬 개발 환경

### 사전 요구사항

- JDK 21 · Node.js · MariaDB · Redis

### 백엔드

```bash
cd caskbycask-api
./gradlew bootRun    # Windows: gradlew.bat bootRun
```

- 프로필 `local`, 포트 `8080`
- Flyway가 빈 DB에 스키마 + seed를 자동 구성
- 환경변수 필요: `DB_HOST`, `DB_PASSWORD`, `JWT_SECRET`, `REDIS_PASSWORD` 등 ([예시 파일](./deploy/env/api.env.example) 참고)

### 프론트엔드

```bash
cd caskbycask-web
npm install && npm run dev
```

- Next.js 개발 서버 포트 `3000`
- `/api`, `/uploads` 요청은 백엔드로 프록시

---

## 빌드

```bash
# 백엔드
cd caskbycask-api && ./gradlew build

# 프론트엔드
cd caskbycask-web && npm run build    # .next/standalone 생성
```
