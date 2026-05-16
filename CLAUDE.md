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
- JAVA_HOME = "C:\Users\JINHOH_PC\.jdks\temurin-21.0.10"

## 프론트엔드 (drinkindex-web)
- React + TypeScript + Vite
- Zustand (authStore, 각 도메인 store)
- React Query (서버 상태)
- Axios (인터셉터: 자동 토큰 갱신)
- Tailwind CSS (primary: amber)
- react-i18next (ko 기본, en 지원)
- PC, 모바일 반응형 고려해서 구현
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

## 신고 자동 숨김
신고 3회 이상 → isHidden=true 자동 처리
관리자 dismiss → isHidden=false 복구