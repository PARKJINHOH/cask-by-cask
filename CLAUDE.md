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