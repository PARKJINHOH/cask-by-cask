# CaskByCask 운영 가이드

> 위스키·와인·꼬냑 주류 리뷰 커뮤니티(caskbycask.net) 운영 매뉴얼.
> 배포 / 점검 / 관리자 우회 / 서버 중지 / 백업·복원 / 장애 대응을 한 곳에 정리한다.
> 🔒 `CHANGE_ME` 로 표시된 값(서버 IP, 비밀번호 등)은 운영자가 직접 채운다. **이 문서에 실제 비밀값을 적지 말 것.**

---

## 0. 한눈에 보기 (요약 정보)

| 항목 | 값 |
|---|---|
| 사이트 | https://caskbycask.net |
| 서버 | Oracle Cloud Infrastructure · 대한민국 춘천 리전 (Ubuntu 24.04 aarch64) |
| 서버 공인 IP | `CHANGE_ME_SERVER_IP` |
| SSH 접속 유저 | `CHANGE_ME_SSH_USER` (예: ubuntu) |
| SSH 포트 | `CHANGE_ME_SSH_PORT` (기본 22) |
| CDN/DNS | Cloudflare (Proxied, SSL Full strict) |
| 이메일 | Gmail SMTP (drinkindex.cs@gmail.com) |
| 운영자 / 개인정보 보호책임자 | 박진호 |
| 운영 알림 | Slack `#server-prd` (선택) — 상세는 15장 |

**서버 구성**: nginx(정적 SPA + `/api` 리버스 프록시) → Spring Boot(127.0.0.1:8080) → MariaDB / Redis (모두 같은 서버 localhost)

---

## 1. 서버 접속

```bash
ssh -p CHANGE_ME_SSH_PORT CHANGE_ME_SSH_USER@CHANGE_ME_SERVER_IP
```

> SSH 키가 없으면 접속 불가. 키 분실 시 Oracle Cloud 콘솔에서 인스턴스 콘솔 접속으로 복구.

### 서버 디렉토리 구조

```
/app/
├─ spring-boot/        백엔드 jar (운영 app.jar + 직전 백업 1개)
├─ next/
│  ├─ dist/            프론트 운영본 (Next.js standalone Node 서버 구동)
│  ├─ maintenance.html 점검 페이지 (dist 와 분리 → 배포에 안 지워짐)
│  └─ maintenance.on   점검 플래그 (있으면 점검 모드) ← maintenance.sh 가 토글
├─ upload/             업로드 이미지·동영상 (영속, 절대 삭제 금지)
├─ db_backup/          DB 덤프 (일배치 gzip / 3일 보관)
├─ logs/               앱 로그 (logback, 30일 보관)
├─ env/api.env         앱 비밀값 (chmod 600, git 에 없음)
└─ scripts/            운영 스크립트 (배포·중지·점검·백업)

nginx:   /etc/nginx/sites-available/caskbycask.conf
systemd: /etc/systemd/system/caskbycask-api.service
         /etc/systemd/system/caskbycask-web.service
```

| 대상 | 포트 | 외부 노출 |
|---|---|---|
| nginx | 80, 443 | ✅ (Cloudflare 경유) |
| Spring Boot | 127.0.0.1:8080 | ❌ |
| Actuator | 127.0.0.1:8081 | ❌ |
| MariaDB | 127.0.0.1:3306 | ❌ |
| Redis | 127.0.0.1:6379 | ❌ |

---

## 2. 배포 방법 (GitHub Actions 수동 배포)

빌드는 GitHub 러너에서 수행하고, 서버에는 **산출물(jar/dist)만** 전송한다. 서버는 빌드하지 않는다.

### 절차

1. 변경 코드를 `main` 브랜치에 push
2. GitHub → **Actions** 탭 → **"Deploy (manual)"** → **Run workflow** 클릭
   - **`target` 드롭다운으로 배포 대상 선택** — `both`(FE+BE, 기본) / `api`(백엔드만) / `web`(프론트만)
   - `ref` 입력란 비워두면 `main` 배포 (기본값)
   - 🕐 **사용자 적은 시간대 권장**
3. 자동 진행 (대상에 해당하는 잡만 실행, 나머지는 `skipped`):
   - `build-api` (gradle bootJar) · `build-web` (Next.js Standalone Build) — 대상이면 병렬 빌드
   - `deploy` 잡이 빌드된 산출물만 서버로 전송 → 해당 교체 스크립트 실행
   - both 일 때: 프론트 먼저 교체(Next.js 서비스 재시작) → 백엔드 jar 교체 → 재시작 → **readiness 헬스체크**
4. 백엔드 배포 시 헬스체크 통과해야 성공. **실패하면 자동으로 직전 버전으로 롤백.**
5. 완료 시 **Slack `#server-prd` 로 결과 통보**(BE·FE·배포 단계별, `SLACK_WEBHOOK_URL` Secret 설정 시).
   - 배포 안 한 쪽은 `⏭`(skipped) 로 표시 — 예: `백엔드 ⏭ · 프론트 ✅` (web 만 배포). 요약에 대상(`· web`)도 표기됨.

### 배포가 전송하는 것 / 안 하는 것

| 자동 전송됨 (매 배포) | 자동 전송 안 됨 (수동 관리) |
|---|---|
| `app.jar` (백엔드) | nginx 설정 (`caskbycask.conf`) |
| `dist/` (프론트) | 점검 페이지 (`maintenance.html`) |
| 운영 스크립트 전체 (`deploy/server/*.sh`) | systemd 유닛 (`caskbycask-api.service`) |
| | `api.env` (비밀값) |

> ⚠️ **nginx 설정·점검 페이지를 변경했다면 배포만으로는 반영되지 않는다.** 아래 8장 참고하여 수동 적용한다.
> (운영 스크립트 `deploy/server/*.sh` 는 배포가 `/app/scripts` 로 자동 전송하므로 수동 복사 불필요.)

### GitHub Secrets

배포(SSH) 접속 정보 + (선택) 배포 결과 Slack 알림용 webhook. 앱 비밀값(DB/JWT 등)은 서버 `api.env` 에만 둔다.

| Secret | 값 |
|---|---|
| `SSH_HOST` | `CHANGE_ME_SERVER_IP` |
| `SSH_USER` | `CHANGE_ME_SSH_USER` |
| `SSH_KEY` | 배포용 SSH 개인키 전체 |
| `SSH_PORT` | `CHANGE_ME_SSH_PORT` (선택) |
| `SLACK_WEBHOOK_URL` | 배포 결과 알림용 webhook (선택, 서버 `api.env` 와 동일 URL). 미설정 시 알림만 건너뜀 |

### GitHub Actions 장애 시 로컬 PC 수동 배포

GitHub Actions 자체 장애나 GitHub 접속 문제로 워크플로를 실행할 수 없을 때만 사용한다. 절차와 옵션은 [local/README.md](local/README.md)를 기준으로 한다.

```powershell
.\deploy\local\manual-deploy.ps1 `
  -Target both `
  -HostName CHANGE_ME_SERVER_IP `
  -User CHANGE_ME_SSH_USER `
  -Port CHANGE_ME_SSH_PORT `
  -KeyPath "$env:USERPROFILE\.ssh\CHANGE_ME_KEY"
```

- API: 로컬 PC에서 `bootJar` 빌드 → `/app/spring-boot/app.jar.new` 업로드 → `/app/scripts/deploy-api.sh` 실행.
- WEB: 기본값은 서버 remote 빌드다. 로컬 PC가 소스를 서버 임시 디렉토리(`/app/manual-build`)로 올리고, 서버에서 `npm ci && npm run build` 후 `/app/next/dist.new`를 만든다.
- 최종 교체/재시작/헬스체크/롤백은 기존 서버 스크립트가 담당한다.
- Windows에서 만든 Next.js standalone 산출물을 그대로 운영 Ubuntu aarch64 서버에 올리는 방식은 네이티브 의존성(`sharp`, `@next/swc`) 때문에 기본 금지다. 정말 필요하면 `-WebBuildMode local -AllowCrossPlatformWebBuild`를 명시한다.
- 이 경로는 Actions 아티팩트/Slack 배포 결과 이력이 남지 않는다. 배포 후 `/app/scripts/status.sh`와 각 헬스체크를 직접 확인한다.

---

## 3. 서버 점검 모드 (권장)

서비스를 살려둔 채 방문자에게 **점검 페이지(HTTP 503)** 를 보여주는 모드. nginx 가 점검 플래그 파일을 **요청마다 검사**하므로 reload·sudo 가 필요 없고 즉시 반영된다. 헬스체크(`/healthz`)는 점검 중에도 200 을 유지해 모니터링 오탐을 막는다.

```bash
cd /app/scripts

./maintenance.sh on        # 점검 시작 → 방문자에게 점검 페이지, API 는 JSON 503
./maintenance.sh status    # 현재 상태 확인
./maintenance.sh off       # 정상 복귀 (즉시 반영)
```

- **점검 중 동작**: 일반 방문자(SPA) → 점검 페이지 / API 호출 → `{"success":false,"code":"SERVER_MAINTENANCE",...}` 503
- 점검 페이지는 60초마다 자동 새로고침 → 점검 종료 시 방문자 화면이 자동 복귀
- 점검 페이지 문구·디자인 수정: `deploy/nginx/maintenance.html` → 서버 `/app/next/maintenance.html` 교체

> 💡 **점검 시 `stop-web.sh`(nginx 중지)보다 `maintenance.sh on` 을 권장.** nginx 를 살려두므로 안내 페이지가 뜨고 헬스체크도 정상 유지된다.

---

## 4. 관리자 우회 (점검 중 본인만 정상 접근)

점검 중에도 관리자 본인은 정상 화면으로 작업할 수 있다. **시크릿 토큰 쿠키 방식** — IP 가 바뀌어도(집/모바일/외부망) 쿠키만 있으면 우회된다.

### 시크릿 설정 / 교체

`caskbycask.conf` 에는 관리자 우회용 시크릿이 3곳 있다: 쿠키 검사 `if`, 발급 `location` 경로, `Set-Cookie` 값. **git 에는 자리표시자 그대로 두고**, 서버에 배치한 conf 에서만 실제 값으로 교체한다.

일반적으로는 직접 치환하지 않고 `maintenance.sh on` 을 사용한다. 스크립트가 새 시크릿을 생성하고, Nginx 설정 3곳에 적용한 뒤 reload 하며, 현재 유효한 우회 URL 을 출력한다. `/app/next/.maintenance_secret` 파일이 conf 와 어긋난 경우에도 conf 의 3곳을 직접 갱신한다.

```bash
cd /app/scripts
./maintenance.sh on
./maintenance.sh status
```

→ 출력된 **우회 URL 을 안전한 곳(비밀번호 관리자 등)에 보관**한다.

### 점검 중 우회하기

1. 점검 중에 위 우회 URL 을 브라우저로 **1회 방문** → `cbc_maint` 쿠키 발급(유효 24시간) → 홈으로 리다이렉트
2. 이후 점검이 켜져 있어도 그 브라우저에서는 정상 화면으로 접근
3. 쿠키 만료(24h) 또는 시크릿 교체 시 우회 URL 을 다시 방문

> 🔒 우회 URL 은 사실상 비밀번호다. 외부 공유 금지. 유출 의심 시 위 절차로 시크릿을 재생성(SECRET 새로 발급)하면 기존 쿠키는 모두 무효화된다.

---

## 5. 서버 중지 / 시작 / 재시작

### 백엔드만 중지 (점검 없이 완전 중단)

```bash
cd /app/scripts
./stop-api.sh                          # 중지
sudo systemctl start caskbycask-api    # 다시 시작
sudo systemctl restart caskbycask-api  # 재시작
sudo systemctl status caskbycask-api   # 상태 확인
```

### 전체 중단 (nginx 까지 — 점검 페이지조차 안 뜸)

```bash
cd /app/scripts
./stop-web.sh                  # nginx 중지 ⚠️ 프론트 + /api 프록시 모두 내려감
sudo systemctl start nginx     # 다시 시작
```

> ⚠️ `stop-web.sh` 는 사이트가 **완전히 응답 불가**가 된다(헬스체크 포함). 일반 점검에는 3장의 `maintenance.sh on` 을 사용하고, `stop-web.sh` 는 긴급 차단 등 꼭 필요한 경우에만 사용.
>
> ⛔ **`stop-web.sh` 후 GitHub Actions 배포 시 Cloudflare 521 발생 주의.** `deploy-api.sh` 헬스체크는 nginx 를 거치지 않고 `127.0.0.1:8081` 관리 포트를 직접 조회하므로 배포는 "성공"으로 끝나지만 nginx 가 내려간 채로 남는다. 배포 전 nginx 상태 반드시 확인: `systemctl is-active nginx`

### 서버 재부팅 후

systemd 가 `caskbycask-api` 와 nginx 를 자동 기동한다(enable 되어 있음). 별도 조치 불필요. 확인:

```bash
curl -s http://127.0.0.1:8081/actuator/health   # {"status":"UP"} 기대
curl -s https://caskbycask.net/healthz           # ok 기대
```

---

## 6. 로그 확인

```bash
# 실시간 부팅/런타임 로그 (systemd journal)
journalctl -u caskbycask-api -f
journalctl -u caskbycask-api -n 100 --no-pager   # 최근 100줄

# 애플리케이션 로그 파일 (logback, /app/logs)
tail -f /app/logs/caskbycask-api.log
tail -f /app/logs/caskbycask-api-error.log        # ERROR 전용

# nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

- 앱 로그는 매일 자정 롤오버 → `/app/logs/archived/*.log.gz` 압축, 일반 30일 / ERROR 90일 보관 (별도 logrotate 불필요).

---

## 7. DB 백업 / 복원

### 자동 백업

`/app/scripts/backup-db.sh` 가 **매일 03:00(cron)** `caskbycask_prod` 를 gzip 덤프 → `/app/db_backup/` 에 저장, **3일 초과분 자동 삭제**. (Slack 설정 시 성공/실패 알림)

```bash
/app/scripts/backup-db.sh          # 수동 즉시 백업
ls -lh /app/db_backup/             # 백업 목록
```

### 복원

```bash
# 1) (권장) 점검 모드 켜고 백엔드 중지
cd /app/scripts && ./maintenance.sh on && ./stop-api.sh

# 2) 복원
gunzip < /app/db_backup/caskbycask_prod_<타임스탬프>.sql.gz \
  | mariadb -u CHANGE_ME_DB_USER -p caskbycask_prod
# 비밀번호 입력 프롬프트 → CHANGE_ME_DB_PASSWORD

# 3) 재기동 + 점검 해제
sudo systemctl start caskbycask-api && ./maintenance.sh off
```

> ⚠️ 백업은 **같은 디스크**에 쌓인다. 인스턴스 장애 대비 `db_backup/` 과 `upload/` 를 **외부(Oracle Object Storage 등)로 별도 복사** 권장.

---

### 운영 스냅샷으로 개발 DB 갱신

운영 데이터로 로컬/개발 테스트를 하고 싶을 때만 수동 실행한다. 운영 DB(`caskbycask_prod`)에는 `mariadb-dump` 읽기만 수행하고, 교체 대상은 개발 DB(`caskbycask_dev`)이다.

```bash
cd /app/scripts

# 대화형 확인 후 실행
./refresh-dev-db-from-prod.sh

# 비대화형 실행이 필요할 때만 사용
./refresh-dev-db-from-prod.sh --yes
```

동작 순서:

1. `caskbycask_prod` 를 단일 트랜잭션으로 dump
2. `caskbycask_dev_refresh_tmp` 임시 DB 생성 후 restore
3. 임시 DB에서 운영 계정/개인 테이블 데이터를 제거하고 공개 콘텐츠 작성자를 탈퇴 사용자로 재귀속
4. 기존 `caskbycask_dev` 를 `/app/db_backup/dev_refresh/` 에 백업
5. `caskbycask_dev` 를 drop/create 후 정리된 임시 DB로 교체

운영 계정 데이터는 개발 DB에 남기지 않는다. 공개 콘텐츠의 작성자는 `withdrawn@caskbycask.system` 으로 재귀속된다. 최고관리자는 이 스크립트가 직접 만들지 않고, API 재시작 시 `AdminDataInitializer` 가 `ADMIN_EMAIL` / `ADMIN_PASSWORD` 기반으로 생성한다.

권장 계정:

- `PROD_DB_READONLY_USERNAME` / `PROD_DB_READONLY_PASSWORD`: 운영 DB dump 전용 읽기 계정
- `DEV_REFRESH_DB_USERNAME` / `DEV_REFRESH_DB_PASSWORD`: `caskbycask_dev` 와 `caskbycask_dev_refresh_tmp` 를 create/drop/restore 할 수 있는 계정

예시:

```sql
CREATE USER 'caskbycask_prod_ro'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME_READONLY_PASSWORD';
GRANT SELECT, SHOW VIEW, TRIGGER, EVENT ON caskbycask_prod.* TO 'caskbycask_prod_ro'@'127.0.0.1';

CREATE USER 'caskbycask_dev_refresh'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME_REFRESH_PASSWORD';
GRANT ALL PRIVILEGES ON caskbycask_dev.* TO 'caskbycask_dev_refresh'@'127.0.0.1';
GRANT ALL PRIVILEGES ON caskbycask_dev_refresh_tmp.* TO 'caskbycask_dev_refresh'@'127.0.0.1';

FLUSH PRIVILEGES;
```

미설정 시 스크립트는 기존 `DB_USERNAME` / `DB_PASSWORD` 를 사용한다. 이 경우 해당 계정에 `caskbycask_dev` 교체 권한이 있어야 한다.

---

## 8. nginx 설정 / 운영 스크립트 변경 적용

운영 스크립트(`deploy/server/*.sh`)는 **배포(Actions)가 `/app/scripts` 로 자동 전송**한다.
nginx 설정·점검 페이지는 전송하지 않으므로 변경 시 아래처럼 수동 적용한다.

```bash
# 레포에서 서버로 파일 업로드 (예: ~/setup/ 경유, scp/FTP)
#   deploy/nginx/caskbycask.conf
#   deploy/nginx/maintenance.html
#   (운영 스크립트는 배포가 자동 전송 — 수동 복사 불필요)

# nginx 설정 교체
sudo cp ~/setup/caskbycask.conf /etc/nginx/sites-available/caskbycask.conf
# ↑ 4장의 우회 시크릿(sed) 다시 적용 필요 (덮어썼으므로)

# 점검 페이지 교체
sudo cp ~/setup/maintenance.html /app/next/maintenance.html
sudo chown CHANGE_ME_SSH_USER:CHANGE_ME_SSH_USER /app/next/maintenance.html

# 검증 후 reload (항상 nginx -t 먼저!)
sudo nginx -t && sudo systemctl reload nginx
```

> ⚠️ nginx 설정을 덮어쓰면 4장의 **우회 시크릿(sed 치환)이 자리표시자로 되돌아간다.** conf 교체 후 시크릿 sed 를 반드시 다시 실행할 것.

---

## 9. 비밀값 관리 (`/app/env/api.env`)

DB 비번·JWT·관리자 초기 계정·Gmail 앱 비번 등 앱 비밀값은 **서버에만** 존재한다 (git/GitHub 에 없음, `chmod 600`).

```bash
sudo nano /app/env/api.env          # 값 수정
sudo systemctl restart caskbycask-api   # 수정 후 재시작해야 반영
```

주요 항목 (실제 값은 서버 파일에만):

| 키 | 용도 |
|---|---|
| `DB_PASSWORD` | MariaDB 비밀번호 |
| `REDIS_PASSWORD` | Redis 비밀번호 |
| `JWT_SECRET` / `JWT_SECRET_PREVIOUS` | JWT 서명 키 (회전 시 PREVIOUS 에 구키) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | 최초 관리자 seed |
| `GMAIL_APP_PASSWORD` | 이메일 발송용 Gmail 앱 비번 |
| `CASKBYCASK_INTERNAL_KEY` | 크롤러 ↔ API 내부 인증 키 (크롤러 .env 와 동일값) |
| `OAUTH_TOKEN_ENCRYPTION_KEY` | 소셜 refresh token 암호화 키 (Base64 32B, `openssl rand -base64 32`). 분실 시 기존 연동의 자동 연결해지만 불가 |
| `OAUTH_ALLOWED_REDIRECT_URIS` | 소셜 콜백 화이트리스트 (예: `https://caskbycask.net/oauth/callback`). 제공자 콘솔 등록값과 동일 |
| `OAUTH_NAVER_CLIENT_ID` / `OAUTH_NAVER_CLIENT_SECRET` | 네이버 로그인 키 (네이버 개발자센터) |
| `OAUTH_GOOGLE_CLIENT_ID` / `OAUTH_GOOGLE_CLIENT_SECRET` | 구글 로그인 키 (Google Cloud Console) |
| `SLACK_WEBHOOK_URL` | (선택) 운영/백업 알림 |
| `PROD_DB_READONLY_USERNAME` / `PROD_DB_READONLY_PASSWORD` | (선택) 운영 스냅샷 dump 전용 읽기 계정 |
| `DEV_REFRESH_DB_USERNAME` / `DEV_REFRESH_DB_PASSWORD` | (선택) 운영 스냅샷을 `caskbycask_dev` 로 갱신할 때 사용하는 교체 권한 계정 |

> **소셜 로그인 제공자 콘솔 설정** — 네이버/구글 모두 **승인된 redirect URI** 에 `https://caskbycask.net/oauth/callback`
> (로컬 개발 시 `http://localhost:5173/oauth/callback`)을 등록해야 한다. 구글은 OAuth 동의 화면에 `openid`,`email`,`profile`
> 스코프가 필요하고, refresh token 수신을 위해 앱이 `access_type=offline` + `prompt=consent` 로 인가 요청한다(코드에 반영됨).
> 등록 redirect URI 가 `OAUTH_ALLOWED_REDIRECT_URIS` 와 다르면 콜백이 `OAUTH_008` 로 거부된다.

---

## 10. 롤백 (수동)

자동 롤백은 "직전 배포가 안 뜰 때"만 동작한다. 운영 중 직전 버전으로 수동 롤백:

```bash
# 백엔드
cd /app/spring-boot
sudo systemctl stop caskbycask-api
mv app.jar app.jar.bad
mv app.jar_<타임스탬프> app.jar       # 직전 백업으로 복귀
sudo systemctl start caskbycask-api

# 프론트
cd /app/next
rm -rf dist && mv dist_<타임스탬프> dist
sudo systemctl restart caskbycask-web
```

> 보관본은 직전 1개뿐. 더 과거로 가려면 해당 커밋을 다시 빌드/배포해야 한다.

---

## 11. 자주 쓰는 명령어 모음 (Cheat Sheet)

```bash
# 상태 점검 (한눈에)
/app/scripts/status.sh          # API + Web + 리소스 요약
/app/scripts/status.sh --log    # 위 + 최근 로그 20줄 추가 출력

# 개별 상태 점검
curl -s http://127.0.0.1:8081/actuator/health    # 백엔드 health
curl -s http://127.0.0.1:3000/healthz             # 프론트엔드 health
curl -s https://caskbycask.net/healthz            # 사이트 외부 health
systemctl status caskbycask-api caskbycask-web nginx mariadb redis-server

# 점검 모드
/app/scripts/maintenance.sh on|off|status

# 서비스 제어
sudo systemctl restart caskbycask-api    # 백엔드 재시작
sudo systemctl restart caskbycask-web    # 프론트엔드 재시작
sudo systemctl reload nginx              # nginx 무중단 리로드 (설정 변경 시)

# 로그
journalctl -u caskbycask-api -f
journalctl -u caskbycask-web -f
tail -f /app/logs/caskbycask-api-error.log

# DB 백업
/app/scripts/backup-db.sh

# 운영 스냅샷으로 개발 DB 갱신(caskbycask_prod -> caskbycask_dev, 마스킹 포함)
/app/scripts/refresh-dev-db-from-prod.sh

# 리소스 점검(디스크/SSL) 수동 실행
/app/scripts/check-resources.sh
```

---

## 12. 장애 대응 (트러블슈팅)

| 증상 | 점검 순서 |
|---|---|
| **Cloudflare 521** | nginx 다운 → `sudo systemctl start nginx`. 이후 `systemctl enable caskbycask-api` 로 enable 여부도 확인 |
| **521 — stop-web.sh 후 배포** | `stop-web.sh` 실행 후 Actions 배포 시 nginx 가 내려간 채 남음(헬스체크가 관리 포트 직접 조회라 배포는 성공 표시). `sudo systemctl start nginx` 로 복구 |
| 사이트 502/503 | ① `systemctl status caskbycask-api caskbycask-web` ② `journalctl -u caskbycask-web -n 100` ③ DB/Redis/Next.js 살아있는지 ④ healthz 확인 |
| 점검 페이지가 안 풀림 | `/app/scripts/maintenance.sh status` → `off` 실행. 플래그 파일 `/app/next/maintenance.on` 직접 확인 |
| 점검 우회 URL 이 안 먹힘 | conf 시크릿 3곳 일치 확인 → `nginx -t && reload`. 쿠키 24h 만료 시 URL 재방문 |
| 배포 실패 | Actions 로그 확인. 헬스체크 실패면 자동 롤백됨 → `journalctl` 로 원인 분석 후 재배포 |
| nginx reload 실패 | `sudo nginx -t` 로 문법 오류 위치 확인 후 수정 |
| 백엔드 부팅 실패 (Flyway) | 마이그레이션/엔티티 스키마 불일치 가능 → 로그의 Flyway 메시지 확인 |
| 디스크 부족 | `df -h` → `/app/logs/archived`, `/app/db_backup` 오래된 파일 정리. `upload/` 는 삭제 금지 |
| 재부팅 후 서비스 안 뜸 | `systemctl is-enabled caskbycask-api caskbycask-web` → disabled 면 `sudo systemctl enable caskbycask-api caskbycask-web` |

긴급 전체 차단이 필요하면: `cd /app/scripts && ./stop-web.sh` (복구: `sudo systemctl start nginx`).

---

## 13. 정기 점검 체크리스트

- [ ] **주간**: DB 백업이 매일 생성되는지 (`ls -lh /app/db_backup/`)
- [ ] **주간**: 디스크 여유 (`df -h`) — *임계 초과 시 Slack 자동 알림되지만 보조 확인*
- [ ] **월간**: `upload/` · `db_backup/` 외부 백업(Object Storage/스냅샷) 1회
- [ ] **월간**: ERROR 로그 점검 (`/app/logs/caskbycask-api-error.log`)
- [ ] **분기**: JWT_SECRET 회전 검토, 관리자 비밀번호 점검
- [ ] **분기**: SSL/Origin Cert 만료일 — *15장 `check-resources.sh` 가 자동 감시(만료 14일/3일 전 알림)*
- [ ] **분기**: 알람 생존 확인 — `/app/scripts/check-resources.sh` 수동 실행으로 Slack 도달 점검

---

## 14. 모니터링 (Prometheus + Grafana)

### 구성 개요

| 컴포넌트 | 주소 | 외부 노출 |
|---|---|---|
| Prometheus | 127.0.0.1:9090 | ❌ (내부 전용) |
| Grafana | 127.0.0.1:4000 | ✅ (`monitoring.caskbycask.net`, nginx 경유) |
| 메트릭 엔드포인트 | 127.0.0.1:8081/actuator/prometheus | ❌ (내부 전용) |

### 최초 설치 (한 번)

**`deploy/server/setup-server.md` 14장** 의 단계별 절차를 따른다. (수동 설치)

> nginx Basic Auth(1차) + Grafana 로그인(2차) 이중 보호.
> 비밀번호는 비밀번호 관리자에 보관, **이 문서에 기록 금지**.

### 접속

- URL: `https://monitoring.caskbycask.net`
- 계정: Grafana admin (최초 설치 시 지정한 비밀번호)

### Grafana 대시보드 추천

| 용도 | Dashboard ID |
|---|---|
| JVM 힙·GC·스레드 | 4701 |
| Spring Boot 3.x HTTP 지표 | 17175 |
| Caffeine 캐시 히트율 | 직접 패널 추가 — 메트릭: `cache_gets_total`, `cache_size` |

### 서비스 관리

```bash
sudo systemctl status prometheus grafana-server
sudo systemctl restart prometheus
sudo systemctl restart grafana-server
# Prometheus 설정 변경 후 리로드 (재시작 없이)
sudo systemctl reload prometheus || sudo kill -HUP $(pidof prometheus)
```

### 정기 점검

- [ ] **월간**: Prometheus `localhost:9090/targets` — `caskbycask-api` UP 확인
- [ ] **월간**: Grafana 대시보드에서 메트릭 수집 gap 없는지 육안 확인

---

## 15. 운영 알람 (Slack)

모든 알람은 한 webhook(`SLACK_WEBHOOK_URL`, 채널 `#server-prd`)으로 모인다.
메시지는 **요약 한 줄 + 간단 본문** 규칙(예: `서버장애 - 용량부족` / `/ 디스크 사용량 99% (임계 95%)`).

| 알람 | 트리거 | 구현 | 도는 위치 |
|---|---|---|---|
| 앱 ERROR | ERROR 로그 발생(분당 5건 제한) | `SlackErrorAppender` (logback, prod) | 서버 |
| DB 백업 | 백업 성공/실패 | `backup-db.sh` | 서버(cron) |
| **배포 결과** | Actions 배포 성공/실패(BE·FE·배포 단계별) | `deploy.yml` notify job | GitHub |
| **API 비정상 종료** | 크래시·OOM·비정상 exit (`systemctl stop`/배포 재시작은 제외) | `notify-systemd.sh` (ExecStopPost) | 서버 |
| **API 기동** | 서비스 시작(배포·장애복구) | `notify-systemd.sh` (ExecStartPost) | 서버 |
| **디스크/SSL** | 디스크 임계 초과·SSL 만료 임박 | `check-resources.sh` | 서버(cron) |
| **크롤러 장애** | 네이버 카페 쿠키/인증, 내부 API 토큰, OpenAI 인증·quota, 게시글 처리 오류 | `caskbycask-crawler/alerts/slack_notifier.py` | 서버(cron) |
| ~~서비스 다운~~ ⏸️보류 | `/healthz` 무응답 = VM 통째 다운 | `synology/healthcheck.sh` | 시놀로지 |

> ⏸️ **서비스 다운(외부 헬스체크)은 현재 보류.** 이 알람은 크롤러용 시놀로지 DS220+ 가 상시 켜져 있다는 전제인데, `caskbycask-crawler` 가 아직 운영에 반영되지 않았다. 크롤러를 운영에 올릴 때 함께 활성화한다(5번 절차). 그 전까지 **VM 통째 다운 감지는 공백** — 서버 내부 알람(ERROR·종료·디스크)은 VM 이 죽으면 못 뜨므로, 필요하면 임시로 UptimeRobot 등 무료 외부 모니터로 메울 수 있다.

### 최초 설정 (한 번)

```bash
# 1) 서버: api.env 에 webhook 채우기 (이미 있으면 생략)
sudo nano /app/env/api.env          # SLACK_WEBHOOK_URL=https://hooks.slack.com/...

# 2) systemd 알림 훅 적용 (notify-systemd.sh / slack-notify.sh 는 배포가 /app/scripts 로 전송)
#    유닛 파일은 FTP 로 ~/setup/ 에 올린 뒤 복사 (운영서버엔 레포 없음)
sudo cp ~/setup/caskbycask-api.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl restart caskbycask-api

# 3) 리소스 점검 cron (매시 정각)
crontab -e
#   0 * * * * /app/scripts/check-resources.sh >> /app/logs/check-resources.log 2>&1

# 4) GitHub repo Secret 에 SLACK_WEBHOOK_URL 등록 (배포 결과 알림)
#    Settings > Secrets and variables > Actions > New repository secret

# 5) 크롤러 알림: /app/caskbycask-crawler/.env 에도 같은 webhook 등록
#    SLACK_WEBHOOK_URL=https://hooks.slack.com/...
#    SLACK_CHANNEL=#server-prd

# 6) ⏸️ 보류 — 외부 헬스체크(synology/healthcheck.sh)는 caskbycask-crawler 를
#    운영에 반영해 시놀로지가 상시 가동될 때 활성화한다. 그때:
#      deploy/synology/healthcheck.sh 복사 → 상단 SLACK_WEBHOOK_URL 채우고
#      DSM 작업 스케줄러에 5분 간격 등록 (스크립트 헤더 주석 참고)
```

### 동작 확인 / 임계값

- 비정상 종료 테스트: `sudo systemctl kill -s SIGKILL caskbycask-api` → 🚨 알림 떠야 함. `./stop-api.sh` 는 **무알림**이 정상.
- 임계값(디스크 %, SSL 일수)은 `api.env` 로 덮어쓴다(11장 `api.env.example` 참고). 같은 항목은 6시간 쿨다운으로 도배 방지.

---

## 16. 알려진 구동 로그 (WARN 패턴 참고)

앱 기동 시 아래 WARN 이 나오면 각 원인과 조치를 확인한다.

| 로그 메시지 | 원인 | 상태 |
|---|---|---|
| `Flyway upgrade recommended: MariaDB 11.8 is newer...` | Flyway 버전이 MariaDB 11.8 을 공식 지원하지 않음 | ✅ `flyway-core 12.8.1` 로 해결 (2026-06-16) |
| `BadWordFilter cache refreshed — 0 words loaded` | `bad_words` 테이블에 시드 데이터 없음 | ✅ `V12__seed_bad_words.sql` 마이그레이션으로 해결 (2026-06-16) |
| `The cache 'authUser' is not recording statistics` | Caffeine 캐시 빌드 시 `recordStats()` 미호출 | ✅ `CacheConfig` 에 `.recordStats()` 추가 (2026-06-16) |

> 위 3개 WARN 은 2026-06-16 이후 빌드부터 사라진다. 다시 나타나면 해당 코드/마이그레이션이 누락된 것.

---

> 📎 관련 문서(레포): `deploy/DEPLOY-PIPELINE.md`(배포 파이프라인 상세), `deploy/server/setup-server.md`(최초 서버 셋업 전체 절차)
> 🔒 이 문서의 `CHANGE_ME_*` 는 운영자가 채우되, **실제 비밀번호·시크릿은 Notion 본문이 아닌 별도 비밀번호 관리자에 보관**하는 것을 권장한다.
