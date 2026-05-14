# DrinkIndex — Claude Code 컨텍스트

## 프로젝트
위스키·꼬냑·와인 리뷰 커뮤니티 플랫폼.
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
- JAVA_HOME = "C:\Users\EM_NB139\.jdks\temurin-21.0.10"

## 프론트엔드 (drinkindex-web)
- React + TypeScript + Vite
- Zustand (authStore, 각 도메인 store)
- React Query (서버 상태)
- Axios (인터셉터: 자동 토큰 갱신)
- Tailwind CSS (primary: amber)
- react-i18next (ko 기본, en 지원)

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

## 신고 자동 숨김
신고 3회 이상 → isHidden=true 자동 처리
관리자 dismiss → isHidden=false 복구

## 술 카테고리 상세 필드 — STEP 25~27

### DB 구조 전략 (혼합)
- 검색·필터 핵심 필드 → 카테고리별 서브 테이블 컬럼 (인덱스 가능)
- 보조·참고 정보 → 서브 테이블 내 JSON 컬럼 (extra_data)
- spirits 테이블과 서브 테이블은 1:1 관계 (spirit_id PK = FK)

### 서브 테이블 목록
- spirit_common_detail   공통 상세 (모든 카테고리)
- spirit_whisky_detail   위스키 전용
- spirit_wine_detail     와인 전용
- spirit_cognac_detail   꼬냑 전용

### NAS 처리 원칙
- is_nas=true → 저장 시 age_statement 강제 null (백엔드 검증)
- 프론트: NAS 체크 시 input disabled, 기존 값 화면 유지(회색)
- API 수신 시 is_nas=true & age_statement != null → 서버가 null로 덮어씀

### 카테고리 선택 흐름
- Spirit 등록 폼: 1단계 카테고리 선택 → 2단계 공통 정보 → 3단계 카테고리 전용 필드
- 카테고리 변경 시 기존 서브 테이블 row 삭제 후 새 카테고리 row 생성