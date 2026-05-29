# DrinkIndex 베어메탈 배포 셋업 (Docker 미사용)

새 Ubuntu 서버에 이 문서만 따라 하면 dev 환경을 올릴 수 있습니다.
구조: **Cloudflare(SSL) → NPM(:80/443) → 네이티브 nginx(:8090) → SPA 정적 + /api → systemd 백엔드(127.0.0.1:8092) → 호스트 MariaDB/Redis**

포트 배치:
- **dev**: 백엔드 main `8092` / management `8093`, 프론트 nginx `8090`
- **prod**(같은 서버, 다른 포트): 백엔드 main `8094` / management `8095`, 프론트 nginx `8091`

(8080/8081/30000/30001 등 기존 컨테이너가 쓰는 포트는 피함. dev/prod 도 서로 안 겹치게 분리.)

> 이 문서 0~12 번은 **dev 기준**. prod 는 dev 가 안정화된 뒤 **14번 섹션**으로 같은 서버에 포트만 분리해 추가한다.
>
> **브랜치 = 환경 매핑** (Jenkins 자동화, 13번): `develop` → dev 자동 배포 / `main` → prod 수동 배포.

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

## 13. Jenkins 연동 — git push → 자동 빌드·배포·재기동

> 목표: GitHub `develop` 에 push 하면 Jenkins 가 체크아웃 → `deploy-*.sh` 실행(빌드·jar 교체·systemd 재기동/정적파일 동기화)까지 dev 에 자동 수행. prod(`main`)는 수동 버튼.
> 전제: Jenkins 가 **이 서버에 이미 설치**되어 있고(`systemctl status jenkins` 가 running), 9번까지의 수동 배포가 성공한 상태.
> Jenkins 가 도는 유저는 보통 `jenkins`(홈 `/var/lib/jenkins`). 아래는 그 유저 기준이다.

파이프라인 스크립트는 레포에 이미 있다:
- `deploy/jenkins/Jenkinsfile.api` — gradle bootJar → jar 교체 → systemd 재시작 → readiness 헬스체크
- `deploy/jenkins/Jenkinsfile.web` — npm build → `/var/www` rsync (재시작 불필요)

---

### 13-1. Jenkins 실행 유저(`jenkins`)에 빌드 도구 노출

`deploy-api.sh` 는 `gradlew`(JDK 21), `deploy-web.sh` 는 `npm`(Node 20) 을 호출한다.
이 둘이 `jenkins` 유저의 PATH 에서 보여야 한다.

```bash
# jenkins 유저로 확인 (시스템 전역 설치면 그대로 보임)
sudo -u jenkins bash -lc 'java -version; node -v; npm -v; git --version'
```
- **NodeSource(시스템 전역) Node 20 를 깔았으면** → `jenkins` 도 그대로 보임. 통과.
- **JDK 21 이 안 보이면** → gradlew 가 쓰도록 시스템 기본 java 를 21 로 맞추거나(`sudo update-alternatives --config java`),
  Jenkins UI 에서 도구로 지정: *Manage Jenkins → Tools → JDK installations* 에 JDK 21 추가하고 Jenkinsfile 에 `tools{ jdk '...' }` 사용.
- **Node 를 nvm 으로 깔아 `jenkins` 가 못 보면** → 가장 간단한 해결은 시스템 전역 Node 20 설치(1번 NodeSource 방식).
  또는 *Manage Jenkins → Plugins* 에서 **NodeJS** 플러그인 설치 후 *Tools* 에 Node 20 등록 → Jenkinsfile 에 `tools{ nodejs '...' }` 추가.

---

### 13-2. `jenkins` 유저 권한 (배포 디렉터리 쓰기 + systemctl 무암호 sudo)

8번 sudoers 는 `ubuntu` 만 있다. 배포가 이제 `jenkins` 로도 돌므로 동일 권한을 줘야 한다.

**(a) 배포 디렉터리 쓰기** — `ubuntu` 와 `jenkins` 가 공유하도록 그룹 권한 부여:
```bash
sudo groupadd -f drinkindex
sudo usermod -aG drinkindex ubuntu
sudo usermod -aG drinkindex jenkins

# 3번에서 만든 디렉터리들을 그룹 소유 + 그룹쓰기 + setgid(하위 파일도 그룹 상속)
sudo chgrp -R drinkindex /opt/drinkindex-dev /var/www/drinkindex-dev /var/drinkindex /etc/drinkindex
sudo chmod -R g+w        /opt/drinkindex-dev /var/www/drinkindex-dev /var/drinkindex /etc/drinkindex
sudo find /opt/drinkindex-dev /var/www/drinkindex-dev /var/drinkindex /etc/drinkindex -type d -exec chmod g+s {} \;
```
> 그룹 추가는 새 로그인 세션부터 적용된다. 적용 확인: `sudo -u jenkins id` 출력에 `drinkindex` 가 보여야 함.
> 안 보이면 `sudo systemctl restart jenkins` (Jenkins 데몬 세션 재생성).
> prod 까지 쓸 거면 14번에서 만드는 `/opt/drinkindex-prod`, `/var/www/drinkindex-prod` 에도 위 3줄을 동일하게 적용한다(14-2 에 포함).

**(b) systemctl 무암호 sudo** — `jenkins` 항목 추가 (dev/prod 두 서비스 모두):
```bash
sudo visudo -f /etc/sudoers.d/drinkindex
```
```
# dev
ubuntu  ALL=(root) NOPASSWD: /bin/systemctl start drinkindex-dev-api, /bin/systemctl stop drinkindex-dev-api, /bin/systemctl restart drinkindex-dev-api, /bin/systemctl status drinkindex-dev-api
jenkins ALL=(root) NOPASSWD: /bin/systemctl start drinkindex-dev-api, /bin/systemctl stop drinkindex-dev-api, /bin/systemctl restart drinkindex-dev-api, /bin/systemctl status drinkindex-dev-api
# prod (14번에서 prod 환경을 올릴 거면 같이 추가)
ubuntu  ALL=(root) NOPASSWD: /bin/systemctl start drinkindex-prod-api, /bin/systemctl stop drinkindex-prod-api, /bin/systemctl restart drinkindex-prod-api, /bin/systemctl status drinkindex-prod-api
jenkins ALL=(root) NOPASSWD: /bin/systemctl start drinkindex-prod-api, /bin/systemctl stop drinkindex-prod-api, /bin/systemctl restart drinkindex-prod-api, /bin/systemctl status drinkindex-prod-api
```
> 경로 주의: `which systemctl` 가 `/usr/bin/systemctl` 이면 위 `/bin/systemctl` 을 그 경로로 바꿔라(심볼릭 링크라 보통 둘 다 동작하지만 sudoers 는 정확한 경로 매칭).

확인:
```bash
sudo -u jenkins sudo -n systemctl status drinkindex-dev-api   # 비번 안 묻고 상태 출력되면 OK
```

---

### 13-3. Credentials 등록

*Manage Jenkins → Credentials → (global) → Add Credentials*

**서로 다른 용도의 credential 2~3개**를 등록한다. (ID 가 충돌하는 게 아니라 각각 별개 항목)

| # | Kind | ID | 내용 / ID 규칙 |
|---|------|-----|------|
| ① | **Secret file** | `drinkindex-dev-env` | 로컬 `/etc/drinkindex/dev.env` 파일 업로드. **ID 고정 필수** — `Jenkinsfile.api` 가 `credentialsId: "drinkindex-${DEPLOY_ENV}-env"` 로 코드에서 직접 참조하므로 dev 환경은 정확히 이 문자열이어야 함 |
| ② | **Secret file** | `drinkindex-prod-env` | 로컬 `/etc/drinkindex/prod.env` 파일 업로드. 마찬가지로 prod 환경 배포 시 `drinkindex-prod-env` 로 참조됨 → **ID 고정 필수** |
| ③ | Username with password (또는 SSH key) | `github-drinkindex` | 레포가 **private** 일 때만. ID 는 **임의로 지어도 됨**(코드가 참조 안 함) — Job 의 SCM 설정 드롭다운에서 고르기만 하면 된다. public 레포면 생략 |

> 정리: **①②(Secret file)의 ID 는 Jenkinsfile 코드가 부르므로 `drinkindex-<env>-env` 규칙을 반드시 지켜야 하고**, ③(git 인증)의 ID 는 UI 에서만 쓰여서 자유롭게 정해도 된다. 앞서 본 "ID 가 정확히 …여야 함" 주석은 ③이 아니라 **①②(env Secret file)** 에 대한 설명이다.
>
> prod 환경을 아직 안 올렸으면 ②는 14번에서 `prod.env` 작성 후 등록해도 된다. (dev 만 먼저 자동화 → prod 나중에)

---

### 13-4. 브랜치 = 환경 매핑 + Job 4개 생성

**브랜치 전략:**

| 브랜치 | 환경 / 프로파일 | 서버(포트) | 트리거 |
|--------|----------------|-----------|--------|
| `develop` | dev (`SPRING_PROFILES_ACTIVE=dev`) | dev nginx 8090 / API 8092·8093 | push 시 **자동** |
| `main` | prod (`SPRING_PROFILES_ACTIVE=prod`) | prod nginx 8091 / API 8094·8095 | **수동** (Build Now) |

> **환경은 Jenkinsfile 이 체크아웃한 브랜치로 자동 판별**한다(`GIT_BRANCH` 가 `main` 으로 끝나면 prod, 아니면 dev). 그래서 운영자가 파라미터를 고를 필요가 없고, prod Job 에서 실수로 dev 가 도는 사고가 구조적으로 막힌다.

> ⚠️ **`develop` 브랜치를 아직 안 만들었으면 먼저 생성**:
> ```bash
> git checkout -b develop && git push -u origin develop
> ```
> 앞으로 일상 개발은 `develop` 에 push → dev 자동 배포, 릴리스할 때 `develop` → `main` 병합 후 prod 수동 배포.

**Job 은 (프로젝트 2) × (환경 2) = 4개** 만든다. *New Item → 이름 → **Pipeline** → OK*:

| Job 이름 | Branch | Script Path | 트리거 |
|----------|--------|-------------|--------|
| `drinkindex-api-dev`  | `*/develop` | `deploy/jenkins/Jenkinsfile.api` | 자동 |
| `drinkindex-web-dev`  | `*/develop` | `deploy/jenkins/Jenkinsfile.web` | 자동 |
| `drinkindex-api-prod` | `*/main`    | `deploy/jenkins/Jenkinsfile.api` | 수동 |
| `drinkindex-web-prod` | `*/main`    | `deploy/jenkins/Jenkinsfile.web` | 수동 |

각 Job **Configure → Pipeline** 섹션 공통:
- Definition: `Pipeline script from SCM`
- SCM: `Git`
- Repository URL: `https://github.com/PARKJINHOH/drink-index.git`
- Credentials: private 면 `github-drinkindex`, public 이면 `- none -`
- **Branches to build**: 위 표의 브랜치 (`*/develop` 또는 `*/main`)
- **Script Path**: 위 표의 경로
- **Additional Behaviours → Add → "Polling ignores commits in certain paths"** → *Included Regions* (api/web 분리):
  - **api Job** (dev/prod 둘 다):
    ```
    drinkindex-api/.*
    deploy/.*
    ```
  - **web Job** (dev/prod 둘 다):
    ```
    drinkindex-web/.*
    deploy/.*
    ```
  → FE 만 고친 push 는 web Job 만, BE 만 고친 push 는 api Job 만. (`deploy/` 변경은 양쪽 다 — 의도된 동작)

> 정리하면 **2차원 필터**다: ① 브랜치(develop/main) → 환경, ② 경로(api/web) → 어떤 Job. dev Job 2개만 자동 트리거를 켜고, prod Job 2개는 트리거를 안 켠다(13-5).

---

### 13-5. 트리거 설정 — dev Job 자동 / prod Job 수동

**dev Job 2개 (`*-dev`) 에만** 자동 트리거를 건다. **prod Job 2개 (`*-prod`) 는 트리거를 켜지 않는다**(수동 Build Now 전용).

**A. Webhook (Jenkins 가 인터넷에서 접근 가능할 때 — 즉시 트리거)**

1. Jenkins: *Manage Jenkins → Plugins* 에 **GitHub** 플러그인 설치.
2. **`*-dev` Job 2개만** *Configure → Build Triggers* → **GitHub hook trigger for GITScm polling** 체크. (prod Job 은 체크 안 함)
3. Jenkins 를 외부에 노출 (NPM Proxy Host 하나 더 — 10번과 동일 방식, 예 `jenkins.pinner.dev` → Jenkins 포트 8080).
4. GitHub 레포 → *Settings → Webhooks → Add webhook*:
   - Payload URL: `https://<jenkins-도메인>/github-webhook/`  ← 끝 슬래시 필수
   - Content type: `application/json`
   - Events: *Just the push event* (모든 브랜치 push 가 전달돼도, Job 의 Branch 설정·Included Regions 가 알아서 거른다)
5. `develop` 에 push 해보고 GitHub Webhook *Recent Deliveries* 가 `200` 이면 연결 성공.

**B. SCM 폴링 (Jenkins 가 외부 노출 불가 — 1~2분 지연 허용)**

**`*-dev` Job 2개만** *Configure → Build Triggers* → **Poll SCM** 체크 후 스케줄:
```
H/2 * * * *
```
→ 2분마다 `develop` 변경 감지. Included Regions 덕에 해당 프로젝트가 바뀐 경우에만 실제 빌드.

> prod Job 은 트리거가 없으므로 `main` 에 push/병합해도 자동으로 안 나간다. 배포하려면 13-6 처럼 직접 **Build Now**.

---

### 13-6. 첫 배포 검증

**dev (develop → 자동):**
1. `drinkindex-api-dev` Job 화면에서 **Build Now** 수동 1회 → Console Output 에 `Branch 'origin/develop' → DEPLOY_ENV=dev` 와 `✅ 배포 성공 (dev)` 확인.
2. 실제 흐름: `develop` 에 코드 한 줄 수정 → `git push origin develop` → `*-dev` Job 이 자동 시작되는지 확인.
3. 반영 확인:
   ```bash
   systemctl status drinkindex-dev-api
   curl -fsS http://127.0.0.1:8093/actuator/health/readiness   # {"status":"UP"}
   curl -I   https://drink-dev.pinner.dev                       # 200
   ```

**prod (main → 수동, 14번 환경 구축 완료 후):**
1. `develop` 에서 충분히 검증 → `develop` 을 `main` 으로 병합·push.
   ```bash
   git checkout main && git merge --no-ff develop && git push origin main
   ```
   (이 push 로는 **자동 배포 안 됨** — prod Job 에 트리거가 없음)
2. `drinkindex-api-prod` Job 에서 **Build Now** → Console 에 `Branch 'origin/main' → DEPLOY_ENV=prod` 확인. 이어서 `drinkindex-web-prod` 도 실행.
3. 반영 확인:
   ```bash
   systemctl status drinkindex-prod-api
   curl -fsS http://127.0.0.1:8095/actuator/health/readiness   # {"status":"UP"}
   curl -I   https://drinkindex.net                            # 200
   ```

---

### 13-7. Jenkins 트러블슈팅

- **`Permission denied` (jar 복사 / rsync / env install)** → 13-2(a) 그룹·쓰기권한 미적용. `sudo -u jenkins id` 에 `drinkindex` 그룹 확인 후 `sudo systemctl restart jenkins`.
- **`sudo: a password is required`** → 13-2(b) sudoers 에 `jenkins` 행 누락 또는 경로(`/bin/systemctl`) 불일치(`which systemctl` 확인 — 배포판에 따라 `/usr/bin/systemctl`).
- **`./gradlew: JAVA_HOME` / `java: command not found`** → 13-1 의 JDK 21 미노출. `sudo -u jenkins bash -lc 'java -version'`.
- **`npm: command not found`** → 13-1 의 Node 미노출(특히 nvm). 시스템 전역 Node 또는 NodeJS 플러그인.
- **Webhook 눌렀는데 빌드 안 됨** → GitHub *Recent Deliveries* 상태코드 확인(`200` 아니면 URL/방화벽 문제). Included Regions 가 너무 좁아 변경 경로가 제외됐는지도 확인.
- **둘 다(api+web) 매번 같이 돌음** → Included Regions 미설정 또는 오타. push 가 `deploy/` 를 건드리면 양쪽 다 도는 건 정상.
- **빌드 자체 실패** → Console Output + `journalctl -u drinkindex-dev-api -n 50`.

---

## 14. prod 환경 추가 (같은 서버, 다른 포트)

dev 가 안정화된 뒤, **같은 서버에 포트만 분리**해서 prod 를 올린다.
prod 도메인은 `drinkindex.net` (백엔드 prod 프로파일 CORS 에 고정). 포트: API `8094` / mgmt `8095` / nginx `8091`.

> 0~12 의 dev 절차를 prod 이름·포트로 한 번 더 한다고 보면 된다. JDK/Node/nginx/그룹 등 공통 패키지는 이미 깔려 있으니 prod 전용 자원만 추가한다.

### 14-1. prod DB 스키마

2번에서 dev/local 만 만들었으니 prod DB 를 추가:
```bash
sudo mariadb <<'SQL'
CREATE DATABASE IF NOT EXISTS drinkindex_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL ON drinkindex_prod.* TO 'drink_index'@'%';
FLUSH PRIVILEGES;
SQL
```
> 스키마는 `ddl-auto: none` + **Flyway** 가 부팅 시 마이그레이션하므로 빈 DB 면 충분하다. Redis 는 dev 와 같은 인스턴스를 공유한다(키 prefix 로 분리됨).

### 14-2. prod 디렉터리 + 그룹 권한

```bash
sudo mkdir -p /opt/drinkindex-prod/api /var/www/drinkindex-prod /var/drinkindex/logs/prod
# 13-2(a) 의 drinkindex 그룹 공유 권한을 prod 자원에도 동일 적용
sudo chgrp -R drinkindex /opt/drinkindex-prod /var/www/drinkindex-prod /var/drinkindex/logs/prod
sudo chmod -R g+w        /opt/drinkindex-prod /var/www/drinkindex-prod /var/drinkindex/logs/prod
sudo find /opt/drinkindex-prod /var/www/drinkindex-prod -type d -exec chmod g+s {} \;
```
> 업로드(`/var/drinkindex/uploads`)는 dev 와 공유한다. 분리하고 싶으면 prod.env 의 `UPLOAD_PATH` 를 `/var/drinkindex/uploads-prod` 로 바꾸고 그 디렉터리도 위와 같이 생성·권한 부여.

### 14-3. prod EnvironmentFile

```bash
cp deploy/env/prod.env.example /etc/drinkindex/prod.env
nano /etc/drinkindex/prod.env      # CHANGE_ME 채우기 (JWT_SECRET 은 dev 와 다른 값 권장)
chmod 600 /etc/drinkindex/prod.env
```
- 포트(`SERVER_PORT=8094`, `MANAGEMENT_SERVER_PORT=8095`)는 그대로 둔다 — 이 값이 yml 의 기본 포트를 덮어쓴다.
- 이 파일 내용을 **Jenkins Credentials(Secret file, ID `drinkindex-prod-env`)** 로도 등록(13-3 ②).

### 14-4. prod systemd 서비스

```bash
sudo cp deploy/systemd/drinkindex-prod-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable drinkindex-prod-api
```
sudoers 는 13-2(b) 에서 prod 행까지 이미 추가했다(안 했으면 지금 추가).

### 14-5. prod nginx 사이트

```bash
sudo cp deploy/nginx/drinkindex-prod.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/drinkindex-prod.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 14-6. prod 최초 배포 (수동)

```bash
cd $APP_DIR
./deploy/deploy-api.sh prod      # 8095 readiness 까지 자동 확인
./deploy/deploy-web.sh prod
```
확인:
```bash
curl -fsS http://127.0.0.1:8095/actuator/health/readiness   # {"status":"UP"}
curl -I   http://127.0.0.1:8091/healthz                      # 200
```

### 14-7. prod NPM Proxy Host + Cloudflare DNS

- **NPM**: Proxy Hosts → Add → Domain `drinkindex.net` (+ `www.drinkindex.net`), Scheme `http`, Forward Port **8091**, Block Common Exploits 켜기, SSL 발급.
- **Cloudflare**: A 레코드 `@`(및 `www`) → 서버 Public IP, proxy 켬(주황), SSL/TLS **Full**.
- 검증: `curl -I https://drinkindex.net` → 200.

이후부터는 prod 배포도 **`develop`→`main` 병합 후 `*-prod` Job `Build Now`** (13-6) 수동 버튼으로 수행된다.

---

## 일상 운영 / 트러블슈팅

```bash
# 수동 배포 (env 인자만 dev↔prod 로 바꾸면 됨)
./deploy/deploy-api.sh dev          # dev 백엔드 / prod 는 deploy-api.sh prod
./deploy/deploy-web.sh dev          # dev 프론트 / prod 는 deploy-web.sh prod

# 로그
journalctl -u drinkindex-dev-api -f                  # prod: drinkindex-prod-api
tail -f /var/drinkindex/logs/dev/drinkindex-api.log  # prod: .../logs/prod/...

# 백엔드 재시작 / 상태
sudo systemctl restart drinkindex-dev-api            # prod: drinkindex-prod-api
systemctl status drinkindex-dev-api

# 롤백 (이전 jar 보관해 두었다면)
cp /opt/drinkindex-dev/api/app.jar.bak /opt/drinkindex-dev/api/app.jar
sudo systemctl restart drinkindex-dev-api
```

> 일상 배포는 Jenkins 가 대신한다(13번): **dev = `develop` push 시 자동**, **prod = `develop`→`main` 병합 후 prod Job `Build Now` 수동**. 위 명령은 Jenkins 가 죽었거나 긴급 수동 배포·롤백할 때 쓴다.

### 자주 겪는 문제
- **기동 직후 죽음** → `journalctl` 에서 `WeakKeyException`(JWT_SECRET 짧음) / DB 접속 실패(grant·bind) 확인.
- **502 (NPM)** → 백엔드/nginx 미기동. dev `curl 127.0.0.1:8090/healthz`,`:8093/actuator/health` / prod `:8091/healthz`,`:8095/actuator/health` 단계별 확인.
- **포트 충돌** → `sudo ss -tlnp | grep -E ':(8090|8091|8092|8093|8094|8095)'` 로 점유 확인 후 EnvironmentFile/conf 포트 조정.
- **dev/prod 가 서로 영향** → 같은 서버라 Redis·업로드 경로를 공유한다. 완전 격리하려면 prod.env 의 `PROD_REDIS_*`/`UPLOAD_PATH` 를 별도 인스턴스·경로로 분리.
