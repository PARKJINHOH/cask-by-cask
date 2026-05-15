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
- JAVA_HOME = "C:/Users/EM_NB139/.jdks/temurin-21.0.10"

## 프론트엔드 (drinkindex-web)
- React + TypeScript + Vite
- Zustand (authStore, 각 도메인 store)
- React Query (서버 상태)
- Axios (인터셉터: 자동 토큰 갱신)
- Tailwind CSS (primary: amber)
- react-i18next (ko 기본, en 지원)
- PC, 모바일 반응형 고려해서 구현
- node = "C:\Program Files\nodejs"

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

## 커뮤니티 (Community) — STEP 31~38

### 게시판 종류
- NOTICE(소식): ADMIN + DISTILLERY Role만 작성. 비회원 열람 가능.
- FREE(자유): 로그인 회원 작성. 익명 글쓰기 지원 (user_id는 DB 저장).

### 핵심 정책
- 삭제: posts → deleted_posts 이동 (Hard Delete 금지)
- 신고 5회 누적 → 게시글 LOCKED (제목 빨간색, 본문 비노출)
- 욕설 필터: bad_words 테이블 기반, 제목+본문+댓글+쪽지 전체 적용
- 추천 알림 임계치: NotificationConstants.LIKE_NOTIFY_THRESHOLD = 10 (소스 변경 가능)

### 투표 정책
- 게시글 1개당 투표 1개
- 작성자가 단일/복수 선택 설정
- 종료일시 이후 투표 불가, 결과만 공개

### 알림 정책
- 폴링 방식 (30초 간격), 추후 롱폴링 전환 고려한 구조
- 알림 종류: COMMENT, REPLY, MENTION, LIKE, MESSAGE, SYSTEM
- 보관 기간: 90일 후 자동 삭제

### 동영상 CSP
- 게시글 상세 페이지 응답 헤더에만 frame-src 완화
- 허용: https://www.youtube.com https://player.vimeo.com
- 전체 페이지 CSP는 기존 유지 (frame-src 'none')

### 테이블 목록
커뮤니티: posts, deleted_posts, post_prefixes, post_comments,
          post_reports, post_likes, post_scraps, post_images,
          comment_emoji_reactions, community_emojis,
          bad_words, user_blocks
투표: polls, poll_options, poll_votes
시리즈: series, series_posts
알림/쪽지: notifications, messages, message_items