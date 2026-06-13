# CaskByCask 배포 가이드

## 디렉토리 구조

```
caskbycask/
├── docker-compose.yml         # 공통 서비스 정의
├── docker-compose.dev.yml     # NAS 개발 환경 오버라이드
├── docker-compose.prod.yml    # Oracle Cloud 운영 오버라이드
├── .env.dev.example           # dev 환경변수 템플릿
├── .env.prod.example          # prod 환경변수 템플릿
├── caskbycask-api/Dockerfile  # 백엔드 (Spring Boot)
├── caskbycask-web/Dockerfile  # 프론트엔드 (Vite + Nginx)
└── deploy/
    ├── deploy.sh              # 배포 (빌드 + 기동 + 헬스체크)
    ├── maintenance.sh         # 점검 모드 on/off
    └── backup.sh              # DB 백업 (GFS 정책)
```

## 최초 배포 절차

### 1. 환경변수 준비

```bash
cp .env.prod.example .env.prod
# .env.prod 편집 — CHANGE_ME 항목 모두 채우기
#   특히 JWT_SECRET 은 openssl rand -base64 48 로 새로 생성
```

### 2. DB baseline 스키마 준비

Flyway 가 운영 DB 의 스키마를 자동 생성하도록, `caskbycask-api/src/main/resources/db/migration/V1__init_baseline.sql` 을
실제 스키마 dump 로 교체 후 commit:

```bash
mariadb-dump -h $DEV_DB_HOST -u $DB_USERNAME -p \
    --no-data --skip-comments --skip-add-drop-table \
    caskbycask_dev > caskbycask-api/src/main/resources/db/migration/V1__init_baseline.sql
git add . && git commit -m "feat: V1 baseline schema for Flyway"
```

### 3. 배포

```bash
./deploy/deploy.sh prod
```

스크립트가 자동으로:
1. `git pull` (변경 사항 가져오기)
2. 이미지 빌드 (Gradle bootJar + Vite build + Nginx 패키징)
3. API + Web 기동, readiness probe 대기 (DB/Redis 는 호스트 서비스 사용)
4. dangling 이미지 정리

### 4. Cloudflare DNS / SSL

- `caskbycask.net` A 레코드 → Oracle Cloud Public IP
- Cloudflare SSL 모드: **Full (Strict)** 권장 (서버에 자체 인증서 필요)
- Cloudflare SSL 모드: **Full** 도 가능 (자체 서명 인증서) — 운영 초기에는 이걸로 시작
- Cloudflare 보안: Bot Fight Mode, Security Level: Medium

## 점검 모드

배포 중 또는 긴급 장애 시:

```bash
./deploy/maintenance.sh prod on   # 점검 페이지 503
# ... 작업 ...
./deploy/maintenance.sh prod off  # 정상 복귀
```

3~5초 다운타임 발생 (web 컨테이너 재시작). API/DB 는 영향 없음.

## DB 백업

수동 실행:
```bash
./deploy/backup.sh prod
```

자동 (crontab):
```cron
0 3 * * * /home/ubuntu/app/caskbycask/deploy/backup.sh prod >> /var/log/caskbycask-backup.log 2>&1
```

보관 정책:
- 일간 7개 (daily/)
- 주간 4개 (weekly/, 매 일요일)
- 월간 6개 (monthly/, 매 1일)

Oracle Object Storage 업로드는 `oci` CLI 설치 + `OCI_BUCKET` 환경변수 설정 시 자동.

## 롤백

```bash
git checkout <previous-commit>
./deploy/deploy.sh prod
```

또는 이전 이미지 태그로:
```bash
IMAGE_TAG=<previous-tag> docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## JWT 키 회전

운영 키 노출 의심 또는 정기 회전 (권장: 6개월):

```bash
# 1. 새 키 발급
NEW_SECRET=$(openssl rand -base64 48)

# 2. .env.prod 수정
#    JWT_SECRET_PREVIOUS=<기존 JWT_SECRET 값>
#    JWT_SECRET=<NEW_SECRET>

# 3. API 컨테이너 재시작
docker compose --env-file .env.prod -f docker-compose.yml -f docker-compose.prod.yml \
    up -d --force-recreate --no-deps api

# 4. 7일(Refresh Token TTL) 후 JWT_SECRET_PREVIOUS 제거하고 다시 재시작
```

기존에 발급된 모든 토큰은 7일 동안 유효 → 점진적 회전 → 무중단.

## 헬스체크 / 모니터링

- API liveness:  `http://localhost:8080/actuator/health/liveness` (컨테이너 내부)
- API readiness: `http://localhost:8081/actuator/health/readiness` (관리 포트)
- Web nginx:     `http://localhost:80/healthz`
- Prometheus:    `http://localhost:8081/actuator/prometheus` (Phase 4a)

## 트러블슈팅

### Flyway validation 실패
```
docker compose exec api ls -la /var/caskbycask/logs
docker logs di-prod-api | grep -i flyway
```
체크섬 불일치는 운영 DB 에 적용된 V*.sql 을 변경한 경우. 절대 적용된 마이그레이션은 수정 금지.

### Rate Limit 오인 차단
호스트 Redis 에 직접 접속:
```
redis-cli -a $REDIS_PASSWORD keys 'rl:*'
redis-cli -a $REDIS_PASSWORD del rl:login:ip:xxx.xxx.xxx.xxx
```

### 로그 위치
- API 컨테이너 내부: `/var/caskbycask/logs/caskbycask-api.log`
- Docker volume: `docker volume inspect caskbycask_logs`
- 호스트 마운트로 변경하려면 `docker-compose.{env}.yml` 에 bind mount 추가
