# CaskByCask 배포 파이프라인 (GitHub Actions + /app)

> 빌드는 GitHub 호스팅 러너에서, 서버에는 **산출물(jar/dist)만** 전송하는 수동 배포.
> Jenkins/Docker 미사용. DB 마이그레이션(Flyway) 등 운영 SQL 절차는 [../deploy.md](../deploy.md) 참고.
> GitHub Actions 장애 시 대체 수동 배포는 [local/README.md](local/README.md) 참고.

---

## 1. 개요

```
main push (코드만)
   │   ← 사용자가 Actions 탭에서 "Run workflow" 클릭 (수동)
   │     target 선택: both(FE+BE) / api / web / crawler / all(전체)
   ▼
GitHub Actions — 대상 잡만 실행, 나머지는 skipped
   ├─ build-api (Ubuntu 24.04 x64) : clean test bootJar → app.jar ➔ Oracle Object Storage 업로드
   ├─ build-web (Ubuntu 24.04 ARM64) : npm ci + cache test + typecheck + standalone build → dist.tar.gz ➔ Oracle Object Storage 업로드
   ├─ test-crawler (Ubuntu 24.04 ARM64/Python 3.12) : hash lock 설치 → compile + unit test
   └─ deploy    : 앱 아티팩트와 crawler 소스 묶음을 전송 ➔ 해당 교체 스크립트 실행
   ▼
서버 (Ubuntu 24.04 aarch64, Oracle Cloud 춘천)
   ├─ deploy-web.sh : dist 교체 → 재시작 → health → 실패 시 롤백
   ├─ deploy-api.sh : jar 교체 → 재시작 → 헬스체크 → 실패 시 롤백
   └─ deploy-crawler.sh : 릴리스별 venv 설치·테스트 → 실행 lock/cron 확인 → current/previous 교체
```

- **아티팩트 저장소**: Github Private Repo의 아티팩트 저장 공간 한계(Artifact storage quota) 문제를 해결하기 위해, 빌드된 아티팩트를 **Oracle Object Storage(S3 호환 API)**에 업로드하여 임시 보관합니다.
- **버킷 용량 관리**: 10GB 무료 버킷의 공간 효율성을 위해, `api`와 `web` 빌드 산출물은 **각각 최신 3개씩만 유지**하고 이전 파일은 자동 정리(cleanup)합니다.
- API/웹은 서버에서 빌드하지 않는다. 크롤러는 ARM gate를 통과한 Python 소스를 전송하고 서버에서
  hash lock으로 릴리스별 `.venv`를 설치한다. 실패하면 `current`를 교체하지 않는다.
- API JAR는 JVM 바이트코드이므로 x64 러너에서 빌드한다. Next.js standalone은 네이티브 모듈을
  포함할 수 있으므로 운영 서버와 같은 ARM64 러너에서 빌드한다.
- 외부 Actions는 커밋 SHA로 고정하고 워크플로 기본 권한은 `contents: read`만 부여한다.
- 실행 시작 시 입력한 branch/tag를 하나의 immutable commit SHA로 확정하고 API·Web·crawler 테스트와
  실제 패키징이 모두 같은 커밋만 사용한다.

---

## 2. 서버 디렉토리 구조

```
/app/
├─ spring-boot/
│  ├─ app.jar                  ← 운영 (systemd 가 실행)
│  ├─ app.jar.new              ← 배포 중 staging (Actions 전송)
│  └─ app.jar_<타임스탬프>      ← 직전 백업 1개 (다음 배포 때 삭제)
├─ next/
│  ├─ dist/                    ← 운영 (.next/standalone 및 public 등, systemd가 실행)
│  ├─ dist.new/                ← 배포 중 staging
│  └─ dist_<타임스탬프>/        ← 직전 백업 1개
├─ caskbycask-crawler/
│  ├─ current -> releases/...  ← 현재 크롤러 릴리스
│  ├─ previous -> releases/... ← 직전 롤백 대상
│  ├─ releases/.../.venv        ← 코드와 함께 전환되는 릴리스별 의존성
│  ├─ .env / targets.json / *.db ← 배포 시 보존
│  └─ logs/ temp/              ← 배포 시 보존
├─ upload/                     ← 영속 (이미지·동영상) — 배포와 무관, 절대 삭제 안 함
├─ db_backup/                  ← 영속 (DB 덤프, 일배치 gzip / 3일 보관)
├─ logs/                       ← jar 로그 (logback) — 매일 자정 롤오버→gzip(archived/) / 30일 보관
│  ├─ caskbycask-api.log       ← 현재 로그 (uncompressed)
│  ├─ caskbycask-api-error.log ← ERROR 전용
│  └─ archived/*.log.gz        ← 일별 압축 보관
├─ env/
│  ├─ api.env                  ← 앱 비밀값 (chmod 600, git/GitHub 에 없음)
│  └─ backup.env               ← 외부 백업 전용 키·확인값(선택, chmod 600)
└─ scripts/
   ├─ deploy-api.sh            ← Actions 가 매 배포 시 갱신
   ├─ deploy-web.sh
   ├─ deploy-crawler.sh
   ├─ backup-db.sh             ← DB 로컬 백업 (cron 03:00)
   ├─ backup-offsite.sh        ← OCI Object Storage 복제(opt-in)
   └─ restore-offsite-drill.sh ← 격리 호스트 전용 복원 검증

nginx:  /etc/nginx/sites-available/caskbycask.conf  (동적 경로 → Next.js 127.0.0.1:3000, 정적 자원 직접 서빙)
ssl:    /etc/nginx/ssl/caskbycask.net.{pem,key}     (Cloudflare Origin Cert)
systemd: /etc/systemd/system/caskbycask-api.service (app 127.0.0.1:8080, actuator 8081)
         /etc/systemd/system/caskbycask-web.service (Next.js 127.0.0.1:3000)
```

**버전 보관 정책:** 
- **운영 서버**: 항상 `current + previous` 2개만 유지. 새 배포 시 가장 오래된 백업 삭제 → 직전 운영본 백업 → 신규 운영.
- **Oracle Object Storage**: 빌드 이력 관리를 위해 `api/` 및 `web/` 경로 각각 **최신 아티팩트 3개만 보관**하고 이전 아티팩트는 업로드 직후 자동 삭제 처리.

---

## 3. 포트 / 네트워크

| 대상 | 바인딩 | 외부 노출 |
|---|---|---|
| nginx | 80, 443 | ✅ (Cloudflare 경유) |
| Spring Boot | 127.0.0.1:8080 | ❌ |
| Actuator | 127.0.0.1:8081 | ❌ (nginx 에서 /actuator 404) |
| MariaDB | 127.0.0.1:3306 | ❌ |
| Redis | 127.0.0.1:6379 | ❌ |

방화벽은 **2군데** 다 열어야 함:
1. **Oracle 콘솔 Security List(Ingress)**: 443(권장: Cloudflare 대역만), 80, 22(내 IP)
2. **인스턴스 iptables**: 80/443 ACCEPT + `netfilter-persistent save` ([setup-server.md](server/setup-server.md) 10단계)

---

## 4. 최초 1회 셋업

서버에서 **명령어를 직접 한 줄씩 입력**하며 진행한다 (자동 스크립트 미사용).
전체 단계는 **[server/setup-server.md](server/setup-server.md)** 참고. 요약:

1. 패키지 설치(JRE21/nginx/mariadb/redis/rsync/iptables-persistent)
2. `/app` 디렉토리 구조 + `chown -R ubuntu:ubuntu`
3. MariaDB/Redis 127.0.0.1 바인딩
4. `mysql_secure_installation` + `caskbycask_prod` DB / `caskbycask` 계정 생성
5. Redis `requirepass` 설정
6. `/app/env/api.env` 작성 (`deploy/env/api.env.example` 복사 후 값 채우고 chmod 600)
7. systemd 유닛 + nginx 설정 + Cloudflare Origin Cert 배치 → `nginx -t && systemctl reload nginx`
8. 배포 유저 무암호 sudo + iptables 80/443
9. DB 백업 스크립트 + cron 등록
10. Oracle Security List + Cloudflare DNS(A, Proxied) + SSL/TLS Full(strict)
11. 첫 배포(아래) 후 `sudo systemctl enable --now caskbycask-api`

---

## 5. GitHub Secrets (배포 및 OCI 연동 정보)

| Secret | 설명 |
|---|---|
| `SSH_HOST` | 서버 공인 IP (또는 Cloudflare 미프록시 직결 주소) |
| `SSH_USER` | 배포 유저 (예: `ubuntu`) |
| `SSH_KEY` | 배포용 SSH 개인키 전체 |
| `SSH_PORT` | (선택) SSH 포트, 미설정 시 22 |
| `OCI_S3_ACCESS_KEY_ID` | Oracle Object Storage S3 호환 Access Key ID |
| `OCI_S3_SECRET_ACCESS_KEY` | Oracle Object Storage S3 호환 Secret Access Key |
| `OCI_NAMESPACE` | Oracle Cloud Object Storage Namespace |
| `OCI_BUCKET` | 아티팩트를 보관할 버킷 이름 (예: `caskbycask-artifacts`) |
| `SLACK_WEBHOOK_URL` | (선택) Actions 배포 결과 Slack 알림 webhook |

> DB 비번/JWT/Gemini 등 **앱 비밀값은 GitHub 에 두지 않는다.** 서버 환경 파일에만 존재.

---

## 6. 평소 배포 (수동)

1. 코드 `main` 에 push
2. GitHub → **Actions → "Deploy (manual)" → Run workflow** (사용자 적은 시간대 권장)
   - **`target` 선택**: `both`(FE+BE, 기본) / `api` / `web` / `crawler` / `all`(전체)
3. 선택한 대상만 빌드/검증 → deploy 잡이 통과한 산출물만 전송 + 교체 (나머지 잡은 `skipped`)
   - crawler/all은 운영과 같은 ARM64/Python 3.12에서 lock hash 설치와 전체 테스트를 먼저 통과해야 한다.
   - deploy 잡은 운영 스크립트 테스트, API/Web 실패·롤백 상태 전이 테스트, nginx location별 보안 헤더 상속 정적 검사를 수행한다.
4. API/Web은 신규 재시작과 로컬 health를 통과해야 성공한다. 실패 시 직전 파일을 복원하고 구버전 재시작+health까지 검증한다. 복구돼도 해당 배포는 실패로 기록하며, 구버전 검증 실패 시 수동 조치가 필요하다.
   - 서비스별 `.deploy.lock`은 교체·재시작 구간의 동시 실행을 거절한다. staging 업로드는 잠금 밖이므로 Actions와 로컬 수동 배포를 동시에 시작하지 않는다.
   - health 요청은 connect 1초·요청 2초, 단계별 총 API 120초·Web 15초 제한을 적용하고, 검증 전 교체 구간의 HUP/INT/TERM·예기치 않은 종료도 롤백한다.

> 프론트만 고쳤으면 `web`, 백엔드만 고쳤으면 `api`, 크롤러만 고쳤으면 `crawler`를 선택한다.

---

## 7. GitHub Actions 장애 시 대체 수동 배포

비상 시에는 로컬 PC에서 `deploy/local/manual-deploy.ps1`을 실행한다.

```powershell
.\deploy\local\manual-deploy.ps1 `
  -Target both `
  -HostName CHANGE_ME_SERVER_IP `
  -User CHANGE_ME_SSH_USER `
  -Port CHANGE_ME_SSH_PORT `
  -KeyPath "$env:USERPROFILE\.ssh\CHANGE_ME_KEY"
```

흐름:

```
로컬 PC
   ├─ API: bootJar 빌드 → app.jar 업로드
   └─ WEB: 소스 tar.gz 업로드
       ↓
운영 서버
   ├─ WEB: /app/manual-build 에서 npm ci + npm run build
   ├─ /app/next/dist.new 준비
   ├─ deploy-web.sh 실행
   └─ deploy-api.sh 실행
```

- WEB은 기본적으로 서버에서 빌드한다. Next.js standalone에는 OS/CPU별 네이티브 의존성이 포함될 수 있어 Windows 산출물을 Ubuntu aarch64 운영 서버에 그대로 올리는 것을 피한다.
- 서버의 최종 교체/재시작/헬스체크/롤백은 평소 배포와 같은 `/app/scripts/deploy-web.sh`, `/app/scripts/deploy-api.sh`를 사용한다.
- 이 경로는 Oracle Object Storage 아티팩트와 Actions Slack 결과 알림을 남기지 않는다. 배포 후 `/app/scripts/status.sh`로 직접 확인한다.

상세 옵션은 [local/README.md](local/README.md)를 따른다.

---

## 8. 롤백 (수동)

자동 롤백은 "직전 배포가 안 뜰 때" 동작한다. 운영 중 수동 롤백:

```bash
# 백엔드 — 현재 실패본 보존
(
set -euo pipefail
cd /app/spring-boot
flock -n 8 || { echo 'API 자동/수동 배포가 진행 중입니다. 먼저 해당 작업을 종료하세요.' >&2; exit 1; }
sudo systemctl stop caskbycask-api
mv app.jar "app.jar.manual_failed_$(date +%Y%m%d-%H%M%S)"
mv app.jar_<타임스탬프> app.jar          # 직전 백업으로 복귀
sudo systemctl start caskbycask-api
for i in $(seq 1 60); do
  curl --connect-timeout 1 --max-time 2 -fsS \
    http://127.0.0.1:8081/actuator/health/readiness \
    | grep -q '"status":"UP"' && break
  sleep 2
done
curl --connect-timeout 1 --max-time 2 -fsS \
  http://127.0.0.1:8081/actuator/health/readiness | grep '"status":"UP"'
) 8>/app/spring-boot/.deploy.lock

# 프론트 — 현재 실패본 보존
(
set -euo pipefail
cd /app/next
flock -n 9 || { echo 'Web 자동/수동 배포가 진행 중입니다. 먼저 해당 작업을 종료하세요.' >&2; exit 1; }
mv dist "dist_manual_failed_$(date +%Y%m%d-%H%M%S)"
mv dist_<타임스탬프> dist
sudo systemctl restart caskbycask-web
for i in $(seq 1 15); do
  curl --connect-timeout 1 --max-time 2 -fsS \
    http://127.0.0.1:3000/healthz >/dev/null && break
  sleep 1
done
curl --connect-timeout 1 --max-time 2 -fsS http://127.0.0.1:3000/healthz
) 9>/app/next/.deploy.lock
```

> 보관본이 1개(직전)뿐이므로 더 과거로의 롤백은 해당 커밋을 다시 빌드/배포해야 한다.
> 수동 롤백도 staging 업로드 중인 Actions/로컬 배포와 동시에 실행하지 않는다. `.deploy.lock`은 업로드 중인 고정 staging 파일까지 보호하지 않는다.

---

## 9. 로그 / 백업 정책

### 로그
- jar 은 systemd 가 관리하는 **서비스**로 실행된다 (`java -jar &` 같은 백그라운드 실행 아님).
  - stdout/stderr → journald (`journalctl -u caskbycask-api -f`)
  - 애플리케이션 로그 → **logback 이 파일로 직접 출력**: `LOG_PATH=/app/logs`
- 정책 (logback-spring.xml, prod):
  - 현재 로그: `/app/logs/caskbycask-api.log` (+ ERROR 전용 `caskbycask-api-error.log`)
  - **매일 자정(또는 100MB 초과) 롤오버 → `/app/logs/archived/...log.gz` 로 gzip 압축**
  - 보관: 일반 로그 **30일**, ERROR 로그 90일(장애 분석용). 총량 캡(10GB/5GB)
  - → 별도 logrotate 불필요 (앱이 자체 처리)

### DB 백업
- `/app/scripts/backup-db.sh` 가 **매일 03:00(cron)** 실행:
  - 공통 `flock`으로 중복 실행을 막고 DB 비밀번호는 휘발성 권한 600 option file로만 전달
  - `caskbycask_prod` 를 mariadb-dump(단일 트랜잭션) → 임시 gzip 무결성 검사 → 원자적 이동
  - **3일 초과 자동 삭제**, 실패/성공 시 Slack 알림(설정 시)
- cron 은 셋업 시 배포 유저 crontab 에 등록하고 백업 로그에는 logrotate를 적용한다([setup-server.md](server/setup-server.md) 11단계). 수동 실행: `/app/scripts/backup-db.sh`
- 복원: `gunzip < /app/db_backup/<파일>.sql.gz | mariadb -u caskbycask -p caskbycask_prod`
- 인스턴스·볼륨 장애 대비 외부 복제와 월간 임시 DB 복원 훈련은
  [`BACKUP-RESTORE.md`](BACKUP-RESTORE.md)의 opt-in 절차를 사용한다. 버킷 versioning/lifecycle,
  전용 키, 로컬·원격 sentinel을 확인하기 전에는 `backup-offsite.sh`를 예약 실행하지 않는다.
  복원 훈련은 운영 MariaDB가 아닌 disposable 격리 호스트에서만 실행한다.

> 로컬 DB 백업과 `upload/`는 같은 디스크이므로 외부 백업을 활성화하기 전에는 재해 복구가 완성된 상태가 아니다.
