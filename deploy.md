# DrinkIndex 배포 가이드

## 목차
- [Flyway 개요](#flyway-개요)
- [환경별 동작 방식](#환경별-동작-방식)
- [마이그레이션 파일 작성 규칙](#마이그레이션-파일-작성-규칙)
- [운영 서버 최초 배포](#운영-서버-최초-배포)
- [기능 개발 후 운영 적용 절차](#기능-개발-후-운영-적용-절차)
- [케이스별 SQL 예시](#케이스별-sql-예시)
- [주의사항 및 자주 하는 실수](#주의사항-및-자주-하는-실수)
- [문제 해결](#문제-해결)

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
drinkindex-api/src/main/resources/db/migration/
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
> mysqldump --no-data --skip-comments drinkindex_prod > V1__init_baseline.sql
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
Migrating schema `drinkindex` to version "10 - add user profile image"
Successfully applied 1 migration to schema `drinkindex`
```

### Step 4. 운영 배포

코드와 `.sql` 파일을 함께 push 후 배포합니다.
운영 서버에서 앱이 재기동되면 Flyway가 V10을 자동 실행합니다.

```
[prod] Migrating schema `drinkindex_prod` to version "10 - add user profile image"
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
mysqldump --no-data --skip-comments -u {user} -p drinkindex_prod \
  > drinkindex-api/src/main/resources/db/migration/V1__init_baseline.sql
```

이후 새 DB에서 앱을 기동하면 V1부터 순서대로 전체 마이그레이션이 실행됩니다.
