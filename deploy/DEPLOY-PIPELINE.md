# CaskByCask 배포 파이프라인 (GitHub Actions + /app)

> 빌드는 GitHub 호스팅 러너에서, 서버에는 **산출물(jar/dist)만** 전송하는 수동 배포.
> Jenkins/Docker 미사용. DB 마이그레이션(Flyway) 등 운영 SQL 절차는 [../deploy.md](../deploy.md) 참고.

---

## 1. 개요

```
master push (코드만)
   │   ← 사용자가 Actions 탭에서 "Run workflow" 클릭 (수동)
   ▼
GitHub Actions (ubuntu-latest, x86)
   ├─ build-api : gradle bootJar      → app.jar      (아키텍처 중립)
   ├─ build-web : npm ci + vite build + prerender → dist/
   └─ deploy    : scp/rsync 로 서버 전송 → 교체 스크립트 실행
   ▼
서버 (Ubuntu 24.04 aarch64, Oracle Cloud 춘천)
   ├─ deploy-web.sh : dist 교체 (무중단에 가까움)
   └─ deploy-api.sh : jar 교체 → 재시작 → 헬스체크 → 실패 시 롤백
```

- 서버는 **빌드하지 않는다** (Gradle/Node/소스 없음). JRE + nginx 만 있으면 됨.
- 서버가 aarch64여도 산출물(jar=바이트코드, dist=정적파일)은 아키텍처 무관 → x86 러너 빌드본 그대로 동작.

---

## 2. 서버 디렉토리 구조

```
/app/
├─ spring-boot/
│  ├─ app.jar                  ← 운영 (systemd 가 실행)
│  ├─ app.jar.new              ← 배포 중 staging (Actions 전송)
│  └─ app.jar_<타임스탬프>      ← 직전 백업 1개 (다음 배포 때 삭제)
├─ vite/
│  ├─ dist/                    ← 운영 (nginx root)
│  ├─ dist.new/                ← 배포 중 staging
│  └─ dist_<타임스탬프>/        ← 직전 백업 1개
├─ upload/                     ← 영속 (이미지·동영상) — 배포와 무관, 절대 삭제 안 함
├─ db_backup/                  ← 영속 (DB 덤프)
├─ env/
│  └─ api.env                  ← 앱 비밀값 (chmod 600, git/GitHub 에 없음)
└─ scripts/
   ├─ deploy-api.sh            ← Actions 가 매 배포 시 갱신
   └─ deploy-web.sh

nginx:  /etc/nginx/sites-available/caskbycask.conf  (root → /app/vite/dist)
ssl:    /etc/nginx/ssl/caskbycask.net.{pem,key}     (Cloudflare Origin Cert)
systemd: /etc/systemd/system/caskbycask-api.service (app 127.0.0.1:8080, actuator 8081)
```

**버전 보관 정책:** 항상 `current + previous` 2개만 유지. 새 배포 시 가장 오래된 백업 삭제 → 직전 운영본 백업 → 신규 운영.

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
2. **인스턴스 iptables**: `setup-server.sh` 가 80/443 ACCEPT + `netfilter-persistent save`

---

## 4. 최초 1회 셋업

```bash
# 서버에서 (코드를 한 번 클론하거나 setup 스크립트만 복사)
sudo bash deploy/server/setup-server.sh
```
스크립트가 끝에 출력하는 **[수동] 단계**를 마저 진행:
1. `mysql_secure_installation` + `caskbycask_prod` DB / `caskbycask` 계정 생성
2. Redis `requirepass` 설정
3. `/app/env/api.env` 작성 (`deploy/env/api.env.example` 복사 후 값 채우고 chmod 600)
4. Cloudflare Origin Cert 를 `/etc/nginx/ssl/` 에 배치 → `nginx -t && systemctl reload nginx`
5. Oracle Security List + Cloudflare DNS(A, Proxied) + SSL/TLS Full(strict)
6. 첫 배포(아래) 후 `sudo systemctl enable --now caskbycask-api`

---

## 5. GitHub Secrets (앱 환경변수 아님 — SSH 접속만)

| Secret | 설명 |
|---|---|
| `SSH_HOST` | 서버 공인 IP |
| `SSH_USER` | 배포 유저 (예: `ubuntu`) |
| `SSH_KEY` | 배포용 SSH 개인키 전체 |
| `SSH_PORT` | (선택) SSH 포트, 미설정 시 22 |

> DB 비번/JWT/OpenAI 등 **앱 비밀값은 GitHub 에 두지 않는다.** 서버 `/app/env/api.env` 에만 존재.

---

## 6. 평소 배포 (수동)

1. 코드 `master` 에 push
2. GitHub → **Actions → "Deploy (manual)" → Run workflow** (사용자 적은 시간대 권장)
3. build-api / build-web 병렬 빌드 → deploy 잡이 전송 + 교체
4. `deploy-api.sh` 가 readiness 헬스체크까지 통과해야 성공 처리 (실패 시 자동 롤백)

---

## 7. 롤백 (수동)

자동 롤백은 "직전 배포가 안 뜰 때" 동작한다. 운영 중 수동 롤백:

```bash
# 백엔드
cd /app/spring-boot
sudo systemctl stop caskbycask-api
mv app.jar app.jar.bad
mv app.jar_<타임스탬프> app.jar          # 직전 백업으로 복귀
sudo systemctl start caskbycask-api

# 프론트
cd /app/vite
rm -rf dist && mv dist_<타임스탬프> dist
```

> 보관본이 1개(직전)뿐이므로 더 과거로의 롤백은 해당 커밋을 다시 빌드/배포해야 한다.
