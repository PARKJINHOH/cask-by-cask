# CaskByCask — 새 서버 최초 셋업 (수동)

> 대상: **Ubuntu 24.04 / aarch64, Oracle Cloud (춘천)**
> 배포 유저: **ubuntu**
> 한 번만 수행. 각 단계를 **직접 한 줄씩 입력하고 결과를 확인**하면서 진행한다.
> (자동 스크립트 대신 수동 진행 — 중간에 막히면 그 단계만 다시 보면 됨)
>
> 디렉토리 구조·정책은 [../DEPLOY-PIPELINE.md](../DEPLOY-PIPELINE.md) 참고. 경로는 모두 `/app` 기준.

---

## 사전 준비 — FTP 로 올릴 파일

레포 전체를 클론하지 않는다. 아래 4개 파일만 **FTP 로 서버 `~/setup/` (= `/home/ubuntu/setup/`) 에 업로드**한 뒤 시작한다.
(파일 내용을 직접 `nano` 로 붙여넣어도 됨 — 그 경우 이 단계 생략)

| 레포 경로 | 서버 업로드 위치 | 최종 배치 위치 |
|---|---|---|
| `deploy/env/api.env.example` | `~/setup/api.env.example` | `/app/env/api.env` |
| `deploy/systemd/caskbycask-api.service` | `~/setup/caskbycask-api.service` | `/etc/systemd/system/` |
| `deploy/nginx/caskbycask.conf` | `~/setup/caskbycask.conf` | `/etc/nginx/sites-available/` |
| `deploy/server/backup-db.sh` | `~/setup/backup-db.sh` | `/app/scripts/backup-db.sh` |

```bash
mkdir -p ~/setup        # FTP 업로드 대상 폴더 (서버에서 미리 생성)
ls -l ~/setup           # 업로드 후 4개 파일 확인
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
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
    openjdk-21-jre-headless \
    nginx \
    mariadb-server mariadb-client \
    redis-server \
    rsync curl iptables-persistent
```

확인:

```bash
java -version          # 21 확인
nginx -v
mariadb --version
redis-server --version
```

---

## 2. `/app` 디렉토리 구조 + 권한

> logs: jar 로그(logback) / db_backup: DB 덤프 / upload: 사용자 파일 — 모두 **배포와 무관한 영속 경로**.

```bash
sudo mkdir -p /app/spring-boot /app/vite /app/upload /app/db_backup /app/env /app/scripts /app/logs
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
sudo nano /app/env/api.env        # CHANGE_ME 값 채우기 (DB/Redis 비번, JWT, OpenAI, Admin 등)
sudo chown ubuntu:ubuntu /app/env/api.env
sudo chmod 600 /app/env/api.env   # ★ 배포/실행 유저만 읽기
```

> 앱 비밀값은 **GitHub 에 두지 않는다.** 오직 이 파일에만 존재.

---

## 7. systemd 유닛 설치

```bash
sudo cp ~/setup/caskbycask-api.service /etc/systemd/system/
sudo systemctl daemon-reload
```

> 아직 `enable --now` 하지 않는다. **app.jar 배치(첫 배포) 후** 마지막 단계에서 기동.

---

## 8. nginx 설정 설치

```bash
sudo mkdir -p /etc/nginx/ssl
sudo cp ~/setup/caskbycask.conf /etc/nginx/sites-available/caskbycask.conf
sudo ln -sf /etc/nginx/sites-available/caskbycask.conf /etc/nginx/sites-enabled/caskbycask.conf
sudo rm -f /etc/nginx/sites-enabled/default
```

Cloudflare Origin Cert 배치 (Cloudflare 대시보드에서 발급):

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

---

## 9. 배포 유저 sudo (caskbycask-api 재시작 무암호)

GitHub Actions 배포가 비번 없이 서비스 재시작/로그 조회할 수 있게 허용:

```bash
sudo tee /etc/sudoers.d/caskbycask-deploy > /dev/null <<'EOF'
ubuntu ALL=(root) NOPASSWD: /usr/bin/systemctl restart caskbycask-api, /usr/bin/systemctl stop caskbycask-api, /usr/bin/systemctl start caskbycask-api, /usr/bin/journalctl -u caskbycask-api *
EOF
sudo chmod 440 /etc/sudoers.d/caskbycask-deploy
sudo visudo -c    # 문법 OK 인지 검증
```

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

---

## 12. 외부 네트워크 (Oracle / Cloudflare)

| 단계 | 위치 | 내용 |
|---|---|---|
| Security List | Oracle 콘솔 | 443(Cloudflare 대역 권장), 80, 22(내 IP) Ingress 허용 |
| DNS A 레코드 | Cloudflare | `caskbycask.net` → 서버 공인 IP, **Proxied(주황 구름)** |
| SSL/TLS | Cloudflare | **Full (strict)** |

---

## 13. 첫 배포 + 서비스 기동

1. GitHub → **Actions → "Deploy (manual)" → Run workflow** 실행
   → `app.jar` 가 `/app/spring-boot/`, `dist` 가 `/app/vite/dist` 로 전송됨
2. jar 도착 확인 후 서비스 기동:

```bash
ls -l /app/spring-boot/app.jar          # 전송됐는지
sudo systemctl enable --now caskbycask-api
```

확인:

```bash
systemctl status caskbycask-api
journalctl -u caskbycask-api -f          # 부팅 로그 (Flyway 마이그레이션 → 8080 기동)
curl -s http://127.0.0.1:8081/actuator/health   # {"status":"UP"} 기대
```

브라우저에서 `https://caskbycask.net` 접속 → SPA 로딩 + 이미지 서빙(`/uploads/...`) 확인.

---

## 셋업 완료 체크리스트

- [ ] `/app` 및 하위 전부 `ubuntu:ubuntu` 소유 (`ls -ld /app/*`)
- [ ] MariaDB/Redis 127.0.0.1 바인딩 + 비밀번호 설정
- [ ] `/app/env/api.env` 작성 + `chmod 600`
- [ ] systemd 유닛 + nginx 설정 + Origin Cert 배치 (`nginx -t` 통과)
- [ ] iptables 80/443 + Oracle Security List + Cloudflare DNS/SSL
- [ ] backup-db cron 등록 + 수동 1회 성공
- [ ] `caskbycask-api` 기동 + actuator health UP + 사이트 정상 로딩
