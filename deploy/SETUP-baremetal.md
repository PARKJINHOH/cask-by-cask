# DrinkIndex 베어메탈 배포 셋업 (Docker 미사용)

새 Ubuntu 서버에 이 문서만 따라 하면 dev 환경을 올릴 수 있습니다.
구조: **Cloudflare(SSL) → NPM(:80/443) → 네이티브 nginx(:8090) → SPA 정적 + /api → systemd 백엔드(127.0.0.1:8092) → 호스트 MariaDB/Redis**

포트 배치(dev): 백엔드 main `8092` / management `8093`, 프론트 nginx `8090`.
(8080/8081/30000/30001 등 기존 컨테이너가 쓰는 포트는 피함)

---

## 0. 변수 (본인 값으로)

```bash
APP_DIR=/home/ubuntu/app/drink-index     # 코드 클론 위치
REPO=https://github.com/PARKJINHOH/drink-index.git
DEPLOY_USER=ubuntu
```

---

## 1. 필수 패키지 (있으면 건너뜀)

### git / rsync / mariadb-client
```bash
sudo apt-get update
sudo apt-get install -y git rsync mariadb-client
```

### JDK 21 (Temurin) — `java -version` 이 21 이 아니면 설치
```bash
java -version 2>&1 | head -1     # "21" 이면 통과
```
없으면:
```bash
sudo apt-get install -y wget apt-transport-https gnupg
sudo mkdir -p /etc/apt/keyrings
wget -qO - https://packages.adoptium.net/artifactory/api/gpg/key/public | sudo tee /etc/apt/keyrings/adoptium.asc >/dev/null
echo "deb [signed-by=/etc/apt/keyrings/adoptium.asc] https://packages.adoptium.net/artifactory/deb $(. /etc/os-release && echo $VERSION_CODENAME) main" | sudo tee /etc/apt/sources.list.d/adoptium.list
sudo apt-get update && sudo apt-get install -y temurin-21-jdk
```

### Node 20 / npm — **유/무 확인 후 분기**
```bash
command -v node >/dev/null && node -v     # v20.x 면 통과
command -v npm  >/dev/null && npm -v
```
- **이미 v20.x 있음** → 그대로 사용. 다른 버전이라 충돌이 걱정되면 nvm 권장.
- **없음 / 버전 낮음** → NodeSource 20.x 설치:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v && npm -v
```
- **다른 서비스가 다른 Node 버전을 씀 → 격리하고 싶다** → nvm:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
. ~/.nvm/nvm.sh && nvm install 20 && nvm alias default 20
```

### nginx (네이티브) — `command -v nginx` 없으면 설치
```bash
command -v nginx >/dev/null || sudo apt-get install -y nginx
```
> 호스트 80 은 NPM(컨테이너)이 점유 중이므로, 네이티브 nginx 는 8090 만 listen 하고 **기본 사이트(default)는 비활성화**합니다 (아래 7번).

---

## 2. 호스트 MariaDB / Redis 준비

DB/Redis 는 이미 호스트에 설치되어 있다고 가정. 스키마와 권한만 확인.

```bash
sudo mariadb <<'SQL'
CREATE DATABASE IF NOT EXISTS drinkindex_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS drinkindex_dev   CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL ON drinkindex_local.* TO 'drink_index'@'%' IDENTIFIED BY 'CHANGE_ME_DB_PWD';
GRANT ALL ON drinkindex_dev.*   TO 'drink_index'@'%';
FLUSH PRIVILEGES;
SQL
```
- 네이티브 프로세스는 `127.0.0.1:3306` 으로 붙으므로 docker bridge grant(`172.%`)는 불필요.
- Redis: `redis-cli -a '<REDIS_PWD>' ping` → `PONG` 확인.

> DB/Redis 가 아예 없는 새 서버라면: `sudo apt-get install -y mariadb-server redis-server` 후 `mariadb-secure-installation`, redis `requirepass` 설정.

---

## 3. 디렉터리 + 권한 (한 번)

```bash
# 백엔드 jar / 프론트 정적파일 / 업로드 / 로그 / env — 배포 유저 소유로
sudo mkdir -p /opt/drinkindex-dev/api /var/www/drinkindex-dev \
             /var/drinkindex/uploads /var/drinkindex/logs/dev /etc/drinkindex
sudo chown -R $DEPLOY_USER:$DEPLOY_USER /opt/drinkindex-dev /var/www/drinkindex-dev \
             /var/drinkindex /etc/drinkindex
```

---

## 4. 코드 받기

```bash
git clone $REPO $APP_DIR
cd $APP_DIR
chmod +x deploy/*.sh
```

---

## 5. EnvironmentFile 작성

```bash
cp deploy/env/dev.env.example /etc/drinkindex/dev.env
nano /etc/drinkindex/dev.env      # CHANGE_ME 채우기 (특히 JWT_SECRET, DB/Redis 비번)
chmod 600 /etc/drinkindex/dev.env
```
- `JWT_SECRET` 은 반드시 `openssl rand -base64 48` 값 (짧으면 기동 실패).

---

## 6. systemd 백엔드 서비스 등록

```bash
sudo cp deploy/systemd/drinkindex-dev-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable drinkindex-dev-api      # 부팅 시 자동 기동 (start 는 7번 첫 배포에서)
```

---

## 7. 네이티브 nginx 사이트 등록

```bash
sudo cp deploy/nginx/drinkindex-dev.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/drinkindex-dev.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default    # 80 점유 default 제거 (NPM 충돌 방지)
sudo nginx -t && sudo systemctl reload nginx
```

---

## 8. sudoers (배포 유저가 systemctl 무암호 실행)

`deploy-api.sh` 는 systemctl 만 sudo 가 필요합니다 (나머지는 ubuntu 소유 디렉터리라 불필요).
```bash
sudo visudo -f /etc/sudoers.d/drinkindex
```
```
ubuntu ALL=(root) NOPASSWD: /bin/systemctl start drinkindex-dev-api, /bin/systemctl stop drinkindex-dev-api, /bin/systemctl restart drinkindex-dev-api, /bin/systemctl status drinkindex-dev-api
```

---

## 9. 최초 배포 (수동)

```bash
cd $APP_DIR
./deploy/deploy-api.sh dev      # gradle bootJar → jar 배치 → systemd 기동 → 헬스체크
./deploy/deploy-web.sh dev      # npm build → /var/www/drinkindex-dev 동기화
```
확인:
```bash
systemctl status drinkindex-dev-api
curl -fsS http://127.0.0.1:8093/actuator/health/readiness   # {"status":"UP"}
curl -I   http://127.0.0.1:8090/healthz                      # 200 ok
```

---

## 10. NPM Proxy Host 등록

NPM UI → Proxy Hosts → Add:

| 항목 | 값 |
|------|-----|
| Domain Names | `drink-dev.pinner.dev` |
| Scheme | `http` |
| Forward Hostname/IP | 기존 서비스(frontend-dev)와 동일한 호스트 IP/게이트웨이 |
| Forward Port | `8090` |
| Block Common Exploits | 켜기 |

SSL 탭: 기존 방식대로 (NPM Let's Encrypt 또는 Cloudflare SSL).

---

## 11. Cloudflare DNS

- A 레코드 `drink-dev` → 서버 Public IP, **proxy 켬(주황)**
- SSL/TLS 모드 **Full**

---

## 12. 검증

```bash
curl -I https://drink-dev.pinner.dev      # 200
```
브라우저 접속 → admin 계정 로그인.

---

## 13. (선택) Jenkins 연동 — 나중에

서버에 Jenkins 설치 후:

1. **Job 2개** 생성 (Pipeline → Pipeline script from SCM):
   - `drinkindex-api` → Script Path `deploy/jenkins/Jenkinsfile.api`
   - `drinkindex-web` → Script Path `deploy/jenkins/Jenkinsfile.web`
2. 각 Job **SCM path filter** 로 트리거 분리:
   - api job: `drinkindex-api/**` 변경 시만
   - web job: `drinkindex-web/**` 변경 시만
   → FE 작은 수정은 web job(수십초)만 돌고 BE 빌드 안 함.
3. **Credentials**:
   - `drinkindex-dev-env` (**Secret file**) = `/etc/drinkindex/dev.env` 내용 전체.
     배포 시 파이프라인이 이 파일을 서버에 설치 → "환경변수를 Jenkins 에서 관리".
4. **Jenkins 실행 유저 권한**: 위 sudoers 의 ubuntu 항목과 동일하게, Jenkins 가 도는 유저에도
   systemctl 무암호 sudo + `/opt/drinkindex-dev`, `/var/www/drinkindex-dev`, `/etc/drinkindex` 쓰기 권한 부여.
5. **GitHub 연동**: Webhook(`/github-webhook/`) 또는 SCM 폴링.

---

## 일상 운영 / 트러블슈팅

```bash
# 수동 배포
./deploy/deploy-api.sh dev          # 백엔드만
./deploy/deploy-web.sh dev          # 프론트만

# 로그
journalctl -u drinkindex-dev-api -f
tail -f /var/drinkindex/logs/dev/drinkindex-api.log

# 백엔드 재시작 / 상태
sudo systemctl restart drinkindex-dev-api
systemctl status drinkindex-dev-api

# 롤백 (이전 jar 보관해 두었다면)
cp /opt/drinkindex-dev/api/app.jar.bak /opt/drinkindex-dev/api/app.jar
sudo systemctl restart drinkindex-dev-api
```

### 자주 겪는 문제
- **기동 직후 죽음** → `journalctl` 에서 `WeakKeyException`(JWT_SECRET 짧음) / DB 접속 실패(grant·bind) 확인.
- **502 (NPM)** → 백엔드/nginx 미기동. `curl 127.0.0.1:8090/healthz`, `:8093/actuator/health` 로 단계별 확인.
- **포트 충돌** → `sudo ss -tlnp | grep -E ':(8090|8092|8093)'` 로 점유 확인 후 EnvironmentFile/conf 포트 조정.
