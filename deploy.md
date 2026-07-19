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
  - [ ] `deploy/nginx/caskbycask.conf` 상단 `set_real_ip_from` Cloudflare IP 대역이 최신인지 확인 — 출처: https://www.cloudflare.com/ips/ (보통 안정적이나 추가될 수 있음)
  - [ ] Cloudflare SSL/TLS 모드 = **Full (strict)** 권장, 오리진은 80만 listen(컨테이너) 구성과 일치
  - [ ] Cloudflare가 `CF-Connecting-IP` 를 전달하는지 확인 (rate-limit IP 키가 이 헤더 기반)
  - [ ] (선택) Cloudflare WAF / Bot Fight Mode, `/api/auth/*` 추가 Rate Limit Rule

- [ ] **(B-4) 업로드 파일 백업 정책**
  - [ ] 운영 업로드는 **서버 로컬 디스크 `/app/upload`** (배포와 무관한 영속 경로, nginx 가 `/uploads/` 로 직접 서빙)에 저장 → 인스턴스 장애 시 유실 위험
  - [ ] `/app/upload` 정기 백업(cron + 외부 스토리지/Object Storage 복사) 또는 Oracle Block Volume 스냅샷 스케줄 구성
  - [ ] 장기적으로 `S3FileStorageService`(현재 스텁) 활성화해 외부 오브젝트 스토리지로 이전 검토

- [ ] **(A-1) 프론트 Next.js 헬스체크 및 포트(3000) 바인딩 상태 확인** — 상세 절차는 아래 [프론트 Next.js SSR 배포 검증](#프론트-nextjs-ssr-배포-검증) 참고

- [ ] **(인증) refresh 토큰 httpOnly 쿠키 전환 반영** (이번 배포에 포함됨)
  - [ ] **기존 로그인 사용자는 1회 재로그인 필요** — 배포 전 세션엔 httpOnly 쿠키가 없어, access 토큰 만료 시 refresh 가 한 번 실패하며 자동 로그아웃→재로그인됨(정상 동작, 데이터 영향 없음)
  - [ ] Cloudflare 가 `Set-Cookie` 응답 헤더를 **그대로 통과**시키는지 확인 (기본 통과. "Cache Everything" 류 규칙이 `/api/*` 에 걸려 있지 않은지 점검 — POST/인증은 캐시 금지)
  - [ ] dev/prod 는 HTTPS 라 `Secure` 쿠키 정상. 쿠키 설정값은 `application-{env}.yml` 의 `app.auth.refresh-cookie.*` (prod: secure=true, same-site=Strict)

---

## 목차
- [프론트 Next.js SSR 배포 검증](#프론트-nextjs-ssr-배포-검증)
- [Flyway 개요](#flyway-개요)
- [환경별 동작 방식](#환경별-동작-방식)
- [마이그레이션 파일 작성 규칙](#마이그레이션-파일-작성-규칙)
- [운영 서버 최초 배포](#운영-서버-최초-배포)
- [기능 개발 후 운영 적용 절차](#기능-개발-후-운영-적용-절차)
- [케이스별 SQL 예시](#케이스별-sql-예시)
- [주의사항 및 자주 하는 실수](#주의사항-및-자주-하는-실수)
- [문제 해결](#문제-해결)

---

## 프론트 Next.js SSR 배포 검증

### 왜 필요한가
기존 SPA(Vite/React) 환경은 최초 HTML 응답이 빈 셸 구조라 검색엔진 봇 및 소셜 미리보기 봇이 페이지의 구체적인 제목, 이미지, 그리고 구조화된 데이터(JSON-LD)를 크롤링하지 못하는 SEO 제약이 있었습니다.
마이그레이션된 Next.js 환경은 핵심 페이지(주류 목록, 주류 상세, 커뮤니티/BYOB 게시글 상세)를 서버 측에서 HTML을 직접 생성하는 SSR/ISR 방식으로 렌더링하므로, 검색 봇에 완전한 SEO 데이터와 메타태그를 즉시 반환하여 검색 노출 순위 향상을 도모합니다.

### 배포 시 사용법
배포는 **GitHub Actions "Deploy (manual)"** 워크플로우 실행을 통해 빌드 및 서버 반영이 자동으로 이행됩니다.
로컬에서 직접 빌드/검증하려면:

```bash
cd caskbycask-web
npm run build      # Next.js standalone 빌드 (.next/standalone 생성)
npm run start      # 로컬 프로덕션 실행 (포트 3000)
```

### 검증 방법
배포 후, 터미널 curl 명령어를 사용해 실제 검색엔진 봇의 시점으로 HTML 응답에 완전한 본문과 구조화된 데이터(JSON-LD)가 포함되어 있는지 검증합니다.

```bash
# 1) Next.js 3000 포트 또는 nginx 도메인을 대상으로 curl 요청 테스트 (Title, Description 태그 검증)
curl -s https://www.caskbycask.net/spirits/1 | grep -o "<title>[^<]*</title>"
curl -s https://www.caskbycask.net/spirits/1 | grep -o 'meta name="description" content="[^"]*"'

# 2) JSON-LD 구조화 스키마가 정상적으로 헤더에 이스케이프되어 수록되었는지 확인
curl -s https://www.caskbycask.net/spirits/1 | grep -o 'application/ld+json'

# 3) 커뮤니티 게시글 상세의 DiscussionForumPosting 스키마 확인
curl -s https://www.caskbycask.net/community/free/1 | grep -o 'DiscussionForumPosting'
```

### 문제 해결

| 증상 | 원인 / 해결 |
|---|---|
| `Connection refused` (3000포트 접근 불가) | Next.js Node 서버가 떠 있지 않거나 systemd 서비스(`caskbycask-web`)가 에러로 종료됨 → `systemctl status caskbycask-web` 및 `journalctl -u caskbycask-web`로 로그 분석 |
| Nginx 502 Bad Gateway | Nginx의 upstream 설정(포트 3000)과 Next.js standalone 구동 포트가 불일치함 → `/etc/nginx/sites-available/caskbycask.conf` 및 systemd 서비스의 Environment=PORT=3000 설정 검토 |
| Hydration Error / Console 크래시 | SSR 서버에서 렌더링된 트리와 클라이언트의 Hydration 트리가 일치하지 않음 → `app/[[...path]]/page.tsx`에 `ssr: false` dynamic import 가 올바르게 꽂혔는지 점검 |

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

## 운영 서버 최초 배포 (빈 DB → Flyway 자동 구성)

`V1__init_baseline.sql` 이 현재 엔티티 전체 스키마(클린 베이스라인)이고, 이후 `V2`~`V{n}` 이
스키마 변경 + seed 를 이어붙인다. 따라서 **빈 `caskbycask_prod` DB 에 앱을 처음 기동하면
Flyway 가 V1 부터 끝까지 순서대로 적용해 스키마와 기초데이터를 한 번에 구성**한다.
별도의 `ddl-auto=create` 덤프 작업은 필요 없다.

1. 빈 DB/계정 생성 (`deploy/server/setup-server.md` 4단계 참고). prod 의 `ddl-auto` 는 `none` 그대로 둔다.
2. 첫 배포로 app.jar 기동 → Flyway 가 `flyway_schema_history` 를 만들고 V1~V{n} 을 자동 실행.
3. 로그에 `Successfully applied N migrations` 가 보이면 완료.

```
[prod] Migrating schema `caskbycask_prod` to version "1 - init baseline"
[prod] ... (V2 ~ V{n})
[prod] Successfully applied N migrations to schema `caskbycask_prod`
```

> 과거(레거시)에는 `ddl-auto=create` 로 JPA 가 테이블을 만들게 한 뒤 baseline 으로 마킹하는
> 방식을 썼으나, 지금은 V1 이 전체 스키마를 소유하므로 그 절차는 불필요하다.
> 엔티티로부터 V1 을 다시 떠야 할 때의 절차는 아래 [운영 DB를 새로 구성해야 할 때](#운영-db를-새로-구성해야-할-때) 참고.

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

---

## ⚠️ Docker 전환 및 서버 이중화(Horizontal Scaling) 시 주의사항

서비스 규모가 확장되어 컨테이너(Docker) 기반 배포 환경으로 전환하거나, 무중단 배포 및 부하 분산을 위해 API 서버를 이중화(Active-Active)하는 경우 소스코드 및 아키텍처 상 다음 사항들을 주의 깊게 설계하고 조치해야 합니다.

### 1. 검색 엔진 백엔드 (Embedded Lucene 및 사용자 사전 관리)
- **현 상태**: 로컬 파일 시스템(`lucene/indexes`)에 인덱스를 직접 생성하는 **Embedded Lucene** 방식과, 고유명사 형태소 분석을 보정하기 위한 **사용자 사전 파일(`userdict.txt`)**을 사용 중입니다.
- **이중화 및 Docker 전환 시 문제점**: 
  - **락 충돌**: 2개 이상의 API 인스턴스가 하나의 공유 파일 경로를 마운트할 경우, Lucene의 쓰기 락 파일(`write.lock`) 충돌로 인해 `LockObtainFailedException`이 발생하며 두 번째 서버가 기동되지 않습니다.
  - **사용자 사전 및 동의어 사전 관리**: `userdict.txt` 및 `synonyms.txt`는 jar 파일 내부에 패키징되므로, 이중화 환경에서 특정 서버만 사전이 다르면 형태소 분석 및 동의어 치환 결과가 불일치하여 검색 결과에 차이가 발생할 수 있습니다.
  - **인덱스 유실 및 재빌드 병목**: Docker 컨테이너 재생성 시 `/app/spring-boot/lucene` 경로를 볼륨 마운트하지 않으면 모든 인덱스가 유실됩니다. 기동 시점의 `MassIndexer`가 매번 수만 건의 RDBMS 데이터를 스캔하여 인덱스를 처음부터 다시 빌드하면서 상당한 CPU 및 디스크 I/O 병목을 유발합니다.
- **해결 방안**: 
  - **Elasticsearch 전환**: 다중 WAS 구성 시 `application.yml` 설정을 통해 **Elasticsearch 백엔드로 전환**하고, 모든 WAS가 외부의 공유 Elasticsearch 클러스터를 바라보도록 해야 합니다.
  - **볼륨 마운트 필수**: Docker 전환 시 인덱스가 휘발되지 않도록 `/app/spring-boot/lucene` 경로를 Host 디렉토리에 반드시 **볼륨 마운트**해야 합니다.
  - **사전 동기화 및 재인덱싱**: 새로운 위스키 브랜드나 한글 키워드, 혹은 동의어가 추가되어 `userdict.txt`나 `synonyms.txt`를 업데이트할 경우, **모든 WAS 인스턴스를 재빌드 및 재배포**해야 하며, 배포 완료 후 어드민 API 등을 통해 **Lucene 인덱스 재인덱싱(Reindex)을 수행**하여 과거 데이터에도 새 형태소 분석 및 동의어 규칙이 적용되도록 처리해야 합니다.

### 2. 로컬 파일 저장소 (Uploader 파일 불일치)
- **현 상태**: 사용자가 업로드한 이미지 및 미디어 파일은 로컬 스토리지 서비스([LocalFileStorageService.java](file:///c:/Users/JINHOH_PC/Desktop/workspace/cask-by-cask/caskbycask-api/src/main/java/com/caskbycask/global/storage/LocalFileStorageService.java))를 통해 로컬 경로(`/app/upload`)에 저장됩니다.
- **이중화 시 문제점**: 로드 밸런서에 의해 요청이 분산될 경우, 1번 서버에서 업로드한 이미지 파일이 2번 서버에는 존재하지 않아 이미지 조회 시 `404 Not Found`가 발생합니다.
- **해결 방안**:
  - AWS S3, Oracle Object Storage 등 외부의 오브젝트 스토리지를 연동하도록 소스코드 내의 `S3FileStorageService` 스텁을 활성화하거나, `/app/upload` 경로를 NFS(공유 네트워크 스토리지)로 공유해야 합니다.
  - Docker 전환 시 반드시 `/app/upload` 경로가 영속 볼륨(Persistent Volume)으로 보존되도록 마운트해야 컨테이너 재생성 시 업로드 파일 유실을 막을 수 있습니다.

### 3. 분산 환경 스케줄러 중복 실행 (`@Scheduled` 배치)
- **현 상태**: 미디어 정리([MediaCleanupBatch.java](file:///c:/Users/JINHOH_PC/Desktop/workspace/cask-by-cask/caskbycask-api/src/main/java/com/caskbycask/domain/community/batch/MediaCleanupBatch.java)), 미사용 토큰/알림 정리 등 다양한 배치 로직이 주기적으로 실행되고 있습니다.
- **이중화 시 문제점**: 여러 API 서버가 기동 중일 때, 정해진 스케줄(예: 새벽 3~4시)에 모든 인스턴스에서 동시에 배치를 실행합니다. 이는 DB 락 경합(DB Lock Contention), 데이터 중복 처리, CPU 자원 낭비를 유발합니다.
- **해결 방안**:
  - **ShedLock**과 같은 분산 락 라이브러리를 도입하여 DB/Redis를 통해 1개의 인스턴스만 배치를 획득해 실행하도록 수정해야 합니다.
  - 또는, 특정 프로파일(`@Profile("scheduler")`)을 지정하여 배치 스케줄링 전용 단일 인스턴스(Worker)에서만 배치가 실행되도록 격리해야 합니다.

### 4. 로컬 인메모리 캐시 동기화 지연 (Caffeine Cache)
- **현 상태**: API 호출 최소화를 위해 사용자 정보 캐싱([CacheConfig.java](file:///c:/Users/JINHOH_PC/Desktop/workspace/cask-by-cask/caskbycask-api/src/main/java/com/caskbycask/global/config/CacheConfig.java))에 로컬 인메모리 캐시인 **Caffeine**을 사용 중입니다.
- **이중화 시 문제점**: 1번 서버에서 사용자의 상태(탈퇴, 차단 등)가 변경되어 로컬 캐시를 무효화(Evict)해도, 2번 서버의 로컬 캐시에는 기존 정보가 최대 60초간 유지되는 일시적인 데이터 정합성 불일치가 발생할 수 있습니다.
- **해결 방안**:
  - 캐시 만료 시간(TTL)을 더 극단적으로 단축(예: 10초 이하)하거나, 캐시 저장소를 이미 세팅되어 있는 공유 **Redis** 기반 캐시로 마이그레이션 해야 합니다.

### 5. Docker 컨테이너 전환 시 네트워크 설정
- **Actuator 포트 분리**: 현재 `management.server.port=8081` 및 `address=127.0.0.1`로 설정되어 외부 접근을 방어하고 있습니다. 컨테이너 환경에서는 프로메테우스 수집기 등이 타겟 컨테이너 내부 8081 포트에 도커 내부 네트워크를 통해 접근할 수 있도록 포트 바인딩 및 네트워크 브릿지를 적절히 설계해야 합니다.
- **사용자 IP 추적 (Rate Limit)**: Nginx가 프록시 환경에서 사용자 실제 IP(`X-Forwarded-For`, `CF-Connecting-IP`)를 유실하지 않고 컨테이너 내부 WAS로 정확히 전달(헤더 위임 설정)해야 Cloudflare 기반의 Rate Limiter가 정상 작동합니다.
