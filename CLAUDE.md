# DrinkIndex — Claude Code 컨텍스트

## 프로젝트
위스키·꼬냑·와인·데낄라 리뷰 커뮤니티 플랫폼.
백엔드(drinkindex-api)와 프론트엔드(drinkindex-web) 두 프로젝트로 구성.

## 핵심 원칙
- 빠르게보다 정확하게: 각 Step 완료 후 검증 체크리스트 통과 확인 후 진행
- 보안: 모든 쿼리는 로그인 사용자 userId 기준 필터링, 타인 데이터 접근 금지
- 아키텍처: 백엔드·프론트엔드 모두 DDD 구조

## 백엔드 (drinkindex-api)
- Java 21 / Spring Boot 3.5.x / Gradle Kotlin DSL
- Spring Security + JWT (Stateless, Redis Refresh Token)
- Spring Data JPA + QueryDSL (jakarta)
- MariaDB — local/dev/prod 환경 분리
- 공통 응답: ApiResponse<T> 래퍼
- 예외: GlobalExceptionHandler + ErrorCode Enum

## 프론트엔드 (drinkindex-web)
- React + TypeScript + Vite
- Zustand (authStore, 각 도메인 store)
- React Query (서버 상태)
- Axios (인터셉터: 자동 토큰 갱신)
- Tailwind CSS (primary: amber)
- react-i18next (ko 기본, en 지원)

## ERD 핵심 관계
User →(1:N)→ Review, Comment, Wishlist, Report
Spirit →(1:N)→ Review, Comment, SpiritImage
Distillery →(1:N)→ Spirit
Comment →(1:N, self)→ Comment (대댓글)

## 신고 자동 숨김
신고 3회 이상 → isHidden=true 자동 처리
관리자 dismiss → isHidden=false 복구

## 리뷰 점수 구조
향(Nose) + 맛(Taste) + 피니시(Finish) 각 100점 독립 입력
totalScore = 3항목 평균 (소수점 1자리)
기타(comment) = 점수 없는 텍스트 코멘트
Spirit.avgScore = 해당 술 전체 리뷰 totalScore 평균


## 공지사항 (Notice) — STEP 21~24

### 핵심 구조
- Notice, NoticeImage 두 테이블로 구성
- 이미지는 바이너리 저장 금지 → 파일은 스토리지, 메타데이터는 NoticeImage 테이블
- TipTap HTML 원본(content)은 DB에만 보관, API 응답은 content_sanitized만 반환
- 스토리지 추상화: local은 로컬 파일시스템, dev/prod는 S3 호환 스토리지 전환 가능 구조

### 보안 적용 목록 (공지사항)
- XSS: jsoup 화이트리스트 Sanitize (서버) + DOMPurify (프론트)
- 이미지: SVG 차단, Magic Bytes 검사, UUID 파일명, Path Traversal 방어
- CSP: script-src 'self', frame-ancestors 'none', object-src 'none'
- iframe: X-Frame-Options DENY + CSP frame-ancestors 이중 적용
- CSRF: JWT Stateless 구조로 미해당 (코드 주석 명시)
- SQL Injection: JPA + QueryDSL 파라미터 바인딩 전용
- Rate Limiting: Bucket4j + Redis (이미지 업로드 분당 20회)
- MIME 스니핑: X-Content-Type-Options nosniff
- Referrer: Referrer-Policy strict-origin-when-cross-origin

### 스토리지 전략
- local 프로파일: LocalFileStorageService (로컬 파일시스템)
- dev/prod 프로파일: S3FileStorageService (S3 호환, 추후 활성화)
- 공통 인터페이스: FileStorageService (upload, delete, getUrl)
- application-local.yml: storage.type=local
- application-dev.yml / application-prod.yml: storage.type=s3 (추후 설정)