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

## 숙성력 (점수·레벨) 시스템 — STEP 39~43

### 핵심 정책
- 점수 단어: 숙성력 (maturing_power)
- 레벨: 11단계 (몰트~50yo). 이후 단계 추가 가능한 확장 구조.
- 레벨 구간: member_level_config 테이블에서 관리자 설정 (소스 변경 불필요)
- 출석: 로그인 시 자동 체크 (중복 방지 — 당일 1회), 연속 출석 카운트 유지

### 레벨 명칭 (11단계)
Lv1=몰트(0), Lv2=스피릿(50), Lv3=스카치(150), Lv4=12yo(350),
Lv5=15yo(700), Lv6=18yo(1200), Lv7=CS(2000), Lv8=21yo(3500),
Lv9=30yo(6000), Lv10=40yo(10000), Lv11=50yo(20000)
→ 모두 member_level_config 테이블 값 기준. 관리자에서 변경 가능.

### 아이콘
- 일반 회원: SVG 컴포넌트 (LevelIcon.tsx). 레벨별 잔 채움 단계 다름.
- 관리자: 방패+열쇠 SVG (AdminIcon.tsx)
- 증류소 담당자: distilleries.logo_url 이미지 or 기본 증류기 SVG

### 점수 적립/차감 항목 (score_config 테이블)
자유게시판 말머리별, 소식 글쓰기, 댓글, 술 상세 리뷰, 술 등록 요청,
술 등록 승인, 추천받음, 출석, 연속출석7일, 연속출석30일, 위시리스트,
게시글 삭제, 신고잠금 — 모두 관리자 설정값.

### 연동 필요 지점 (기존 STEP 패치)
- STEP 07 리뷰 저장 → ScoreService.award(REVIEW_WRITE)
- STEP 06 술 등록 요청 → ScoreService.award(SPIRIT_REQUEST)
- STEP 06 관리자 승인 → ScoreService.award(SPIRIT_APPROVED, 요청자)
- STEP 33 게시글 저장 → ScoreService.award(POST_WRITE_{PREFIX})
- STEP 33 게시글 삭제 → ScoreService.deduct(POST_DELETE)
- STEP 33 신고 잠금 → ScoreService.deduct(POST_LOCKED)
- STEP 33 추천 받음 → ScoreService.award(POST_LIKED)
- STEP 34 댓글 저장 → ScoreService.award(COMMENT_WRITE) + 일일 한도 체크
- STEP 09 위시리스트 → ScoreService.award(WISHLIST_ADD)

### TODO (나중에 구현)
- 이메일 인증 (가입 시)
- 비밀번호 재설정 (이메일 발송)
- 프로필 이미지 업로드