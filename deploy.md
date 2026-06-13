# CaskByCask 배포 가이드

> **배포 파이프라인(서버 구조 / GitHub Actions 수동 배포 / 롤백)** 은 [deploy/DEPLOY-PIPELINE.md](deploy/DEPLOY-PIPELINE.md) 참고.
> 이 문서는 **Flyway 마이그레이션 / SEO prerender / 운영 SQL 절차** 를 다룬다.

---

## ✅ 배포 전 Todo List (운영 반영 전 반드시 확인)

> 코드로 처리할 수 없는 **운영 환경 설정/확인** 항목. 배포 직전에 하나씩 체크.

- [ ] **(A-2) 운영 `.env.prod` 시크릿 강도 점검**
  - [ ] `JWT_SECRET` — HS256 이므로 **최소 32바이트(256bit) 랜덤**. 생성: `openssl rand -base64 48`
  - [ ] `ADMIN_PASSWORD` / `DB_PASSWORD` / `REDIS_PASSWORD` / `GMAIL_APP_PASSWORD` — 추측 불가한 강한 값
  - [ ] `SLACK_WEBHOOK_URL` (에러 알림) 설정 여부
  - [ ] (키 회전 시) `JWT_SECRET_PREVIOUS` 운용 절차 숙지 — `JwtProvider` 주석 참고

- [ ] **(A-3) 도메인 / CORS 정합 확인**
  - [ ] `application-prod.yml` 의 `cors.allowed-origins` 가 **실제 서비스 도메인과 정확히 일치** (apex/www 변형 포함)
  - [ ] 불일치 시 전 API 가 CORS 차단됨 — `seo.site-url` 도 동일 도메인인지 같이 확인

- [ ] **(B-2) Cloudflare 설정** (Cloudflare 사용 확정)
  - [ ] `caskbycask-web/nginx/default.conf.template` 상단 `set_real_ip_from` Cloudflare IP 대역이 최신인지 확인 — 출처: https://www.cloudflare.com/ips/ (보통 안정적이나 추가될 수 있음)
  - [ ] Cloudflare SSL/TLS 모드 = **Full (strict)** 권장, 오리진은 80만 listen(컨테이너) 구성과 일치
  - [ ] Cloudflare가 `CF-Connecting-IP` 를 전달하는지 확인 (rate-limit IP 키가 이 헤더 기반)
  - [ ] (선택) Cloudflare WAF / Bot Fight Mode, `/api/auth/*` 추가 Rate Limit Rule

- [ ] **(B-4) 업로드 파일 백업 정책**
  - [ ] 운영 업로드는 **서버 로컬 디스크 `/app/upload`** (배포와 무관한 영속 경로, nginx 가 `/uploads/` 로 직접 서빙)에 저장 → 인스턴스 장애 시 유실 위험
  - [ ] `/app/upload` 정기 백업(cron + 외부 스토리지/Object Storage 복사) 또는 Oracle Block Volume 스냅샷 스케줄 구성
  - [ ] 장기적으로 `S3FileStorageService`(현재 스텁) 활성화해 외부 오브젝트 스토리지로 이전 검토

- [ ] **(A-1) 프론트 SEO prerender 활성화** — 상세 절차는 아래 [프론트 SEO prerender 배포](#프론트-seo-prerender-배포) 참고

- [ ] **(인증) refresh 토큰 httpOnly 쿠키 전환 반영** (이번 배포에 포함됨)
  - [ ] **기존 로그인 사용자는 1회 재로그인 필요** — 배포 전 세션엔 httpOnly 쿠키가 없어, access 토큰 만료 시 refresh 가 한 번 실패하며 자동 로그아웃→재로그인됨(정상 동작, 데이터 영향 없음)
  - [ ] Cloudflare 가 `Set-Cookie` 응답 헤더를 **그대로 통과**시키는지 확인 (기본 통과. "Cache Everything" 류 규칙이 `/api/*` 에 걸려 있지 않은지 점검 — POST/인증은 캐시 금지)
  - [ ] dev/prod 는 HTTPS 라 `Secure` 쿠키 정상. 쿠키 설정값은 `application-{env}.yml` 의 `app.auth.refresh-cookie.*` (prod: secure=true, same-site=Strict)

---

## 목차
- [프론트 SEO prerender 배포](#프론트-seo-prerender-배포)
- [Flyway 개요](#flyway-개요)
- [환경별 동작 방식](#환경별-동작-방식)
- [마이그레이션 파일 작성 규칙](#마이그레이션-파일-작성-규칙)
- [운영 서버 최초 배포](#운영-서버-최초-배포)
- [기능 개발 후 운영 적용 절차](#기능-개발-후-운영-적용-절차)
- [케이스별 SQL 예시](#케이스별-sql-예시)
- [주의사항 및 자주 하는 실수](#주의사항-및-자주-하는-실수)
- [문제 해결](#문제-해결)

---

## 프론트 SEO prerender 배포

### 왜 필요한가
SPA(Vite/React)는 최초 응답이 빈 셸 HTML 이라, 일부 크롤러/미리보기 봇은 JS 실행 전 본문·메타·JSON-LD 를 못 봅니다.
`scripts/prerender.mjs` 가 **빌드 후 주요 정적 라우트를 puppeteer(headless Chromium)로 렌더해 `dist/<route>/index.html` 스냅샷**으로 저장하면, nginx 가 크롤러에게 완성된 HTML(JSON-LD/메타 포함)을 바로 줍니다.

> **현재 상태**: prerender 는 **GitHub Actions(`build-web` 잡)에서 실행**됩니다.
> 워크플로가 `npx puppeteer browsers install chrome` 로 Chromium 을 설치한 뒤 `npm run build`(= tsc + vite build + prerender)를 수행하고,
> 완성된 `dist/`(스냅샷 포함)만 서버 `/app/vite/dist` 로 전송합니다.
> **따라서 운영 서버에는 Chromium 이 필요 없습니다.** 아래 "서버에 Chromium 설치" 절은 서버에서 직접 prerender 를 돌리던 구(舊) 방식의 참고용입니다.

### (구 방식 참고) Ubuntu 서버에 Chromium 설치

> 현재 파이프라인에선 불필요. 서버에서 수동으로 prerender 를 돌릴 때만 참고.

puppeteer 가 헤드리스 Chromium 을 띄우려면 시스템 라이브러리 + Chromium 바이너리가 필요합니다.
**방법 A(권장: 시스템 Chromium)** — 가볍고 apt 로 업데이트 관리됨:

```bash
# 1) 시스템 Chromium 설치 (Ubuntu 22.04+)
sudo apt-get update
sudo apt-get install -y chromium-browser

#   ※ snap 기반이라 경로가 다르면 chromium 패키지로 시도:
#   sudo apt-get install -y chromium

# 2) 설치 경로 확인 (PUPPETEER_EXECUTABLE_PATH 에 넣을 값)
which chromium-browser || which chromium
#   예: /usr/bin/chromium-browser

# 3) 배포 유저 환경에 영구 등록 (puppeteer 가 자체 다운로드 대신 이 바이너리 사용)
echo 'export PUPPETEER_SKIP_DOWNLOAD=true' >> ~/.bashrc
echo 'export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser' >> ~/.bashrc
source ~/.bashrc
```

> `prerender.mjs` 는 `puppeteer.launch({ headless:'new', args:['--no-sandbox','--disable-setuid-sandbox'] })`
> 로 실행되며, `PUPPETEER_EXECUTABLE_PATH` 가 있으면 puppeteer 가 그 바이너리를 사용합니다.

**방법 B(puppeteer 내장 Chromium)** — apt Chromium 이 안 맞을 때:

```bash
# puppeteer 가 빌드 시 자체 Chromium 을 다운로드/사용 (PUPPETEER_SKIP_DOWNLOAD 미설정 상태)
cd caskbycask-web
npx puppeteer browsers install chrome
# 헤드리스 구동에 필요한 공유 라이브러리 (없으면 launch 시 'error while loading shared libraries')
sudo apt-get install -y \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
  libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 libpangocairo-1.0-0
```

### 배포 시 사용법

평소 배포는 **GitHub Actions "Deploy (manual)"** 실행만으로 prerender 까지 자동 수행됩니다
(상세: [deploy/DEPLOY-PIPELINE.md](deploy/DEPLOY-PIPELINE.md)). 로컬에서 직접 빌드/검증하려면:

```bash
cd caskbycask-web
npm run build:no-prerender   # dist 생성 (prerender 제외)
npm run prerender            # 기존 dist 에 스냅샷만 덧입힘 (vite build 불필요)
# 또는 한 번에:
npm run build                # tsc + vite build + prerender
```

### 검증

```bash
# 스냅샷 파일이 생성됐는지 (서버)
ls -la /app/vite/dist/spirits/index.html

# 배포 후 크롤러 관점에서 본문/JSON-LD 가 박혀 있는지 (JS 미실행 상태)
curl -s https://caskbycask.net/spirits | grep -o 'application/ld+json' | head
```

### 문제 해결

| 증상 | 원인 / 해결 |
|---|---|
| `Could not find Chromium` / `Failed to launch the browser process` | Chromium 미설치 또는 경로 불일치 → 방법 A의 `PUPPETEER_EXECUTABLE_PATH` 확인 |
| `error while loading shared libraries: libnss3.so` | 헤드리스 의존 라이브러리 누락 → 방법 B의 `apt-get install` 라이브러리 설치 |
| prerender 단계만 실패하고 배포는 성공 | 의도된 graceful degrade — SEO 만 저하. 위 설정 점검 후 재배포 |
| dev 에서 prerender 안 함 | 정상 — dev 는 `ROBOTS_NOINDEX=on`(색인 차단)이라 의도적으로 건너뜀 |

> **인프라 대안**: 위 운영이 번거로우면, Cloudflare 단에서 크롤러(User-Agent)만 별도 prerender 서비스로 보내거나,
> 추후 SSR(Next.js 등) 전환을 검토할 수 있습니다. 현재 규모에서는 빌드 시 prerender 로 충분합니다.

---

## Flyway 개요

Flyway는 DB 스키마 변경 이력을 버전으로 관리하는 마이그레이션 툴입니다.
**별도 실행 명령어 없이, Spring Boot 앱 기동 시 자동으로 실행됩니다.**

앱이 뜰 때 Flyway가 DB의 `flyway_schema_history` 테이블을 확인하고,
아직 실행되지 않은 `.sql` 파일만 순서대로 자동 실행합니다.

```
앱 기동
  └─ Flyway 실행
       ├─ flyway_schema_history 테이블 확인
       ├─ db/migration/ 폴더의 V*.sql 스캔
       ├─ 이미 실행된 파일 → 체크섬 검증 (변경 시 기동 실패)
       └─ 미실행 파일 → 버전 순서대로 자동 실행
```

### flyway_schema_history 테이블 (자동 생성)

| installed_rank | version | description | checksum | success |
|---|---|---|---|---|
| 1 | 1 | init baseline | 123456 | true |
| 2 | 7 | add user password and dormant | 789012 | true |
| 3 | 8 | add user must change password | 345678 | true |

---

## 환경별 동작 방식

| 환경 | `ddl-auto` | Flyway | 스키마 변경 주체 |
|------|-----------|--------|--------------|
| **local** | `update` | 활성화 | JPA(자동) + Flyway |
| **dev** | `update` | 활성화 | JPA(자동) + Flyway |
| **prod** | `none` | 활성화 | **Flyway 파일만** |

- **local/dev**: Entity에 필드 추가하면 JPA가 컬럼을 자동으로 추가해줍니다.
- **prod**: JPA는 스키마에 절대 손대지 않습니다. Flyway `.sql` 파일로만 변경됩니다.

> 즉, 로컬에서는 Entity 수정만으로 동작하지만, 운영 반영을 위해서는 반드시 `.sql` 파일을 함께 작성해야 합니다.

---

## 마이그레이션 파일 작성 규칙

### 파일 위치
```
caskbycask-api/src/main/resources/db/migration/
```

### 파일명 형식
```
V{숫자}__{설명}.sql
```
- `V` 는 대문자
- 숫자는 정수 (소수점 가능: V1.1, V1.2)
- `__` 는 언더스코어 **두 개**
- 설명은 영문 snake_case

```
V10__add_review_image_table.sql       ← 새 테이블 추가
V11__alter_spirit_add_aged_year.sql   ← 컬럼 추가
V12__drop_old_notification_table.sql  ← 테이블 삭제
```

### 번호 결정 기준
현재 가장 높은 번호 다음 번호를 사용합니다.
현재 최신: `V9__seed_faq.sql` → 다음 파일은 `V10__...sql`

---

## 운영 서버 최초 배포

이 프로젝트는 이미 운영 중입니다. 아래는 참고용 기록입니다.

### 최초 배포 시 했던 절차 (V1 baseline 방식)

1. `application-prod.yml`의 `ddl-auto`를 임시로 `create`로 변경
2. 운영 DB에 앱 한 번 기동 → JPA가 모든 테이블 자동 생성
3. 앱 종료 후 `ddl-auto: none`으로 원복
4. `baseline-on-migrate: true` 설정 덕분에 Flyway가 현재 상태를 V0(baseline)으로 마킹
5. 이후 모든 변경은 V2, V3... 순서로 추가

> `V1__init_baseline.sql`은 현재 placeholder 상태입니다.
> 운영 DB를 새로 구성해야 할 때는 현재 스키마를 dump 떠서 V1에 채워넣으면 됩니다.
> ```bash
> mysqldump --no-data --skip-comments caskbycask_prod > V1__init_baseline.sql
> ```

---

## 기능 개발 후 운영 적용 절차

### Step 1. 로컬/dev 개발

Entity에 필드를 추가하거나 수정합니다. `ddl-auto: update`가 로컬 DB에 자동 반영합니다.

```java
// User.java — 예: 새 컬럼 추가
@Column(name = "profile_image_url")
private String profileImageUrl;
```

### Step 2. Flyway 마이그레이션 파일 작성

로컬에서 동작 확인 후, **반드시** 운영용 SQL 파일을 작성합니다.

```sql
-- V10__add_user_profile_image.sql

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(500) NULL;
```

### Step 3. 로컬에서 Flyway 검증

앱을 재기동하면 Flyway가 V10을 자동 실행합니다. 로그로 확인합니다.

```
Migrating schema `caskbycask` to version "10 - add user profile image"
Successfully applied 1 migration to schema `caskbycask`
```

### Step 4. 운영 배포

코드와 `.sql` 파일을 함께 push 후 배포합니다.
운영 서버에서 앱이 재기동되면 Flyway가 V10을 자동 실행합니다.

```
[prod] Migrating schema `caskbycask_prod` to version "10 - add user profile image"
[prod] Successfully applied 1 migration
```

**배포 순서 주의**: 앱 재기동 전에 Flyway가 먼저 실행되므로, 배포와 동시에 스키마가 변경됩니다.

---

## 케이스별 SQL 예시

### 컬럼 추가

```sql
-- V10__add_spirit_aged_year.sql

ALTER TABLE spirits
    ADD COLUMN IF NOT EXISTS aged_year INT NULL COMMENT '숙성 연수';
```

### 컬럼 수정 (타입 변경)

```sql
-- V11__alter_review_content_to_text.sql

ALTER TABLE reviews
    MODIFY COLUMN content TEXT NOT NULL;
```

### 컬럼 삭제

```sql
-- V12__drop_user_old_token.sql

ALTER TABLE users
    DROP COLUMN IF EXISTS old_token;
```

### 컬럼 이름 변경

```sql
-- V13__rename_spirit_name_column.sql

ALTER TABLE spirits
    RENAME COLUMN name TO name_ko;
```

### 새 테이블 추가

```sql
-- V14__add_review_images_table.sql

CREATE TABLE IF NOT EXISTS review_images (
    id         BIGINT      NOT NULL AUTO_INCREMENT,
    review_id  BIGINT      NOT NULL,
    image_url  VARCHAR(500) NOT NULL,
    sort_order INT         NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    INDEX idx_review_images_review_id (review_id),
    CONSTRAINT fk_review_images_review
        FOREIGN KEY (review_id) REFERENCES reviews (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 테이블 삭제

```sql
-- V15__drop_old_push_tokens_table.sql

DROP TABLE IF EXISTS old_push_tokens;
```

### 인덱스 추가

```sql
-- V16__add_index_spirits_category.sql

ALTER TABLE spirits
    ADD INDEX IF NOT EXISTS idx_spirits_category (category);
```

### 데이터 시딩 (초기 데이터 삽입)

```sql
-- V17__seed_new_categories.sql

INSERT IGNORE INTO categories (code, name_ko, name_en, created_at, updated_at)
VALUES
    ('GIN', '진', 'Gin', NOW(6), NOW(6)),
    ('RUM', '럼', 'Rum', NOW(6), NOW(6));
```

---

## 주의사항 및 자주 하는 실수

### 절대 하면 안 되는 것

**기존 파일 수정 금지**

Flyway는 이미 실행한 파일의 체크섬을 저장해둡니다.
파일을 수정하면 다음 기동 시 아래 오류가 발생하며 앱이 뜨지 않습니다.

```
FlywayException: Validate failed:
Migration checksum mismatch for migration version 7
-> Applied to database : 789012
-> Resolved locally    : 111111
```

해결: 파일을 원래대로 되돌리거나, 변경사항은 새 버전 파일로 작성합니다.

---

**파일명 형식 오류**

```
V10_add_column.sql    ← 언더스코어 한 개 → Flyway가 인식 못 함
v10__add_column.sql   ← 소문자 v → 인식 못 함
V10__add column.sql   ← 공백 → 오류
```

---

**로컬에서 Flyway 파일 없이 개발 후 운영 배포**

로컬에서 `ddl-auto: update`만 믿고 개발하다가 `.sql` 파일을 작성하지 않으면,
운영 배포 후 컬럼이 없어서 앱이 오류납니다.

체크리스트:
- [ ] Entity 필드 변경 시 → 대응하는 `V{n}__.sql` 파일 존재 여부 확인
- [ ] 새 파일을 git에 포함하여 push

---

**같은 버전 번호 중복 사용**

```
V10__add_column_a.sql
V10__add_column_b.sql  ← 충돌 → 기동 실패
```

버전 번호는 유일해야 합니다. `V10`, `V11` 처럼 증가시킵니다.

---

## 문제 해결

### 체크섬 불일치 오류

```
FlywayException: Validate failed: Migration checksum mismatch
```

원인: 이미 적용된 파일이 수정됨
해결: 해당 파일을 적용 전 내용으로 되돌립니다.

---

### 마이그레이션 실패 후 절반만 적용된 경우

Flyway는 각 파일을 트랜잭션으로 실행합니다. 파일 중간에 오류가 나면 해당 버전 전체가 롤백됩니다.
`flyway_schema_history`에서 `success = false`인 레코드를 확인합니다.

```sql
SELECT * FROM flyway_schema_history WHERE success = 0;
```

해당 레코드를 삭제하고, SQL을 수정한 뒤 앱을 재기동하면 재시도합니다.

```sql
DELETE FROM flyway_schema_history WHERE version = '10' AND success = 0;
```

---

### 운영 DB를 새로 구성해야 할 때

현재 운영 스키마를 dump 떠서 V1에 채우고 새 DB에 적용합니다.

```bash
# 스키마만 dump (데이터 제외)
mysqldump --no-data --skip-comments -u {user} -p caskbycask_prod \
  > caskbycask-api/src/main/resources/db/migration/V1__init_baseline.sql
```

이후 새 DB에서 앱을 기동하면 V1부터 순서대로 전체 마이그레이션이 실행됩니다.
