#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# CaskByCask — 새 서버 최초 셋업 (Ubuntu 24.04 / aarch64, Oracle Cloud)
#
# 한 번만 실행. sudo 로 실행:  sudo bash deploy/server/setup-server.sh
#
# 하는 일:
#   - 패키지 설치: JRE21, nginx, mariadb, redis, rsync, iptables-persistent
#   - /app 디렉토리 구조 + 권한
#   - MariaDB/Redis localhost 바인딩 확인 + DB/계정 생성 안내
#   - 배포 유저 systemctl 무암호 sudo (caskbycask-api 한정)
#   - systemd 유닛 / nginx 설정 배치
#   - 방화벽(iptables) 80/443 오픈
#
# ※ 대화형/비밀값 입력이 필요한 부분은 [수동] 으로 안내만 출력한다.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-ubuntu}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

say() { printf "\n\033[1;32m== %s ==\033[0m\n" "$*"; }
todo() { printf "\033[1;33m[수동] %s\033[0m\n" "$*"; }

[ "$(id -u)" -eq 0 ] || { echo "sudo 로 실행하세요"; exit 1; }

say "1) 패키지 설치"
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y \
    openjdk-21-jre-headless \
    nginx \
    mariadb-server mariadb-client \
    redis-server \
    rsync curl iptables-persistent

say "2) /app 디렉토리 구조 + 권한"
#   logs: jar 로그(logback) / db_backup: DB 덤프 / upload: 사용자 파일 (모두 배포와 무관한 영속 경로)
mkdir -p /app/spring-boot /app/vite /app/upload /app/db_backup /app/env /app/scripts /app/logs
chown -R "$DEPLOY_USER":"$DEPLOY_USER" /app
chmod 755 /app

say "3) MariaDB / Redis — localhost 바인딩 확인"
# Ubuntu 기본값이 이미 127.0.0.1 바인딩이지만 명시적으로 강제
sed -i 's/^#\?bind-address.*/bind-address = 127.0.0.1/' /etc/mysql/mariadb.conf.d/50-server.cnf || true
grep -q '^bind 127.0.0.1' /etc/redis/redis.conf || sed -i 's/^bind .*/bind 127.0.0.1 -::1/' /etc/redis/redis.conf
systemctl enable --now mariadb redis-server
systemctl restart mariadb redis-server

say "4) systemd 유닛 설치"
cp "$REPO_DIR/deploy/systemd/caskbycask-api.service" /etc/systemd/system/
systemctl daemon-reload
echo " → app.jar 배치 + api.env 작성 후 'systemctl enable --now caskbycask-api'"

say "5) nginx 설정 설치"
mkdir -p /etc/nginx/ssl
cp "$REPO_DIR/deploy/nginx/caskbycask.conf" /etc/nginx/sites-available/caskbycask.conf
ln -sf /etc/nginx/sites-available/caskbycask.conf /etc/nginx/sites-enabled/caskbycask.conf
rm -f /etc/nginx/sites-enabled/default
echo " → Cloudflare Origin Cert 설치 후 'nginx -t && systemctl reload nginx'"

say "6) 배포 유저 sudo (caskbycask-api 재시작 무암호)"
cat > /etc/sudoers.d/caskbycask-deploy <<EOF
$DEPLOY_USER ALL=(root) NOPASSWD: /usr/bin/systemctl restart caskbycask-api, /usr/bin/systemctl stop caskbycask-api, /usr/bin/systemctl start caskbycask-api, /usr/bin/journalctl -u caskbycask-api *
EOF
chmod 440 /etc/sudoers.d/caskbycask-deploy

say "7) 방화벽 — 80/443 인바운드 오픈 (인스턴스 iptables)"
iptables -C INPUT -p tcp --dport 80  -j ACCEPT 2>/dev/null || iptables -I INPUT 6 -p tcp --dport 80  -j ACCEPT
iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT
netfilter-persistent save

say "8) DB 백업 — 스크립트 배치 + 일배치 cron (매일 03:00, 30일 보관)"
cp "$REPO_DIR/deploy/server/backup-db.sh" /app/scripts/backup-db.sh
chmod +x /app/scripts/backup-db.sh
chown "$DEPLOY_USER":"$DEPLOY_USER" /app/scripts/backup-db.sh
CRON_LINE="0 3 * * * /app/scripts/backup-db.sh >> /app/logs/backup-db.log 2>&1"
( crontab -u "$DEPLOY_USER" -l 2>/dev/null | grep -v 'backup-db.sh'; echo "$CRON_LINE" ) | crontab -u "$DEPLOY_USER" -
echo " → cron 등록됨: $CRON_LINE"

say "✅ 자동 셋업 완료 — 아래 [수동] 단계를 마저 진행하세요"
echo
todo "MariaDB 보안 + DB/계정 생성:"
echo "      sudo mysql_secure_installation"
echo "      sudo mysql -e \"CREATE DATABASE caskbycask_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\""
echo "      sudo mysql -e \"CREATE USER 'caskbycask'@'127.0.0.1' IDENTIFIED BY '강한비번';\""
echo "      sudo mysql -e \"GRANT ALL ON caskbycask_prod.* TO 'caskbycask'@'127.0.0.1'; FLUSH PRIVILEGES;\""
todo "Redis 비밀번호: /etc/redis/redis.conf 의 'requirepass 강한비번' 설정 후 'sudo systemctl restart redis-server'"
todo "환경변수 파일: sudo cp $REPO_DIR/deploy/env/api.env.example /app/env/api.env  (값 채우고 chmod 600)"
todo "Cloudflare Origin Cert: /etc/nginx/ssl/caskbycask.net.pem , caskbycask.net.key 배치 (chmod 600 key)"
todo "Oracle 콘솔 Security List: 443(권장: Cloudflare 대역만), 80, 22(내 IP) 인그레스 허용"
todo "Cloudflare: A레코드 caskbycask.net → 서버 공인IP (Proxied), SSL/TLS = Full (strict)"
todo "최초 배포: GitHub Actions 'Deploy (manual)' 실행 → app.jar/dist 전송 → 'systemctl enable --now caskbycask-api'"
