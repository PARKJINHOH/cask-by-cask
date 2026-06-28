# CaskByCask — Claude Code 컨텍스트

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
- React + TypeScript + Next.js
- Zustand (authStore, 각 도메인 store)
- React Query (서버 상태)
- Axios (인터셉터: 자동 토큰 갱신)
- Tailwind V4 (primary: amber)
- react-i18next (ko 기본, en 지원)
- PC, 모바일 반응형 고려해서 구현
- PC에서는 화면을 보다 넓게 사용하는 UI/UX로 구현.
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


## 응답은 한국어로 해줘.
## Git 규칙
- 절대로 임의로 commit, push, branch 생성, merge 하지 말 것.
- Git 명령은 사용자의 명시적인 요청이 있을 때만 수행.

## Query 작성 원칙
- Spring Data JPA + QueryDSL을 우선 사용.
- Native Query는 불가피한 경우만 사용.
- N+1 문제를 항상 고려한다.

## DB 변경
- Entity 수정 시 반드시 Flyway Migration 생성.
- 기존 Migration 수정 금지.
- 새로운 Migration만 추가.

## 구현 원칙
- 기존 기능에 영향이 있는 경우 반드시 먼저 설명한다.
- 확신이 없으면 추측하지 말고 질문한다.

# 운영 서비스 주의사항
현재 실제 운영 중인 서비스이다.
기존 기능이 변경될 가능성이 있는 작업은
반드시 영향 범위를 먼저 설명한 후 수정한다.
추측해서 구현하지 말고,
불명확한 요구사항은 질문 후 구현한다.