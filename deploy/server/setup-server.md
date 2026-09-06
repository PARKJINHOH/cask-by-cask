# CaskByCask — 새 서버 최초 셋업 (수동)

> 대상: **Ubuntu 24.04 / aarch64, Oracle Cloud (춘천)**
> 배포 유저: **ubuntu**
> 한 번만 수행. 각 단계를 **직접 한 줄씩 입력하고 결과를 확인**하면서 진행한다.
> (자동 스크립트 대신 수동 진행 — 중간에 막히면 그 단계만 다시 보면 됨)
>
> 디렉토리 구조·정책은 [../DEPLOY-PIPELINE.md](../DEPLOY-PIPELINE.md) 참고. 경로는 모두 `/app` 기준.

---

## 사전 준비 — FTP 로 올릴 파일

레포 전체를 클론하지 않는다. 아래 파일을 **FTP 로 서버 `~/setup/` (= `/home/ubuntu/setup/`) 에 업로드**한 뒤 시작한다.
(파일 내용을 직접 `nano` 로 붙여넣어도 됨 — 그 경우 이 단계 생략)

| 레포 경로 | 서버 업로드 위치 | 최종 배치 위치 |
|---|---|---|
| `deploy/env/api.env.example` | `~/setup/api.env.example` | `/app/env/api.env` |
| `deploy/systemd/caskbycask-api.service` | `~/setup/caskbycask-api.service` | `/etc/systemd/system/` |
| `deploy/systemd/caskbycask-web.service` | `~/setup/caskbycask-web.service` | `/etc/systemd/system/` |
| `deploy/nginx/caskbycask.conf` | `~/setup/caskbycask.conf` | `/etc/nginx/sites-available/` |
| `deploy/nginx/maintenance.html` | `~/setup/maintenance.html` | `/app/next/maintenance.html` |
| `deploy/server/backup-db.sh` | `~/setup/backup-db.sh` | `/app/scripts/backup-db.sh` |
| `deploy/logrotate/caskbycask-backup` | `~/setup/caskbycask-backup.logrotate` | `/etc/logrotate.d/caskbycask-backup` |
| `deploy/env/backup.env.example` | `~/setup/backup.env.example` | `/app/env/backup.env` (선택) |
| `deploy/server/backup-offsite.sh` | `~/setup/backup-offsite.sh` | `/app/scripts/backup-offsite.sh` (선택) |
| `deploy/server/restore-offsite-drill.sh` | `~/setup/restore-offsite-drill.sh` | `/app/scripts/restore-offsite-drill.sh` (선택) |
| `deploy/cron/caskbycask-backup` | `~/setup/caskbycask-backup.cron` | `/etc/cron.d/caskbycask-backup` (외부 백업 활성화 시) |

```bash
mkdir -p ~/setup        # FTP 업로드 대상 폴더 (서버에서 미리 생성)
ls -l ~/setup           # 업로드 후 필수 파일과 선택 파일 확인
```

---

## 0. 사전 확인

```bash
whoami          # ubuntu 여야 함
id -u           # sudo 가능 유저인지 (sudo 사용 가능하면 OK)
lsb_release -a  # Ubuntu 24.04 확인
uname -m        # aarch64 확인
```

이후 명령은 `sudo` 로 실행한다. (`/app` 생성·패키지 설치 등에 root 권한 필요)

---

## 1. 패키지 설치

```bash
sudo apt-get update
# Node.js 22 LTS (Next.js 16 구동용) 저장소 추가 및 패키지 설치
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
    openjdk-21-jre-headless \
    nodejs \
    nginx \
    mariadb-server mariadb-client \
    redis-server \
    fonts-noto-cjk \
    rsync curl util-linux iptables-persistent
```

확인:

```bash
java -version          # 21 확인
nginx -v
mariadb --version
redis-server --version
flock --version         # API/Web/크롤러 중복 실행 잠금
fc-match 'Noto Sans CJK KR'  # SNS 한글 썸네일용 Noto CJK 확인
```

---

## 2. `/app` 디렉토리 구조 + 권한

> logs: jar 로그(logback) / db_backup: DB 덤프 / upload: 사용자 파일 — 모두 **배포와 무관한 영속 경로**.

```bash
sudo mkdir -p /app/spring-boot /app/next /app/upload /app/db_backup /app/env /app/scripts /app/logs
sudo chown -R ubuntu:ubuntu /app    # ★ 소유권을 ubuntu 로 — root 소유 아님 (업로드/서빙 권한 문제 방지)
sudo chmod 755 /app
```

확인:

```bash
ls -ld /app /app/upload    # drwxr-xr-x ... ubuntu ubuntu 여야 함
```

---

## 3. MariaDB / Redis — localhost 바인딩

> Ubuntu 기본값이 이미 127.0.0.1 바인딩이지만 명시적으로 강제. 외부에 DB/Redis 절대 노출 금지.

```bash
# MariaDB: bind-address = 127.0.0.1
sudo sed -i 's/^#\?bind-address.*/bind-address = 127.0.0.1/' /etc/mysql/mariadb.conf.d/50-server.cnf

# Redis: bind 127.0.0.1 -::1
sudo sed -i 's/^bind .*/bind 127.0.0.1 -::1/' /etc/redis/redis.conf

sudo systemctl enable --now mariadb redis-server
sudo systemctl restart mariadb redis-server
```

확인:

```bash
sudo ss -ltnp | grep -E ':3306|:6379'   # 둘 다 127.0.0.1 에만 바인딩됐는지
```

---

## 4. MariaDB 보안 + DB / 계정 생성

```bash
sudo mysql_secure_installation
```

(root 비번 설정 / 익명 유저 제거 / 원격 root 로그인 차단 / test DB 제거 — 모두 권장값)

이어서 DB·계정 생성 ('강한비번' 은 실제 강한 비밀번호로 교체):

```bash
sudo mysql -e "CREATE DATABASE caskbycask_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER 'caskbycask'@'127.0.0.1' IDENTIFIED BY '강한비번';"
sudo mysql -e "GRANT ALL ON caskbycask_prod.* TO 'caskbycask'@'127.0.0.1'; FLUSH PRIVILEGES;"
```

> prod 의 `ddl-auto` 는 `none`. 스키마는 Flyway(V1~)가 첫 부팅 시 구성한다. ([../../deploy.md](../../deploy.md) 참고)

확인:

```bash
mysql -u caskbycask -p -h 127.0.0.1 -e "SHOW DATABASES;"   # caskbycask_prod 보이면 OK
```

---

## 5. Redis 비밀번호

```bash
# /etc/redis/redis.conf 에서 requirepass 설정
sudo sed -i 's/^# *requirepass .*/requirepass 강한비번/' /etc/redis/redis.conf
sudo systemctl restart redis-server
```

확인:

```bash
redis-cli -a '강한비번' ping    # PONG 이면 OK
```

---

## 6. 환경변수 파일 `/app/env/api.env`

레포의 예시를 복사해서 값을 채운다. (레포를 서버에 클론하지 않았다면 예시 파일만 복사/붙여넣기)

```bash
sudo cp ~/setup/api.env.example /app/env/api.env
sudo nano /app/env/api.env        # CHANGE_ME 값 채우기 (DB/Redis 비번, JWT, Admin 등)
sudo chown ubuntu:ubuntu /app/env/api.env
sudo chmod 600 /app/env/api.env   # ★ 배포/실행 유저만 읽기
```

`HIBERNATE_SEARCH_MASS_INDEX_THREADS`는 기본값 4를 사용한다. 현재 릴리스는 데이터 정합성을 위해
시작 재색인을 항상 수행하며, 비활성화 검토 조건은 [`SEARCH-INDEXING.md`](SEARCH-INDEXING.md)를 확인한다.

> 앱 비밀값은 **GitHub 에 두지 않는다.** 오직 이 파일에만 존재.

---

## 7. systemd 유닛 설치

```bash
sudo cp ~/setup/caskbycask-api.service /etc/systemd/system/
sudo cp ~/setup/caskbycask-web.service /etc/systemd/system/
sudo systemctl daemon-reload
```

`caskbycask-web.service`의 `HOSTNAME=127.0.0.1`을 유지한다. Next.js 3000 포트는 nginx만 접근하며
외부 인터페이스에 직접 바인딩하지 않는다. 기동 후 `sudo ss -ltnp | grep ':3000'`에서
`127.0.0.1:3000`인지 확인한다.

> 아직 `enable --now` 하지 않는다. **app.jar 및 Next.js dist 배치(첫 배포) 후** 마지막 단계에서 기동.

---

## 8. nginx 설정 설치

```bash
sudo mkdir -p /etc/nginx/ssl
sudo cp ~/setup/caskbycask.conf /etc/nginx/sites-available/caskbycask.conf
sudo ln -sf /etc/nginx/sites-available/caskbycask.conf /etc/nginx/sites-enabled/caskbycask.conf
sudo rm -f /etc/nginx/sites-enabled/default
```

Cloudflare Origin Cert 배치 (Cloudflare 대시보드에서 발급). SAN에 `caskbycask.net`과
`www.caskbycask.net`(모니터링 서브도메인까지 공유하면 `*.caskbycask.net`)을 포함한다:

```bash
# /etc/nginx/ssl/caskbycask.net.pem , caskbycask.net.key 배치
sudo nano /etc/nginx/ssl/caskbycask.net.pem    # 인증서 붙여넣기
sudo nano /etc/nginx/ssl/caskbycask.net.key    # 개인키 붙여넣기
sudo chmod 600 /etc/nginx/ssl/caskbycask.net.key
```

검증 후 reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 8-1. 운영 중 nginx 설정 갱신

GitHub Actions 배포는 nginx 설정을 서버로 전송하지 않는다. 저장소의
`deploy/nginx/caskbycask.conf`를 `~/setup/caskbycask.conf`로 업로드한 뒤 아래 절차로 수동 반영한다.

> 업로드한 설정에는 점검 우회 시크릿 자리표시자가 들어 있다. 활성 설정을 그대로 덮어쓰기 전에
> `/app/next/.maintenance_secret` 또는 기존 활성 설정에서 시크릿을 읽어 새 설정에 다시 적용해야 한다.
> 시크릿 값은 터미널에 출력하거나 작업 기록에 첨부하지 않는다.

업로드 파일과 변경 대상 경로를 확인한다:

```bash
ls -l ~/setup/caskbycask.conf
grep -nE 'sitemap\.xml|sitemaps/|indexnow-key|_next/image|/uploads/|X-Content-Type-Options' \
    ~/setup/caskbycask.conf
```

현재 활성 설정을 백업하고 기존 점검 우회 시크릿을 준비한다:

```bash
BACKUP="/etc/nginx/sites-available/caskbycask.conf.bak-$(date +%Y%m%d-%H%M%S)"
sudo cp -a /etc/nginx/sites-available/caskbycask.conf "$BACKUP"

SECRET=$(cat /app/next/.maintenance_secret 2>/dev/null || true)
if [ -z "$SECRET" ]; then
    SECRET=$(sudo sed -n \
        's/.*$cookie_cbc_maint = "\([^"]*\)".*/\1/p' \
        /etc/nginx/sites-available/caskbycask.conf | head -n 1)
fi
if [ -z "$SECRET" ] || [ "$SECRET" = "CHANGE_ME_TO_A_LONG_RANDOM_SECRET" ]; then
    SECRET=$(openssl rand -hex 24)
fi
```

업로드한 설정으로 교체하고 시크릿 3곳을 복원한다:

```bash
sudo cp ~/setup/caskbycask.conf /etc/nginx/sites-available/caskbycask.conf

sudo env NEW_SECRET="$SECRET" perl -0pi -e '
    s/(?<=\$cookie_cbc_maint = ")[^"]+(?=")/$ENV{NEW_SECRET}/g;
    s/(?<=location = \/__cbc_unlock_)[^\s{]+/$ENV{NEW_SECRET}/g;
    s/(?<=cbc_maint=)[^;"]+/$ENV{NEW_SECRET}/g;
' /etc/nginx/sites-available/caskbycask.conf

printf '%s\n' "$SECRET" | sudo tee /app/next/.maintenance_secret >/dev/null
sudo chown ubuntu:ubuntu /app/next/.maintenance_secret
sudo chmod 600 /app/next/.maintenance_secret
unset SECRET
```

자리표시자가 남아 있는지 검사한다. `ERROR`가 출력되면 reload하지 않고 백업 설정으로 복구한다:

```bash
if sudo grep -q 'CHANGE_ME_TO_A_LONG_RANDOM_SECRET' \
    /etc/nginx/sites-available/caskbycask.conf; then
    echo "ERROR: 점검 우회 시크릿 치환 실패 — nginx reload 금지"
else
    echo "OK: 점검 우회 시크릿 치환 완료"
fi
```

문법 검사를 통과한 경우에만 무중단 reload한다:

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl is-active nginx   # active 기대
```

`add_header`를 자체 선언한 location에서도 공통 보안 헤더가 유지되는지 원본 nginx에 직접 확인한다.
업로드 확인 경로는 존재하지 않는 파일이므로 `404`가 정상이며, 세 경로 모두 `always`가 적용된
보안 헤더 3종을 보여야 한다. 하나라도 없으면 reload 완료로 판단하지 말고 백업 설정으로 복구한다.

```bash
for path in \
    /healthz \
    /uploads/__nginx_header_check_missing__.png \
    /favicon.ico
do
    echo "== $path =="
    curl -skI --resolve www.caskbycask.net:443:127.0.0.1 \
        "https://www.caskbycask.net$path" \
        | grep -iE '^(HTTP/|x-content-type-options:|x-frame-options:|referrer-policy:)'
done
```

업로드 확인 경로만 `HTTP/... 404`가 정상이고 나머지는 `200`을 기대한다. 세 응답 모두
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`을 포함해야 한다. `-k`는 Cloudflare Origin
Certificate를 로컬 `127.0.0.1`에 직접 검증할 때만 사용한다.

`nginx -t`가 실패하면 reload하지 말고 즉시 백업으로 복구한다:

```bash
sudo cp "$BACKUP" /etc/nginx/sites-available/caskbycask.conf
sudo nginx -t && sudo systemctl reload nginx
```

SEO 경로가 포함된 갱신이라면 외부 응답까지 확인한다. 하위 sitemap은 모두 HTTP 200,
`Content-Type: application/xml`, `ETag`, `Cache-Control: public, max-age=3600`을 반환해야 한다:

```bash
curl -I https://www.caskbycask.net/sitemap.xml
curl -s https://www.caskbycask.net/sitemap.xml | head
curl -I https://www.caskbycask.net/sitemaps/static.xml
curl -I https://www.caskbycask.net/sitemaps/content-0.xml
curl -I https://www.caskbycask.net/sitemaps/spirits-ko-0.xml
curl -I https://www.caskbycask.net/sitemaps/spirits-en-0.xml

# 프론트에서 사용하지 않는 Next Image Optimizer는 404 기대
curl -I 'https://www.caskbycask.net/_next/image?url=%2Flogo.png&w=64&q=75'
```

`/_next/image` 차단은 현재 소스가 `next/image`를 사용하지 않는다는 전제의 방어 설정이다.
Next.js가 보안 패치된 sharp 버전을 정식 지원하고 스테이징에서 이미지 회귀 테스트를 마치기 전에는 제거하지 않는다.

### 8-2. 서버 점검 페이지 배치

점검 모드(`maintenance.sh`)가 노출할 정적 점검 페이지를 `dist` 와 **분리된** 위치(`/app/next/maintenance.html`)에 둔다.
(dist 와 분리해야 프론트 배포 시 `dist` 교체에 영향받지 않는다.)

```bash
sudo cp ~/setup/maintenance.html /app/next/maintenance.html   # deploy/nginx/maintenance.html
sudo chown ubuntu:ubuntu /app/next/maintenance.html
```

### 8-3. 점검 우회 시크릿 설정 (관리자 본인만 점검 중 접근)

`caskbycask.conf` 의 점검 블록에는 관리자 우회용 시크릿 자리표시자 `CHANGE_ME_TO_A_LONG_RANDOM_SECRET` 가 **3곳**(쿠키 검사 `if`, 발급 `location` 경로, `Set-Cookie` 값) 있다.
**git 에 실제 값을 올리지 말고**, 서버에 배치한 conf 에서만 치환한다.

> **별도 작업 불필요** — `./maintenance.sh on` 실행 시 자동으로 시크릿을 생성·nginx에 적용·URL을 출력한다.
> 생성된 시크릿은 `/app/next/.maintenance_secret` 에 저장되며, 다음 `on` 호출 시 새 시크릿으로 교체된다.
> 스크립트는 `.maintenance_secret` 파일이 conf 와 어긋난 경우에도 `caskbycask.conf` 의 쿠키 검사, unlock location, Set-Cookie 값 3곳을 직접 갱신한다.

```
[maint] ✅ 점검 모드 ON — 방문자에게 점검 페이지가 노출됩니다.
[maint] 🔑 점검 우회 URL: https://www.caskbycask.net/__cbc_unlock_<자동생성값>
[maint]    이 URL 을 안전하게 보관하세요. 쿠키 만료(24h) 시 재방문하면 됩니다.
```

수동으로 시크릿만 교체해야 할 경우:
```bash
SECRET=$(openssl rand -hex 24)
sudo env NEW_SECRET="$SECRET" perl -0pi -e '
    s/(?<=\$cookie_cbc_maint = ")[^"]+(?=")/$ENV{NEW_SECRET}/g;
    s/(?<=location = \/__cbc_unlock_)[^\s{]+/$ENV{NEW_SECRET}/g;
    s/(?<=cbc_maint=)[^;"]+/$ENV{NEW_SECRET}/g;
' /etc/nginx/sites-available/caskbycask.conf
sudo nginx -t && sudo systemctl reload nginx
echo "$SECRET" > /app/next/.maintenance_secret && chmod 600 /app/next/.maintenance_secret
echo "점검 우회 URL:  https://www.caskbycask.net/__cbc_unlock_$SECRET"
```

사용법:
- **점검 중 우회**: `__cbc_unlock_<시크릿>` URL 을 브라우저로 1회 방문 → `cbc_maint` 쿠키 발급(24h) → 이후 점검 중에도 정상 접근(IP 무관, Cloudflare 통과).
- 쿠키 만료(24h) 또는 시크릿 교체 시 URL 을 다시 방문하면 된다.
- 현재 우회 URL 확인: `./maintenance.sh status`

---

## 9. 배포 유저 sudo (caskbycask-api 및 web 재시작 무암호)

GitHub Actions 배포가 비번 없이 서비스 재시작/로그 조회할 수 있게 허용:

```bash
sudo tee /etc/sudoers.d/caskbycask-deploy > /dev/null <<'EOF'
ubuntu ALL=(root) NOPASSWD: /usr/bin/systemctl restart caskbycask-api, /usr/bin/systemctl stop caskbycask-api, /usr/bin/systemctl start caskbycask-api, /usr/bin/journalctl -u caskbycask-api *, /usr/bin/systemctl restart caskbycask-web, /usr/bin/systemctl stop caskbycask-web, /usr/bin/systemctl start caskbycask-web, /usr/bin/journalctl -u caskbycask-web *, /usr/bin/systemctl stop nginx, /usr/bin/systemctl start nginx, /usr/bin/systemctl reload nginx
EOF
sudo chmod 440 /etc/sudoers.d/caskbycask-deploy
sudo visudo -c    # 문법 OK 인지 검증
```

> `stop-api.sh` / `stop-web.sh`(nginx) / 점검모드 reload 가 무암호로 동작하도록 nginx stop·start·reload 도 허용한다.
> 단, **점검 모드(`maintenance.sh`)는 플래그 파일만 토글**하므로 평상시엔 sudo·reload 가 필요 없다(아래 12 참고).

---

## 10. 방화벽 (인스턴스 iptables) — 80/443 인바운드

```bash
sudo iptables -C INPUT -p tcp --dport 80  -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 6 -p tcp --dport 80  -j ACCEPT
sudo iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

> Oracle 콘솔 **Security List(Ingress)** 도 별도로 열어야 함: 443(권장: Cloudflare 대역만), 80, 22(내 IP).

---

## 11. DB 백업 스크립트 + cron (매일 03:00, 3일 보관)

```bash
sudo cp ~/setup/backup-db.sh /app/scripts/backup-db.sh
sudo chmod +x /app/scripts/backup-db.sh
sudo chown ubuntu:ubuntu /app/scripts/backup-db.sh
sudo install -o root -g root -m 644 \
  ~/setup/caskbycask-backup.logrotate /etc/logrotate.d/caskbycask-backup
sudo logrotate -d /etc/logrotate.d/caskbycask-backup

# ubuntu 유저 crontab 에 등록 (중복 방지 후 추가)
( crontab -l 2>/dev/null | grep -v 'backup-db.sh'; \
  echo "0 3 * * * /app/scripts/backup-db.sh >> /app/logs/backup-db.log 2>&1" ) | crontab -
```

확인:

```bash
crontab -l                       # backup-db.sh 라인 보이면 OK
/app/scripts/backup-db.sh        # 수동 1회 실행 → /app/db_backup/ 에 .sql.gz 생성 확인
ls -l /app/db_backup/
```

위 cron은 같은 디스크의 로컬 DB 백업만 수행한다. 인스턴스 장애까지 대비하려면
[`../BACKUP-RESTORE.md`](../BACKUP-RESTORE.md)에 따라 별도 private OCI Object Storage 버킷,
versioning/lifecycle, 백업 전용 키를 먼저 구성한다. 이 사전 조건과 최초 수동 복원 훈련을
통과하기 전에는 기존 DB-only cron을 외부 백업 cron으로 바꾸지 않는다. 복원 훈련은 운영
서버가 아니라 disposable 격리 호스트에서만 실행한다.

---

## 12. 외부 네트워크 (Oracle / Cloudflare)

| 단계 | 위치 | 내용 |
|---|---|---|
| Security List | Oracle 콘솔 | 443(Cloudflare 대역 권장), 80, 22(내 IP) Ingress 허용 |
| DNS A 레코드 | Cloudflare | `caskbycask.net` → 서버 공인 IP, **Proxied(주황 구름)** |
| DNS www 레코드 | Cloudflare | CNAME `www` → `caskbycask.net` 권장(또는 같은 서버 IP의 A), **Proxied(주황 구름)** |
| SSL/TLS | Cloudflare | **Full (strict)** |
| 대표 호스트 Redirect Rule | Cloudflare | `caskbycask.net` → 같은 경로의 `https://www.caskbycask.net`, 301, 쿼리 문자열 유지 |

nginx에도 동일한 비-www → www 리디렉션이 구성되어 Cloudflare 우회 요청을 막는다. Redirect Rule 조건은
`(http.host eq "caskbycask.net")`, 동적 대상은 `concat("https://www.caskbycask.net", http.request.uri.path)`이며 **Preserve query string**을 켠다.

---

## 13. 첫 배포 + 서비스 기동

1. GitHub → **Actions → "Deploy (manual)" → Run workflow** 실행
   → `app.jar` 가 `/app/spring-boot/`, Next.js 빌드본이 `/app/next/dist` 로 전송됨
2. 파일 전송 확인 후 서비스 기동:

```bash
ls -l /app/spring-boot/app.jar          # 전송됐는지
ls -l /app/next/dist/server.js          # Next.js standalone 확인
sudo systemctl enable --now caskbycask-api
sudo systemctl enable --now caskbycask-web
```

확인:

```bash
systemctl status caskbycask-api
systemctl status caskbycask-web
journalctl -u caskbycask-api -f          # API 부팅 로그
journalctl -u caskbycask-web -f          # Next.js 부팅 로그
curl -s http://127.0.0.1:8081/actuator/health/readiness   # {"status":"UP"} 기대
curl -s http://127.0.0.1:3000/healthz            # "ok" 기대
```

브라우저에서 `https://www.caskbycask.net` 접속 → SPA 로딩 + SSR 페이지 및 이미지 서빙(`/uploads/...`) 확인.

---

## 운영 스크립트 (deploy/server/)

서버에서 직접 실행하는 운영용 스크립트. (Actions 배포: `deploy-api.sh` / `deploy-web.sh`)

| 스크립트 | 용도 | sudo |
|---|---|---|
| `stop-api.sh` | 백엔드(Spring Boot) 서비스만 **중지** (`systemctl stop caskbycask-api`) | 필요(무암호 등록됨) |
| `stop-web.sh` | **nginx 중지** — ⚠️ 프론트 + `/api` 프록시 모두 내려감 | 필요(무암호 등록됨) |
| `maintenance.sh on\|off\|status` | **서버 점검 모드** 토글 — 방문자에게 점검 페이지(503)/API JSON 503 노출 | 불필요 |

```bash
# 백엔드만 내리기 (점검 없이 완전 중지) → 다시 올리려면 sudo systemctl start caskbycask-api
./stop-api.sh

# 점검 모드 (권장: nginx 를 죽이지 않고 점검 페이지만 노출, 헬스체크는 200 유지)
./maintenance.sh on        # 점검 시작
./maintenance.sh status    # 상태 확인
./maintenance.sh off       # 정상 복귀  ← reload 불필요, 즉시 반영

# 전체 중단이 꼭 필요할 때만 (점검 페이지조차 안 뜸)
./stop-web.sh
```

> **점검 시에는 `stop-web.sh` 대신 `maintenance.sh on` 사용을 권장**한다.
> nginx 를 살려두므로 방문자에게 안내 페이지를 보여주고, Cloudflare/모니터링 헬스체크(`/healthz`)도 200 을 유지해 오탐을 막는다.

---

## 14. 모니터링 (Prometheus + Grafana) — 선택

> Spring Boot Actuator 가 `127.0.0.1:8081/actuator/prometheus` 에 메트릭을 이미 노출 중.
> Prometheus 가 이를 수집하고 Grafana 가 시각화한다.
> 외부 접근은 `monitoring.caskbycask.net` nginx 역프록시 + Basic Auth 로 보호.

### 14-1. Prometheus 설치

```bash
sudo apt-get install -y prometheus
```

설치 후 `/etc/prometheus/prometheus.yml` 마지막에 Spring Boot scrape job 추가:

```bash
sudo tee -a /etc/prometheus/prometheus.yml > /dev/null <<'EOF'

  - job_name: 'caskbycask-api'
    scrape_interval: 15s
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['127.0.0.1:8081']
        labels:
          application: 'caskbycask-api'
EOF
```

```bash
sudo systemctl enable --now prometheus
```

확인:

```bash
systemctl status prometheus
curl -s http://127.0.0.1:9090/-/ready    # Prometheus is Ready
curl -s 'http://127.0.0.1:9090/api/v1/targets' | grep caskbycask   # state":"up" 기대
```

### 14-2. Grafana 설치

```bash
sudo apt-get install -y apt-transport-https software-properties-common wget
sudo mkdir -p /etc/apt/keyrings/
wget -q -O - https://apt.grafana.com/gpg.key \
  | gpg --dearmor \
  | sudo tee /etc/apt/keyrings/grafana.gpg > /dev/null
echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" \
  | sudo tee /etc/apt/sources.list.d/grafana.list
sudo apt-get update -q
sudo apt-get install -y grafana
```

`/etc/grafana/grafana.ini` 에서 reverse proxy 경로 및 포트(충돌 방지용) 설정:

```bash
# root_url — nginx 도메인 반영
sudo sed -i "s|^;root_url.*|root_url = https://monitoring.caskbycask.net/|" /etc/grafana/grafana.ini
# 초기 admin 비밀번호 (첫 접속 후 즉시 변경 권장)
sudo sed -i "s|^;admin_password.*|admin_password = 강한_비밀번호|" /etc/grafana/grafana.ini
# 포트 충돌 방지 (Next.js 3000 사용하므로 4000으로 설정)
sudo sed -i "s|^;http_port = 3000|http_port = 4000|" /etc/grafana/grafana.ini
```

```bash
sudo systemctl enable --now grafana-server
```

확인:

```bash
systemctl status grafana-server
curl -s http://127.0.0.1:4000/api/health    # {"database":"ok"} 기대
```

### 14-3. nginx Basic Auth 파일 생성

```bash
sudo apt-get install -y apache2-utils
sudo htpasswd -bc /etc/nginx/.htpasswd-monitoring cbc-admin 강한_비밀번호2
```

> Basic Auth(nginx) + Grafana 자체 로그인 이중 보호. 비밀번호는 별도 보관, 이 파일에 기록 금지.

### 14-4. nginx monitoring 설정 적용

레포의 `deploy/nginx/monitoring.conf` 를 서버에 수동 배치:

```bash
# FTP 또는 직접 붙여넣기로 ~/setup/monitoring.conf 에 업로드 후
sudo cp ~/setup/monitoring.conf /etc/nginx/sites-available/monitoring.conf
sudo ln -sf /etc/nginx/sites-available/monitoring.conf \
             /etc/nginx/sites-enabled/monitoring.conf
sudo nginx -t && sudo systemctl reload nginx
```

> SSL 인증서는 메인 사이트(`/etc/nginx/ssl/caskbycask.net.pem`)와 **같은 파일을 공유**.
> 단, 인증서가 `*.caskbycask.net` 와일드카드로 발급된 경우에만 유효.
> 확인: `openssl x509 -in /etc/nginx/ssl/caskbycask.net.pem -noout -text | grep -A2 "Subject Alt"`
> → `*.caskbycask.net` 없으면 Cloudflare 대시보드에서 와일드카드 Origin Cert 새로 발급 후 교체.

### 14-5. Cloudflare DNS 레코드 추가

| 필드 | 값 |
|---|---|
| 형식 | **A** |
| 이름 | `monitoring` |
| IPv4 | 서버 공인 IP |
| 프록시 상태 | 프록싱됨(주황 구름) ✅ |

> CNAME → `caskbycask.net` 은 피할 것. 이미 프록싱 중인 도메인을 CNAME 대상으로 쓰면 루프 위험.

### 14-6. Grafana 초기 설정

`https://monitoring.caskbycask.net` 접속 후:

1. **Connections → Add data source → Prometheus**
   - URL: `http://127.0.0.1:9090`
   - Save & Test → "Successfully queried the Prometheus API" 확인
2. **Dashboards → Import**
   - ID `4701` — JVM (Micrometer) : 힙·GC·스레드·Caffeine 캐시 히트율
   - ID `17175` — Spring Boot 3.x : HTTP 요청/응답/레이턴시

---

## 15. 크롤러 셋업 (선택)

수집 및 AI 분석용 Python 크롤러(`caskbycask-crawler`)를 동일 인스턴스에 셋업합니다.

### 15-1. 가상환경 패키지 설치
Ubuntu 24.04에는 Python 3.12가 기본 설치되어 있으므로, 가상환경 구성을 위한 패키지만 추가합니다.
```bash
sudo apt-get install -y python3-venv python3-pip
```

### 15-2. 영속 디렉터리와 설정 파일 준비
```bash
sudo mkdir -p /app/caskbycask-crawler/{releases,logs,temp}
sudo chown -R ubuntu:ubuntu /app/caskbycask-crawler
```
소스 전체를 이 디렉터리에 직접 덮어쓰지 않습니다. 서버에 영속적으로 둘
`/app/caskbycask-crawler/.env`와 `/app/caskbycask-crawler/targets.json`만 준비하고,
코드는 GitHub Actions의 `target=crawler` 배포가 `releases/<release-id>`에 설치합니다.
`current` 경로가 과거 설치의 일반 디렉터리로 존재하면 먼저 별도 이름으로 이동한 뒤 배포합니다.

개발 PC에서 `caskbycask-crawler/.env.example`과 `targets.example.json`을 각각
`~/setup/crawler.env.example`, `~/setup/targets.example.json`으로 업로드한 뒤 다음을 실행합니다.

```bash
install -m 600 ~/setup/crawler.env.example /app/caskbycask-crawler/.env
install -m 600 ~/setup/targets.example.json /app/caskbycask-crawler/targets.json
nano /app/caskbycask-crawler/.env
nano /app/caskbycask-crawler/targets.json
```

### 15-3. 환경 설정 (`.env`)

필수 설정값 수정:
* `CASKBYCASK_API_URL=http://127.0.0.1:8080` (백엔드가 같은 서버이므로 로컬 주소 호출)
* `CASKBYCASK_INTERNAL_KEY` (서버 `/app/env/api.env` 의 키값과 일치)
* 경로 4종에 대해 `/app/caskbycask-crawler/...` 설정 유지 확인
* 핫딜·AI 소식 공용 `GEMINI_API_KEY`, 핫딜용 `GEMINI_MODEL=gemini-3.1-flash-lite`, `GEMINI_REQUEST_INTERVAL_SEC=5` 기입
* `NAVER_NID_AUT`, `NAVER_NID_SES` 기입
* AI 소식이 쓰는 모델은 `AI_NEWS_CLASSIFIER_MODEL=gemini-3.1-flash-lite` 하나뿐 — 소재 선별·제목·요약에만 쓴다.
  크롤러는 본문도 대표 이미지도 만들지 않는다(본문·이미지·발행은 전부 관리자 몫). 작성·이미지 모델 변수는 없다.
* 텍스트 무료 티어 사용 시 `AI_NEWS_GEMINI_FREE_TIER=true`. 예상 비용을 0으로 집계한다.
* 절대 안전상한이 필요하면 `AI_NEWS_GEMINI_HARD_MONTHLY_USD`, `AI_NEWS_GEMINI_HARD_MONTHLY_TOKENS` 설정 (`0`은 비활성)
* (선택) `SLACK_WEBHOOK_URL`, `SLACK_CHANNEL=#server-prd` 기입 — 네이버 카페/API/Gemini 문제 알림

### 15-4. 타겟 검증

```bash
python3 -m json.tool /app/caskbycask-crawler/targets.json >/dev/null
test -s /app/caskbycask-crawler/.env
```

### 15-5. 릴리스와 가상환경 설치

Actions에서 `target=crawler` 또는 `target=all`을 실행합니다. 배포 스크립트가 릴리스별 `.venv`를
만들고 `requirements.lock`의 해시와 Linux ARM64 wheel을 검증한 뒤 전체 테스트가 통과할 때만
`current` 링크를 교체합니다. 서버에서 `pip install -r requirements.txt`를 직접 실행하지 않습니다.

배포 후에는 릴리스에 포함된 가상환경과 lock 정합성을 확인하고 수동으로 한 번 실행합니다.

```bash
/app/caskbycask-crawler/current/.venv/bin/python \
  /app/caskbycask-crawler/current/scripts/verify_requirements_lock.py
/app/caskbycask-crawler/current/.venv/bin/python -c \
  'import PIL, requests; print(requests.__version__, PIL.__version__)'
/app/caskbycask-crawler/current/run.sh
tail -n 50 /app/caskbycask-crawler/logs/crawler.log
```

### 15-6. cron 스케줄러 등록
cron은 `deploy-crawler.sh`가 중복 항목을 제거한 뒤 자동 갱신합니다. 핫딜과 AI 소식은 KST 기준 2시간 주기로 실행되고 Gemini 호출이 겹치지 않도록 17분 시차를 둡니다. 각 실행 스크립트는 서로 다른 `flock` 잠금을 사용합니다.
```bash
readlink -f /app/caskbycask-crawler/current
crontab -l | grep -E 'CRON_TZ|caskbycask-crawler/current'
```

---

## 셋업 완료 체크리스트

- [ ] `/app` 및 하위 전부 `ubuntu:ubuntu` 소유 (`ls -ld /app/*`)
- [ ] MariaDB/Redis 127.0.0.1 바인딩 + 비밀번호 설정
- [ ] `/app/env/api.env` 작성 + `chmod 600`
- [ ] systemd 유닛 + nginx 설정 + Origin Cert 배치 (`nginx -t` 통과)
- [ ] iptables 80/443 + Oracle Security List + Cloudflare DNS/SSL
- [ ] backup-db cron·logrotate 등록 + 수동 1회 성공
- [ ] `caskbycask-api` readiness UP + `caskbycask-web` health UP + 사이트 정상 로딩
- [ ] (선택) Prometheus + Grafana 기동 + `monitoring.caskbycask.net` 접속 + 대시보드 정상 표시
- [ ] (선택) 크롤러 패키지 설치 및 `.env`/`targets.json` 설정 + 핫딜/AI 소식 2시간 주기 시차 실행 설정 완료
