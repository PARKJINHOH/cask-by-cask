# 운영 DB 쿼리 후보 수집

이 절차는 인덱스를 추측해서 추가하지 않고, 운영에서 실제로 비용이 큰 `SELECT` 후보를 읽기 전용으로 찾기 위한 절차다.

## 안전 원칙

- `collect-db-query-candidates.sh`는 `SELECT`와 `SHOW`만 실행하며 설정을 변경하지 않는다.
- 쿼리 값이 제거된 `performance_schema` digest만 출력한다. 일반 slow query log 본문은 개인정보나 인증값을 포함할 수 있어 수집하지 않는다.
- `SHOW GRANTS`는 인증 해시가 출력될 수 있어 스크립트에서 실행하지 않는다.
- observer 계정에는 운영 애플리케이션 DB의 `SELECT` 권한을 주지 않고, 필요한 `performance_schema` 세 테이블의 조회 권한만 준다.
- 측정 결과만으로 즉시 인덱스를 추가하지 않는다. 후보 쿼리, 기존 인덱스, 쓰기 비용, 테이블 크기를 함께 검토한다.
- `ANALYZE FORMAT=JSON`은 MariaDB에서 실제 쿼리를 실행하므로 운영에서 사용하지 않는다.

## 선행 조건 확인

스크립트는 다음 조건을 읽기 전용으로 확인하고 하나라도 충족하지 않으면 오류로 종료한다.

- `@@GLOBAL.performance_schema = 1`
- `performance_schema.setup_consumers`의 `statements_digest = YES`
- `performance_schema.setup_instruments`의 `statement/sql/select`가 `ENABLED=YES`, `TIMED=YES`

비활성 상태를 후보 없음으로 오해하지 않도록 자동 활성화하지 않는다. `performance_schema` 자체를 켜려면 MariaDB 설정 변경과 재시작이 필요하므로 별도 점검 창에서 결정한다.

```bash
sudo mariadb --batch --skip-column-names \
  -e "SELECT @@GLOBAL.performance_schema;"
```

## 최소 권한 observer 계정

DBA가 별도 점검 창에서 강한 임시 비밀번호로 계정을 만들고 세 테이블의 `SELECT`만 부여한다. 아래 계정 호스트는 client option file의 `host=127.0.0.1`과 일치시킨다.

```sql
CREATE USER 'caskbycask_observer'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME';
GRANT SELECT ON performance_schema.events_statements_summary_by_digest
  TO 'caskbycask_observer'@'127.0.0.1';
GRANT SELECT ON performance_schema.setup_consumers
  TO 'caskbycask_observer'@'127.0.0.1';
GRANT SELECT ON performance_schema.setup_instruments
  TO 'caskbycask_observer'@'127.0.0.1';
```

권한은 DBA 세션에서 확인하고 결과를 수집 출력에 섞지 않는다.

```sql
SHOW GRANTS FOR 'caskbycask_observer'@'127.0.0.1';
```

서버 관리자가 `/app/env/db-observer.cnf`를 다음 형식으로 만들고 실행 사용자 소유 및 `chmod 600`을 적용한다. 비밀번호를 명령행 인자로 전달하지 않는다.

```ini
[client]
host=127.0.0.1
port=3306
protocol=tcp
user=caskbycask_observer
password=CHANGE_ME
```

## 후보 수집

```bash
cd /app
DB_AUDIT_CONFIG_FILE=/app/env/db-observer.cnf \
DB_NAME=caskbycask_prod \
DIGEST_LIMIT=30 \
bash /app/scripts/collect-db-query-candidates.sh
```

접속은 기본 5초, 전체 MariaDB 명령은 기본 20초 후 종료된다. 필요 시 1~60초의 `DB_CONNECT_TIMEOUT_SECONDS`, 1~120초의 `DB_AUDIT_TIMEOUT_SECONDS`를 일회성으로 지정할 수 있다.

출력은 터미널에서 검토하고 저장해야 한다면 접근 제한 디렉터리에만 저장한다. Git, Slack, 공개 이슈에 붙이지 않는다. 현재 필터는 `SELECT`로 시작하는 digest만 대상으로 하므로 `WITH`로 시작하는 CTE는 포함하지 않는다.

우선순위는 다음 순서로 판단한다.

1. `total_seconds`가 크고 최근에도 반복되는 쿼리
2. `rows_examined_per_execution` 대비 `rows_sent_per_execution` 비율이 큰 쿼리
3. `executions_without_index` 또는 `executions_without_good_index`가 반복되는 쿼리
4. 호출 횟수만 많고 개별 응답이 빠른 쿼리는 캐시·호출 구조를 먼저 검토

digest의 `?` 자리에는 값을 넣지 않은 채 실행할 수 없다. 실제 후보 SQL은 애플리케이션 코드에서 찾아 테스트/복제 DB에서 먼저 `EXPLAIN FORMAT=JSON SELECT ...`로 확인한다. 운영에서 EXPLAIN이 꼭 필요하면 읽기 전용 계정과 대표 상수값을 사용하고 한 쿼리씩 수행한다.

## 인덱스 변경 게이트

인덱스가 필요하다고 판단되면 다음을 모두 충족한 뒤 별도 Step으로 진행한다.

- QueryDSL/JPA 쿼리와 실제 where/join/order 조건 확인
- 기존 복합 인덱스의 선두 컬럼과 중복 여부 확인
- 테스트 또는 복제 DB의 EXPLAIN 비교
- Flyway 신규 마이그레이션 작성(기존 migration 수정 금지)
- 운영 쓰기 부하와 잠금 위험을 고려한 배포 창 확보
- 변경 전후 응답시간 및 DB 지표 비교와 롤백 기준 수립

이번 Step에서는 운영 측정 자료가 없으므로 DB 인덱스나 Flyway migration을 추가하지 않는다.
