# CaskByCask 운영 가이드

> 위스키·와인·꼬냑 주류 리뷰 커뮤니티(caskbycask.net) 운영 매뉴얼.
> 배포 / 점검 / 관리자 우회 / 서버 중지 / 백업·복원 / 장애 대응을 한 곳에 정리한다.
> 🔒 `CHANGE_ME` 로 표시된 값(서버 IP, 비밀번호 등)은 운영자가 직접 채운다. **이 문서에 실제 비밀값을 적지 말 것.**

---

## 0. 한눈에 보기 (요약 정보)

| 항목 | 값 |
|---|---|
| 사이트 | https://www.caskbycask.net |
| 서버 | Oracle Cloud Infrastructure · 대한민국 춘천 리전 (Ubuntu 24.04 aarch64) |
| 서버 공인 IP | `CHANGE_ME_SERVER_IP` |
| SSH 접속 유저 | `CHANGE_ME_SSH_USER` (예: ubuntu) |
| SSH 포트 | `CHANGE_ME_SSH_PORT` (기본 22) |
| CDN/DNS | Cloudflare (Proxied, SSL Full strict) |
| 이메일 | Gmail SMTP (drinkindex.cs@gmail.com) |
| 운영자 / 개인정보 보호책임자 | 박진호 |
| 운영 알림 | Slack `#server-prd` (선택) — 상세는 15장 |

**서버 구성**: Cloudflare → nginx(Next.js SSR·정적 자원·`/api` 프록시) → Next.js(127.0.0.1:3000) / Spring Boot(127.0.0.1:8080) → MariaDB / Redis (모두 같은 서버 localhost)

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

빌드는 GitHub 러너에서 수행하고, API/Web 산출물은 private OCI Object Storage를 임시 경유해
운영 서버에 **산출물(jar/dist)만** 전송한다. 서버는 API/Web을 빌드하지 않는다.
API는 Ubuntu 24.04 x64, Next.js standalone과 crawler는 운영 서버와 같은 Ubuntu 24.04
ARM64에서 검증·빌드한다. Actions는 커밋 SHA로 고정하고 `contents: read` 최소 권한으로 실행한다.
입력한 `ref`는 워크플로 시작 시 immutable commit SHA로 한 번 확정되므로 실행 중 브랜치가
이동해도 테스트한 소스와 실제 배포 소스가 달라지지 않는다.

### 절차

1. 변경 코드를 `main` 브랜치에 push
2. GitHub → **Actions** 탭 → **"Deploy (manual)"** → **Run workflow** 클릭
   - **`target` 드롭다운으로 배포 대상 선택** — `both`(FE+BE, 기본) / `api` / `web` / `crawler` / `all`(FE+BE+크롤러)
   - `ref` 입력란 비워두면 `main` 배포 (기본값)
   - 🕐 **사용자 적은 시간대 권장**
3. 자동 진행 (대상에 해당하는 잡만 실행, 나머지는 `skipped`):
   - `build-api` (`fonts-noto-cjk` 설치 → `clean test bootJar`) · `build-web` (`npm ci` → 세션 캐시 테스트 → 타입 검사 → Next.js Standalone Build → **SEO 계약 검증 3종**) · `test-crawler` (Python 3.12 ARM64 hash lock 설치 → 전체 테스트) — 대상이면 병렬 실행
     - SEO 계약 검증은 빌드 산출물로 `next start`를 띄우고 가짜 백엔드를 붙여 확인하므로 반드시 빌드 이후에 실행한다. 외부 네트워크·DB·운영 API가 필요하지 않다.
       - `npm run test:proxy-seo` — 주류 canonical `301`, locale `308`, 비공개 경로 `X-Robots-Tag`, 백엔드 장애 시 색인 보호(stale 캐시 리다이렉트 / slug URL은 200 / slug 없는 URL만 503)
       - `npm run test:seo-indexing` — 라우트별 index·noindex 판정, canonical·hreflang 단일성, snapshot 경로 H1, 홈의 주류 내부 링크
       - `npm run test:seo-entity` — 엔티티별 title 구분(중복 title 방지), 리뷰의 한국어 canonical 통합, 주류 가격 페이지의 주류 상세 canonical 통합
     - 실패 시 배포가 중단된다. 색인 정책이 깨진 산출물을 운영에 올리지 않기 위한 게이트다. 상세 정책은 [`deploy/SEO.md`](./SEO.md) 참고.
   - `deploy` 잡은 운영 셸 스크립트 구문과 API/Web 실패·롤백 상태 전이 테스트를 먼저 검사하고, 빌드된 산출물만 서버로 전송 → 해당 교체 스크립트 실행
   - both/all 일 때: **백엔드 jar 교체 → 재시작 → readiness 헬스체크** 통과 후 프론트 dist 교체(Next.js 서비스 재시작). API 교체가 실패하면 프론트는 교체하지 않고 잡이 끝난다.
4. API/Web은 신규 서비스 재시작과 로컬 health를 모두 통과해야 성공한다. 실패하면 직전 파일을 복원하고, **구버전 재시작과 로컬 health까지 통과한 경우에만 롤백 복구 완료**로 기록한다. 롤백이 성공해도 해당 Actions 배포는 실패로 남는다.
   - API/Web별 `.deploy.lock`은 **교체·재시작 구간**의 동시 실행을 거절한다. 고정 staging 경로 업로드는 잠금 범위 밖이므로 Actions와 로컬 수동 배포를 동시에 시작하지 않는다.
   - health 요청은 connect 1초·요청 2초, 단계별 총 API 120초·Web 15초로 제한하며, 교체 도중 HUP/INT/TERM 또는 예기치 않은 종료가 발생해도 검증 전이면 같은 롤백 경로를 실행한다.
   - `both`/`all`에서 API 교체가 실패하면 API는 자동 롤백되고 **웹은 아예 교체되지 않는다**(직전 버전 유지).
     반대로 API 성공 후 웹이 실패하면 웹만 자동 롤백되고 API는 새 버전으로 남는다. 이 경우 새 API는
     직전 웹과 하위 호환이어야 하며, 호환되지 않으면 10장의 API 수동 롤백을 즉시 수행한다.
5. 완료 시 **Slack `#server-prd` 로 결과 통보**(BE·FE·crawler·배포 단계별, `SLACK_WEBHOOK_URL` Secret 설정 시).
   - 배포 안 한 쪽은 `⏭`(skipped) 로 표시 — 예: `백엔드 ⏭ · 프론트 ✅ · 크롤러 ⏭` (web 만 배포). 요약에 대상(`· web`)도 표기됨.

### SEO 영향이 있는 변경의 배포 순서

`both`/`all` 은 **백엔드를 먼저 교체해 readiness 를 통과시킨 뒤 프론트를 교체**한다.
따라서 주류 SEO 조회(`/api/seo/spirits/{id}`)에 의존하는 프론트 변경도 **한 번의 `both` 실행으로
안전하게 배포된다.** 예전처럼 `api` → `web` 두 번으로 나눠 실행할 필요가 없다.

이유: Next.js proxy 는 주류 canonical 을 판정하기 위해 이 API 를 호출하고, 결과를 프로세스 메모리에
캐싱한다(5분 TTL + stale-while-error). 새로 뜬 프론트 프로세스는 **캐시가 비어 있다.** 프론트를 먼저
교체하면 캐시도 없고 백엔드도 재시작 중인 구간이 생겨, slug 없는 주류 URL(`/ko/spirits/244`)이
`503` 을 반환한다. API 를 먼저 올려 readiness 를 통과시키면 이 구간이 사라진다.

```
Actions → Deploy (manual) → target: both
  1) deploy-api.sh  : jar 교체 → 재시작 → readiness 통과 (실패 시 API 롤백 후 잡 종료)
  2) deploy-web.sh  : dist 교체 → 재시작 → health   (1) 이 성공했을 때만 실행
```

> API 기동 시 Hibernate Search 재색인이 매번 실행되므로 readiness 통과까지 시간이 걸릴 수 있다.
> `deploy` 잡은 API readiness(최대 120초)를 기다린 뒤에야 프론트 교체로 넘어간다.
> 배포 시간을 줄이려고 `api` 와 `web` 을 각각 따로(동시에) 실행하면 이 순서 보장이 깨지므로,
> 두 쪽을 함께 올릴 때는 반드시 `both` 를 사용한다.

### 배포가 전송하는 것 / 안 하는 것

| 자동 전송됨 (매 배포) | 자동 전송 안 됨 (수동 관리) |
|---|---|
| `app.jar` (백엔드) | nginx 설정 (`caskbycask.conf`) |
| `dist/` (프론트) | 점검 페이지 (`maintenance.html`) |
| crawler 릴리스 아카이브 (`target=crawler/all`) | crawler `.env`, `targets.json`, SQLite, 로그 |
| 운영 스크립트 전체 (`deploy/server/*.sh`) | systemd 유닛 (`caskbycask-api.service`, `caskbycask-web.service`) |
| | `api.env` (비밀값) |

> ⚠️ **nginx 설정·점검 페이지를 변경했다면 배포만으로는 반영되지 않는다.** 아래 8장 참고하여 수동 적용한다.
> (운영 스크립트 `deploy/server/*.sh` 는 배포가 `/app/scripts` 로 자동 전송하므로 수동 복사 불필요.)

### GitHub Secrets

배포 SSH 정보, API/Web 아티팩트용 OCI Object Storage 정보와 (선택) Slack webhook을 등록한다.
앱 비밀값(DB/JWT 등)은 서버 `api.env` 에만 둔다.

| Secret | 값 |
|---|---|
| `SSH_HOST` | `CHANGE_ME_SERVER_IP` |
| `SSH_USER` | `CHANGE_ME_SSH_USER` |
| `SSH_KEY` | 배포용 SSH 개인키 전체 |
| `SSH_PORT` | `CHANGE_ME_SSH_PORT` (선택) |
| `OCI_S3_ACCESS_KEY_ID` | Oracle Object Storage S3 호환 Access Key ID |
| `OCI_S3_SECRET_ACCESS_KEY` | Oracle Object Storage S3 호환 Secret Access Key |
| `OCI_NAMESPACE` | Oracle Cloud Object Storage Namespace |
| `OCI_BUCKET` | API/Web 배포 아티팩트용 private 버킷 이름 |
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
- ⚠️ 수동 배포는 GitHub Actions 를 거치지 않으므로 **SEO 계약 검증 게이트가 실행되지 않는다.** SEO 관련 코드(`src/proxy.ts`, `src/shared/utils/seoHelpers.ts`, `src/app/**`)를 건드린 뒤 수동 배포할 때는 로컬에서 먼저 실행한다.

  ```powershell
  cd caskbycask-web
  npm run build
  npm run test:proxy-seo; npm run test:seo-indexing; npm run test:seo-entity
  ```

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
> `stop-web.sh` 후 API 배포는 readiness 통과 뒤 nginx가 내려가 있으면 자동 기동한다. nginx 기동에
> 실패하면 배포도 실패 처리된다. 자동 기동에 의존하지 말고 배포 전 `systemctl is-active nginx`를
> 확인하며, 실패 시 API는 정상일 수 있으므로 nginx 상태와 Actions 로그를 함께 확인한다.

### 서버 재부팅 후

systemd 가 `caskbycask-api`, `caskbycask-web`, nginx 를 자동 기동한다(enable 되어 있음). 별도 조치 불필요. 확인:

```bash
curl -s http://127.0.0.1:8081/actuator/health/readiness   # {"status":"UP"} 기대
curl -s http://127.0.0.1:3000/healthz                     # ok 기대
curl -s https://www.caskbycask.net/healthz                # ok 기대
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

`/app/scripts/backup-db.sh` 가 **매일 03:00(cron)** 공통 잠금을 획득한 뒤
`caskbycask_prod` 를 임시 gzip으로 덤프하고 무결성 검사를 통과한 파일만 원자적으로
`/app/db_backup/` 에 배치한다. **3일 초과분은 자동 삭제**하고 백업 로그는 주간
logrotate를 적용한다. (Slack 설정 시 성공/실패 알림)

```bash
/app/scripts/backup-db.sh          # 수동 즉시 백업
ls -lh /app/db_backup/             # 백업 목록
```

로컬 덤프와 `/app/upload`는 같은 인스턴스 디스크에 있으므로 이것만으로는 재해 복구가
완성되지 않는다. 별도 private OCI Object Storage 버킷으로 복제하는 `backup-offsite.sh`와
disposable 격리 호스트에서 수행하는 `restore-offsite-drill.sh` 절차는
[`BACKUP-RESTORE.md`](BACKUP-RESTORE.md)를 따른다. 버킷 versioning/lifecycle, 전용 키,
로컬·원격 sentinel을 확인하기 전에는 외부 백업을 활성화하거나 기존 cron을 교체하지 않는다.
복원 훈련 스크립트는 외부 SQL을 실행하므로 **운영 서버에서 실행하지 않는다**.

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

### 변경 전 읽기 전용 사전 점검

운영 변경 전 `/app/scripts/preflight-audit.sh`로 런타임·서비스·헬스·아티팩트·백업 상태를 확인한다. DB 항목은 로컬 관리자 소켓으로 `SELECT`와 `SHOW`만 실행하며 비밀값이나 사용자 식별값을 출력하지 않는다.

```bash
/app/scripts/preflight-audit.sh
sudo /app/scripts/preflight-audit.sh --db
```

### 운영 DB 쿼리 후보 수집

인덱스 변경 전에는 [`server/DB-QUERY-TUNING.md`](server/DB-QUERY-TUNING.md)에 따라 읽기 전용 계정으로 `performance_schema`의 정규화된 SELECT digest만 수집한다. 운영에서는 `ANALYZE FORMAT=JSON`처럼 실제 쿼리를 실행하는 진단을 하지 않으며, 측정 결과 없이 인덱스나 Flyway migration을 추가하지 않는다.

```bash
DB_AUDIT_CONFIG_FILE=/app/env/db-observer.cnf \
DB_NAME=caskbycask_prod \
bash /app/scripts/collect-db-query-candidates.sh
```

### Hibernate Search 시작 인덱싱

현재 릴리스는 기존 동작과 데이터 정합성을 보존하기 위해 API 시작 시 `Spirit` 전체 재색인을 항상 수행한다. 재색인 실패 시 API 프로세스는 유지하지만 `searchIndex` health를 `DOWN`으로 두어 readiness와 배포 롤백에 반영한다. `HIBERNATE_SEARCH_MASS_INDEX_THREADS`는 1~16만 허용하며 기본값 4를 사용한다. 시작 재색인을 끄는 기능은 영속 경로·연관 엔티티 증분 반영·수동 복구를 별도 검증하기 전까지 제공하지 않는다. 상세 게이트는 [`server/SEARCH-INDEXING.md`](server/SEARCH-INDEXING.md)를 따른다.

---

## 8. nginx·systemd 설정 / 운영 스크립트 변경 적용

운영 스크립트(`deploy/server/*.sh`)는 **배포(Actions)가 `/app/scripts` 로 자동 전송**한다.
nginx·systemd 설정과 점검 페이지는 전송하지 않으므로 변경 시 아래처럼 수동 적용한다.
외부 백업의 `backup.env`, `/etc/cron.d/caskbycask-backup`, logrotate 설정도 비밀값·운영 승인
항목이므로 자동 설치하지 않는다. [`BACKUP-RESTORE.md`](BACKUP-RESTORE.md)의 sentinel과 최초
수동 검증을 통과한 뒤 각각 권한 600/644로 설치한다.

`caskbycask-web.service`를 갱신할 때는 Next standalone이 nginx를 우회해 외부에 노출되지 않도록
`HOSTNAME=127.0.0.1`이 있는지 확인한 뒤 적용한다.

nginx는 location에 `add_header`가 하나라도 있으면 server 수준의 `add_header`를 상속하지 않는다.
따라서 캐시·쿠키·Range 헤더를 자체 선언한 모든 location에 `nosniff`, `DENY`,
`strict-origin-when-cross-origin`을 함께 명시한다. 이 규칙은 Actions의
`bash deploy/tests/test-nginx-security-headers.sh`가 정적으로 검사하며, 기존 Cache-Control·CORS·본문은
변경하지 않는다.

```bash
grep -n 'HOSTNAME=127.0.0.1' ~/setup/caskbycask-web.service
sudo cp ~/setup/caskbycask-web.service /etc/systemd/system/caskbycask-web.service
sudo systemctl daemon-reload
sudo systemctl restart caskbycask-web
sudo ss -ltnp | grep ':3000'   # 127.0.0.1:3000 기대, 0.0.0.0:3000이면 중단
curl -sS http://127.0.0.1:3000/healthz
```

SEO 경로는 `/sitemap.xml`, `/sitemaps/**`, `/indexnow-key.txt`를 API(127.0.0.1:8080)로 전달한다. SNS 짧은 링크 `/s/**`, `/ko/s/**`, `/en/s/**`도 API로 직접 전달해야 하며, 그렇지 않으면 Next.js 기본 언어 리디렉션 후 404가 발생한다. sitemap의 `Cache-Control`과 `ETag`는 API 응답을 그대로 사용하므로 nginx에서 별도 캐시 헤더를 중복 추가하지 않는다. 현재 프론트는 `next/image`를 사용하지 않으며 Next.js 설정에서 이미지 최적화를 비활성화한다. nginx도 `/_next/image`를 정확 일치 경로로 `404` 차단한다. Next.js가 보안 패치된 sharp 버전을 정식 지원하고 스테이징 검증을 마치기 전에는 이 차단을 제거하지 않는다. 설정 교체 후 아래 명령으로 `nginx -t`와 무중단 reload를 수행하고, 11장의 sitemap 점검 명령을 실행한다.

### 대표 호스트(canonical host) 정책

- 대표 URL은 `https://www.caskbycask.net`이다.
- `http://caskbycask.net`, `http://www.caskbycask.net`, `https://caskbycask.net`은 경로와 쿼리 문자열을 유지해 `https://www.caskbycask.net`으로 `301` 이동한다.
- nginx는 원본 서버의 안전망으로 동일한 리디렉션을 수행한다. Cloudflare를 우회해도 비-www 콘텐츠를 `200`으로 제공하지 않는다.
- TLS 연결이 HTTP 리디렉션보다 먼저 처리되므로 `/etc/nginx/ssl/caskbycask.net.pem`의 SAN에 `caskbycask.net`과 `www.caskbycask.net`(또는 `*.caskbycask.net`)이 모두 포함되어야 한다.
- 비-www 호스트의 쿠키·localStorage는 www로 이전되지 않으므로, 기존 사용자는 최초 전환 후 한 번 다시 로그인해야 할 수 있다. 보안을 위해 refresh cookie는 host-only 상태를 유지한다.

Cloudflare 대시보드에서 다음을 확인한다.

| 위치 | 설정 |
|---|---|
| DNS → Records | `@` A 레코드와 `www` 레코드를 모두 **Proxied**로 유지. `www`는 CNAME(`caskbycask.net`) 권장, 기존 A가 같은 서버 IP를 가리키면 그대로 사용 가능 |
| SSL/TLS → Overview | **Full (strict)** 유지 |
| SSL/TLS → Edge Certificates → HSTS | **활성화**, Max Age `1 month`(`max-age=2592000`), **includeSubDomains 비활성화**, **Preload 비활성화** |
| Rules → Redirect Rules → Single Redirect | 호스트가 `caskbycask.net`이면 `https://www.caskbycask.net`의 같은 경로로 `301`, **Preserve query string 활성화** |

Cloudflare Single Redirect 조건은 `(http.host eq "caskbycask.net")`, 동적 대상 URL은 `concat("https://www.caskbycask.net", http.request.uri.path)`를 사용한다. 같은 목적의 Page Rule, Bulk Redirect, Worker가 이미 있다면 중복 규칙을 만들지 말고 방향이 www인지 확인한다. 규칙 반영 후 기존 비-www 응답이 캐시되어 있으면 Cloudflare 캐시를 purge한다.

#### 운영 반영 및 외부 검증 (2026-07-19)

- Cloudflare Single Redirect를 운영에 반영했다. `http://caskbycask.net`과 `https://caskbycask.net` 요청은 경로와 쿼리 문자열을 보존해 `https://www.caskbycask.net`으로 한 번에 `301` 이동한다.
- `http://caskbycask.net/ko/community/notice?from=apex&check=1` 요청이 `https://www.caskbycask.net/ko/community/notice?from=apex&check=1`로 직접 이동하고, 최종 응답이 `200`이며 리디렉션 루프가 없음을 외부 요청으로 확인했다.
- Cloudflare HSTS를 Max Age 1개월로 활성화했다. HTTPS 비-www `301` 응답과 HTTPS www `200` 응답에서 `Strict-Transport-Security: max-age=2592000`을 확인했으며, `includeSubDomains`와 `preload` 지시어는 포함되지 않는다.
- HSTS의 1개월은 자동 해제 시점이 아니라 브라우저 보관 기간이다. 사용자가 HTTPS 응답을 받을 때마다 기간이 갱신되므로, 안정성 확인 후 Max Age를 늘리거나 설정을 변경하려면 Cloudflare에서 직접 조정한다.

전환 시 소셜 로그인 중단과 양방향 리디렉션 루프를 피하기 위해 다음 순서를 지킨다.

1. Google Cloud Console과 네이버 개발자센터에 `https://www.caskbycask.net/oauth/callback`을 먼저 등록한다.
2. 전환 중에는 `/app/env/api.env`의 `OAUTH_ALLOWED_REDIRECT_URIS`에 비-www와 www 콜백을 쉼표로 함께 허용한 뒤 API를 재시작한다.
3. 웹/API 배포와 nginx 설정을 반영한다.
4. 기존 `www → 비-www` Cloudflare 규칙이 있으면 제거하고, `비-www → www` 규칙을 활성화한다.
5. 검증 후 비-www OAuth 콜백을 환경변수와 제공자 콘솔에서 정리한다.

```dotenv
# 대표 호스트 전환 중 임시값
OAUTH_ALLOWED_REDIRECT_URIS=https://caskbycask.net/oauth/callback,https://www.caskbycask.net/oauth/callback
```

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

# SNS 짧은 링크가 API의 302 응답을 반환하는지 확인
curl -sSI https://www.caskbycask.net/s/실제_SHORT_CODE | grep -iE '^(HTTP/|location:)'
curl -sSI https://www.caskbycask.net/ko/s/실제_SHORT_CODE | grep -iE '^(HTTP/|location:)'

# Cloudflare를 우회해 원본 nginx의 일반/404 응답에 always 보안 헤더 3종이 있는지 확인
for path in /healthz /uploads/__nginx_header_check_missing__.png /favicon.ico; do
  echo "== $path =="
  curl -skI --resolve www.caskbycask.net:443:127.0.0.1 \
    "https://www.caskbycask.net$path" \
    | grep -iE '^(HTTP/|x-content-type-options:|x-frame-options:|referrer-policy:)'
done

# 대표 호스트 검증: 비-www는 301 + Location, www는 200 기대
curl -I 'https://caskbycask.net/ko/community/notice?from=apex'
curl -I 'https://www.caskbycask.net/ko/community/notice?from=apex'

# 미사용 Next Image Optimizer 차단 확인: 404 기대
curl -I 'https://www.caskbycask.net/_next/image?url=%2Flogo.png&w=64&q=75'
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
| `OAUTH_ALLOWED_REDIRECT_URIS` | 소셜 콜백 화이트리스트 (예: `https://www.caskbycask.net/oauth/callback`). 제공자 콘솔 등록값과 동일 |
| `OAUTH_NAVER_CLIENT_ID` / `OAUTH_NAVER_CLIENT_SECRET` | 네이버 로그인 키 (네이버 개발자센터) |
| `OAUTH_GOOGLE_CLIENT_ID` / `OAUTH_GOOGLE_CLIENT_SECRET` | 구글 로그인 키 (Google Cloud Console) |
| `EXCHANGE_RATE_PROVIDER_URL` | 해외·면세 가격 원화 환산용 공개 환율 API. 기본값 `https://api.frankfurter.dev` |
| `EXCHANGE_RATE_CONNECT_TIMEOUT_MS` / `EXCHANGE_RATE_READ_TIMEOUT_MS` | 환율 API 연결/응답 제한 시간. 기본값 3000ms/15000ms |
| `EXCHANGE_RATE_RETRY_MAX_ATTEMPTS` / `EXCHANGE_RATE_RETRY_INITIAL_BACKOFF_MS` | 환율 API 최대 시도 횟수와 최초 재시도 대기시간. 기본값 3회/1000ms이며 이후 대기시간은 2배 증가 |
| `SOCIAL_PUBLISH_ENABLED` | Instagram·Threads 비동기 게시 feature flag. 공식 계정 연결·시험 전에는 `false` |
| `SOCIAL_PUBLIC_MEDIA_BASE_URL` | Meta가 생성 이미지를 가져갈 수 있는 HTTPS 공개 기준 URL |
| `SOCIAL_OAUTH_REDIRECT_URI` | Meta 콘솔에 등록한 공식 계정 연결 콜백 URL |
| `SOCIAL_TOKEN_ENCRYPTION_KEY` | Meta 장기 access token AES-256-GCM 암호화 키(Base64 32B). 변경 시 공식 계정 재연결 필요 |
| `SOCIAL_HTTP_CONNECT_TIMEOUT` / `SOCIAL_HTTP_READ_TIMEOUT` | Meta API 연결/응답 제한 시간. 기본값 `5s`/`20s` |
| `SOCIAL_INSTAGRAM_APP_ID` / `SOCIAL_INSTAGRAM_APP_SECRET` | Instagram API with Instagram Login 앱 키. Instagram 제거·삭제 `signed_request` 검증에도 사용 |
| `SOCIAL_INSTAGRAM_API_BASE_URL` / `SOCIAL_INSTAGRAM_TOKEN_API_BASE_URL` | Instagram 버전 고정 게시 API(`https://graph.instagram.com/v25.0`)와 버전 없는 토큰 API(`https://graph.instagram.com`). 서로 바꾸지 않음 |
| `SOCIAL_THREADS_APP_ID` / `SOCIAL_THREADS_APP_SECRET` | Threads API 앱 키. Threads 제거·삭제 `signed_request` 검증에도 사용 |
| `SOCIAL_THREADS_API_BASE_URL` / `SOCIAL_THREADS_TOKEN_API_BASE_URL` | Threads 게시·토큰 API 호스트. 기본값은 모두 `https://graph.threads.net` |
| `SEO_SITE_URL` | canonical·sitemap·IndexNow 공개 기준 URL. 운영값은 `https://www.caskbycask.net`으로 유지 |
| `INDEXNOW_ENABLED` | IndexNow 비동기 통지 활성화. 키 파일 확인 전에는 `false` 유지 |
| `INDEXNOW_KEY` | 공개 소유 확인 키(8~128자의 a-f/A-F/0-9/-). 활성화 시 `/indexnow-key.txt`에 노출되는 것이 정상 |
| `INDEXNOW_ENDPOINTS` | 쉼표로 구분한 통지 대상. 기본값 `https://www.bing.com/indexnow,https://searchadvisor.naver.com/indexnow`. 장애 대응 외에는 변경하지 않음 |
| `INDEXNOW_ENDPOINT` | (구버전 호환) 단일 대상. 값이 있으면 위 목록에 더해 함께 보내며 중복 주소는 한 번만 통지한다. 기존 서버 값을 지우지 않아도 무방 |
| `YOUTUBE_API_KEY` | (선택·권장) Google Cloud YouTube Data API v3 키. 클라우드 IP 차단 방지용. 미설정 시 공개 RSS/스크래핑으로 동작 |
| `YOUTUBE_SYNC_CRON` | 유튜브 갤러리 정기 수집 주기. **Spring 6필드 cron**(맨 앞이 초), 기본값 `0 25 */3 * * *`(3시간마다) |
| `YOUTUBE_FEED_CONNECT_TIMEOUT_MS` / `YOUTUBE_FEED_READ_TIMEOUT_MS` | 유튜브 RSS·oEmbed 연결/응답 제한 시간. 기본값 3000ms/10000ms |
| `YOUTUBE_AVAILABILITY_CRON` | 삭제·비공개 영상 자동 숨김 점검 주기. **Spring 6필드 cron**, 기본값 `0 40 4 * * *`(매일 04:40) |
| `YOUTUBE_AVAILABILITY_MAX_PER_RUN` | 1회 점검에서 확인할 영상 수 상한. 기본값 300 |
| `YOUTUBE_AVAILABILITY_DELAY_MS` | 점검 시 영상 사이 대기. 기본값 150ms |
| `SLACK_WEBHOOK_URL` | (선택) 운영/백업 알림 |
| `PROD_DB_READONLY_USERNAME` / `PROD_DB_READONLY_PASSWORD` | (선택) 운영 스냅샷 dump 전용 읽기 계정 |
| `DEV_REFRESH_DB_USERNAME` / `DEV_REFRESH_DB_PASSWORD` | (선택) 운영 스냅샷을 `caskbycask_dev` 로 갱신할 때 사용하는 교체 권한 계정 |

> **소셜 로그인 제공자 콘솔 설정** — 네이버/구글 모두 **승인된 redirect URI** 에 `https://www.caskbycask.net/oauth/callback`
> (로컬 개발 시 `http://localhost:5173/oauth/callback`)을 등록해야 한다. 구글은 OAuth 동의 화면에 `openid`,`email`,`profile`
> 스코프가 필요하고, refresh token 수신을 위해 앱이 `access_type=offline` + `prompt=consent` 로 인가 요청한다(코드에 반영됨).
> 등록 redirect URI 가 `OAUTH_ALLOWED_REDIRECT_URIS` 와 다르면 콜백이 `OAUTH_008` 로 거부된다.

### 해외·면세 가격 환율

- API가 매일 `00:05`, `06:05`, `12:05`, `18:05`(Asia/Seoul)에 Frankfurter 공개 참고 환율을 조회한다.
- `TWD`, `USD`, `JPY`, `CNY`, `EUR`의 외화 1단위당 원화 환율과 기준일을 `exchange_rates`에 저장한다.
- 네트워크 오류, HTTP 429 또는 5xx 응답은 최대 3회 시도하며 기본 1초, 2초의 지수 백오프를 적용한다. HTTP 4xx(429 제외)와 응답 검증 오류는 재시도하지 않는다.
- 환율 갱신은 `exchange-rate-scheduling-*` 전용 스케줄러에서 실행되어 재시도 대기 중에도 다른 배치 작업을 막지 않는다.
- 외부 API가 실패하면 기존 행을 덮어쓰지 않고 마지막 정상 환율을 계속 사용한다. 저장 이력이 전혀 없을 때만 사용자가 자동 환산을 선택할 수 없으며 원화 직접 입력은 계속 가능하다.
- 가격 제보에는 등록 당시 환율과 원화 실구매가가 별도 스냅샷으로 저장되므로 이후 환율 갱신이 과거 그래프를 바꾸지 않는다.
- 크롤러가 수집한 외화 딜(`deal_posts`)도 `V96` 부터 같은 방식으로 수집일 환율을 박제한다. 환율 조회에 실패한 행은 원화 환산값이 비어 가격 차트에서 제외되므로, 외화 금액이 원화 축에 그대로 찍히는 일이 없다.
- 목표가 알림은 `V96` 부터 국내/해외/면세 구간별로 설정되며, 비교 기준은 항상 환산 원화다. 기존 알림은 전부 `DOMESTIC` 으로 이관되어 동작이 그대로 유지된다.
- 정상 로그: `Exchange rates refreshed`. 재시도 로그: `Exchange-rate provider request failed; retrying`. 모든 시도 실패 후 최종 로그: `Exchange-rate refresh failed; keeping the last successful rates`.

기존 운영 서버의 `/app/env/api.env`는 배포 시 자동 교체되지 않으므로 아래 값을 직접 확인한 뒤 API를 재시작한다. 변수를 생략하면 애플리케이션 기본값이 적용된다.

```dotenv
EXCHANGE_RATE_CONNECT_TIMEOUT_MS=3000
EXCHANGE_RATE_READ_TIMEOUT_MS=15000
EXCHANGE_RATE_RETRY_MAX_ATTEMPTS=3
EXCHANGE_RATE_RETRY_INITIAL_BACKOFF_MS=1000
```
- 제공자 상태 확인:

```bash
curl -fsS 'https://api.frankfurter.dev/v2/rates?base=EUR&quotes=KRW,USD,JPY,CNY,TWD'
```

```bash
sudo journalctl -u caskbycask-api --since '12 hours ago' | grep -E 'Exchange rates refreshed|Exchange-rate refresh failed'
```

#### V96 배포 직후 1회 — 기존 외화 딜 원화 백필

`V96` 은 스키마만 추가하고 과거 외화 행은 비워 둔다(과거 환율은 SQL 로 구할 수 없다).
아래를 관리자 세션으로 한 번 호출하면 `crawled_at` 기준 과거 환율로 일괄 환산한다. 재실행해도 안전하다.

```bash
curl -fsS -X POST 'https://www.caskbycask.net/api/admin/deals/backfill-krw' -H "Cookie: $ADMIN_SESSION_COOKIE"
```

응답의 `converted`/`skipped` 로 커버리지를 확인하고, 남은 행은 아래로 조회한다.

```bash
mysql -e "SELECT currency, COUNT(*) total, COUNT(deal_price_krw) converted FROM deal_posts GROUP BY currency;"
```

### 유튜브 갤러리 수집·가용성 점검

관리자가 **허락을 받고 등록한** 채널의 최신 영상을 공식 Data API v3 또는 공개 RSS로 따라잡아 `/youtube` 갤러리에 노출한다.
운영 배포는 Flyway `V88`~`V89` 적용이 전제다.

- **Data API v3 우선 지원 (선택/권장)**: Google Cloud Console에서 발급한 `YOUTUBE_API_KEY`가 설정되어 있으면 공식 Data API v3를 사용하므로 OCI/AWS 등 클라우드 환경에서도 IP 차단(403/429) 없이 100% 안정적으로 수집한다.
  (무료 일일 할당량 10,000 unit 중 채널 10개 기준 1회 10 unit 소모로 극히 미미함)
- **RSS fallback**: API 키가 없거나 초과 시 공개 RSS(`youtube.com/feeds/videos.xml`)와 oEmbed로 자동 폴백한다. 피드는 **채널당 최신 15편**만 담으며, 옛 영상은 관리자가 영상 URL로 직접 등록한다.
- **정기 수집**: 기본 3시간마다(`0 25 */3 * * *`, Asia/Seoul). 급할 때는 관리자 화면의 `지금 수집`을 쓴다.
  수집은 넣거나 갱신만 하고 지우지 않으므로, RSS 창 밖으로 밀려난 영상도 DB에는 남는다.
- **가용성 점검**: 기본 매일 `04:40`. oEmbed 응답 코드로 판정해 404(삭제)·401/403(비공개)만 자동 숨김하고,
  429·5xx·네트워크 오류는 `UNKNOWN`으로 두어 **아무것도 바꾸지 않는다**. 다시 재생 가능해지면 자동 복구한다.
  관리자가 직접 숨긴 영상은 점검이 건드리지 않는다.
- 두 작업은 `youtube-sync-scheduling-` **단일 스레드 스케줄러를 공유**하므로 서로 겹쳐 돌지 않는다.
  환율 갱신 등 다른 배치와도 스레드를 나눠 쓰지 않아 서로 밀지 않는다.
- **아웃바운드 허용 대상**: `www.googleapis.com`(Data API), `www.youtube.com`, `youtube.com`(RSS·채널 페이지·oEmbed).
  재생 임베드는 브라우저가 `www.youtube-nocookie.com`으로 직접 요청하므로 서버 방화벽과 무관하다.
- 노출 조건은 **채널 노출 + 채널 허락 확인 + 영상 노출** 셋이 모두 참일 때다.
  창작자가 동의를 철회하면 관리자 화면에서 그 채널 하나만 내리면 소속 영상이 전부 사라진다.

기존 운영 서버의 `/app/env/api.env`는 배포 시 자동 교체되지 않는다. 아래는 전부 애플리케이션
기본값과 같으므로 **생략해도 동작한다.** YouTube API 키를 등록하거나 주기를 조정할 때 추가한 뒤 API를 재시작한다.

```dotenv
YOUTUBE_API_KEY=AIzaSy...
YOUTUBE_SYNC_CRON=0 25 */3 * * *
YOUTUBE_FEED_CONNECT_TIMEOUT_MS=3000
YOUTUBE_FEED_READ_TIMEOUT_MS=10000
YOUTUBE_AVAILABILITY_CRON=0 40 4 * * *
YOUTUBE_AVAILABILITY_MAX_PER_RUN=300
YOUTUBE_AVAILABILITY_DELAY_MS=150
```

> ⚠️ `*_CRON`은 **Spring 6필드 형식**(맨 앞이 초)이다. Unix 5필드로 적으면 API가 기동에 실패한다.
> 시간대는 코드에서 `Asia/Seoul`로 고정되어 있어 별도 설정이 필요 없다.

- 상태 확인:

```bash
# 공개 목록이 응답하는지 (200 기대)
curl -fsS 'https://www.caskbycask.net/api/youtube/videos?page=0&size=1' -o /dev/null -w '%{http_code}\n'

# 정기 수집 / 가용성 점검 결과
sudo journalctl -u caskbycask-api --since '1 day ago' \
  | grep -E '유튜브 갤러리 수집 완료|유튜브 영상 가용성 점검 완료'

# 실패 흔적 (채널별 실패는 해당 채널 행에도 기록된다)
sudo journalctl -u caskbycask-api --since '1 day ago' \
  | grep -E '유튜브 피드 수집 실패|유튜브 갤러리 정기 수집이 중단|유튜브 영상 가용성 점검이 중단'
```

### Instagram·Threads 자동 게시

Meta 앱/권한 준비, 장기 토큰 연결, feature flag 활성화, 상태별 장애 대응은
[`SOCIAL-PUBLISHING.md`](SOCIAL-PUBLISHING.md)를 따른다. 운영 배포는 Flyway `V52`~`V58` 적용 후
최고관리자가 `관리자 > SNS 게시 관리 > 공식 계정`에서 OAuth 연결과 `연결 확인`을 완료한 다음
시험 게시를 거쳐 `SOCIAL_PUBLISH_ENABLED=true`로 전환한다.

Instagram 게시 API는 Graph API `v25.0`으로 고정하며 장기 토큰 교환·갱신은 버전 없는
`graph.instagram.com`을 사용한다. Threads는 공식 Postman 컬렉션의 버전 없는 `graph.threads.net` 호스트를
사용한다. Meta 버전 변경 시에는 [`SOCIAL-PUBLISHING.md`](SOCIAL-PUBLISHING.md)의 연결 확인·시험 게시 게이트를
통과한 뒤 운영값을 변경한다.

Meta 콘솔에 제거·삭제 콜백을 등록하기 전에 Flyway
`V55__create_social_data_deletion_requests.sql`이 포함된 API를 먼저 배포한다. 운영 URL은 다음과 같다.

```text
Instagram 제거: https://www.caskbycask.net/api/social/meta/instagram/deauthorize
Instagram 삭제: https://www.caskbycask.net/api/social/meta/instagram/data-deletion
Threads 제거:   https://www.caskbycask.net/api/social/meta/threads/deauthorize
Threads 삭제:   https://www.caskbycask.net/api/social/meta/threads/data-deletion
```

배포 직후 네 URL을 GET해 `200`과 `status=ready`를 확인한다. 실제 POST는 Meta App Secret으로 서명된
`signed_request`만 허용한다. 제거 요청은 공식 계정 토큰을 삭제하고, 데이터 삭제 요청은 토큰과
Meta 제공 식별자·permalink를 삭제한 뒤 확인 코드 상태 URL을 반환한다. 이 동작은 Meta에 이미 게시된
콘텐츠를 자동 삭제하지 않는다.

생성 이미지는 `/app/upload/social`에 누적되며 Meta가 `/api/social/images/**`로 직접 가져간다.
nginx/Cloudflare에서 이 경로를 인증 또는 hotlink 차단 대상으로 지정하지 않고 디스크·백업 점검에 포함한다.
리뷰 이미지 하단 주류명 자막과 한글 썸네일 합성을 위해 `fonts-noto-cjk`를 설치하고
`fc-match 'Noto Sans CJK KR'` 결과를 배포 전 점검한다. 글꼴이 없으면 SNS 이미지 발행은
실패 이력으로 남고 Meta에는 게시하지 않는다. GitHub Actions의 `build-api` 잡도 테스트 전에
같은 글꼴 패키지를 설치해 운영 서버와 동일한 한글 렌더링 조건을 검증한다.

---

## 10. 롤백 (수동)

자동 롤백은 "직전 배포가 안 뜰 때"만 동작한다. 운영 중 직전 버전으로 수동 롤백:

```bash
# 백엔드 — 현재 실패본을 보존하고 직전 백업 복원
(
set -euo pipefail
cd /app/spring-boot
flock -n 8 || { echo 'API 자동/수동 배포가 진행 중입니다. 먼저 해당 작업을 종료하세요.' >&2; exit 1; }
sudo systemctl stop caskbycask-api
mv app.jar "app.jar.manual_failed_$(date +%Y%m%d-%H%M%S)"
mv app.jar_<타임스탬프> app.jar       # 직전 백업으로 복귀
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

# 프론트 — 현재 실패본을 보존하고 직전 백업 복원
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

> 보관본은 직전 1개뿐. 더 과거로 가려면 해당 커밋을 다시 빌드/배포해야 한다.
> 수동 롤백도 staging 업로드 중인 Actions/로컬 배포와 동시에 실행하지 않는다. 위 잠금은 이미 시작된 교체를 막지만 업로드 중 파일까지 보호하지는 않는다.

---

## 11. 자주 쓰는 명령어 모음 (Cheat Sheet)

```bash
# 상태 점검 (한눈에)
/app/scripts/status.sh          # API + Web + 리소스 요약
/app/scripts/status.sh --log    # 위 + 최근 로그 20줄 추가 출력

# 개별 상태 점검
curl -s http://127.0.0.1:8081/actuator/health    # 백엔드 health
curl -s http://127.0.0.1:3000/healthz             # 프론트엔드 health
curl -s https://www.caskbycask.net/healthz        # 사이트 외부 health
curl -I https://www.caskbycask.net/sitemap.xml    # sitemap index GET/HEAD, Cache-Control/ETag
curl -s https://www.caskbycask.net/sitemap.xml | head
curl -I https://www.caskbycask.net/sitemaps/static.xml
curl -s https://www.caskbycask.net/indexnow-key.txt  # 활성화한 경우에만 200 + 키
# 배포 러너/개발 PC의 소스 체크아웃에서 전체 sitemap, 대표 주류 redirect,
# SNS 허브와 공개 리뷰 상세 경로를 검증
# (/app/next/dist standalone에는 검증 스크립트와 Puppeteer 개발 의존성이 포함되지 않음)
cd /path/to/cask-by-cask/caskbycask-web
SEO_VERIFY_BASE_URL=https://www.caskbycask.net SEO_VERIFY_ALL_URLS=true npm run seo:verify
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
tail -f /app/caskbycask-crawler/logs/wine-cron.log

# 앱 내부 배치 결과 (환율 / 유튜브 갤러리)
sudo journalctl -u caskbycask-api --since '1 day ago' \
  | grep -E 'Exchange rates refreshed|유튜브 갤러리 수집 완료|유튜브 영상 가용성 점검 완료'

# DB 로컬 백업
/app/scripts/backup-db.sh

# 외부 백업(버킷·키·sentinel 사전 설정 후에만)
/app/scripts/backup-offsite.sh
# restore-offsite-drill.sh는 운영 서버 실행 금지. 별도 disposable 격리 호스트에서만 실행.

# 운영 스냅샷으로 개발 DB 갱신(caskbycask_prod -> caskbycask_dev, 마스킹 포함)
/app/scripts/refresh-dev-db-from-prod.sh

# 운영 DB 쿼리 후보 수집(읽기 전용 계정·performance_schema digest만 사용)
DB_AUDIT_CONFIG_FILE=/app/env/db-observer.cnf DB_NAME=caskbycask_prod \
  /app/scripts/collect-db-query-candidates.sh

# 리소스 점검(디스크/SSL) 수동 실행
/app/scripts/check-resources.sh
```

Windows PowerShell에서는 운영 소스와 같은 리비전의 체크아웃에서 아래처럼 실행한다. 전체 sitemap 검증은 운영 부하를 피하기 위해 URL당 기본 1초 간격을 사용하므로 현재 규모에서는 약 10~15분이 걸릴 수 있다.
공개 리뷰 렌더링 검증의 기본 ID는 `11`이며, 해당 환경에 리뷰 11번이 없으면
`SEO_VERIFY_REVIEW_ID`에 실제 공개 리뷰 ID를 지정한다.

```powershell
cd D:\workspace\easymediaProject\cask-by-cask\caskbycask-web
$env:SEO_VERIFY_BASE_URL = 'https://www.caskbycask.net'
$env:SEO_VERIFY_ALL_URLS = 'true'
$env:SEO_VERIFY_BROWSER = 'true'
$env:SEO_VERIFY_REVIEW_ID = '11'
npm.cmd run seo:verify
Remove-Item Env:SEO_VERIFY_BASE_URL, Env:SEO_VERIFY_ALL_URLS, Env:SEO_VERIFY_BROWSER, Env:SEO_VERIFY_REVIEW_ID -ErrorAction SilentlyContinue
```

Codex 샌드박스나 일부 컨테이너처럼 Chrome OS sandbox가 허용되지 않아 Puppeteer 기동이 실패할 때만 `SEO_VERIFY_BROWSER_NO_SANDBOX=true`를 임시로 추가한다. 일반 PC·배포 러너에서는 설정하지 않으며, 신뢰할 수 없는 사이트를 대상으로 사용하지 않는다. 검사 후에는 `Remove-Item Env:SEO_VERIFY_BROWSER_NO_SANDBOX -ErrorAction SilentlyContinue`로 제거한다.

---

## 12. 장애 대응 (트러블슈팅)

| 증상 | 점검 순서 |
|---|---|
| **Cloudflare 521** | nginx 다운 → `sudo systemctl start nginx`. 이후 `systemctl is-enabled caskbycask-api caskbycask-web nginx` 확인 |
| **521 — stop-web.sh 후 배포** | API 배포가 nginx 자동 기동을 시도했는지 Actions 로그 확인. 실패했다면 `sudo systemctl start nginx` 후 `nginx -t`·외부 health 확인 |
| 사이트 502/503 | ① `systemctl status caskbycask-api caskbycask-web` ② `journalctl -u caskbycask-web -n 100` ③ DB/Redis/Next.js 살아있는지 ④ healthz 확인 |
| 점검 페이지가 안 풀림 | `/app/scripts/maintenance.sh status` → `off` 실행. 플래그 파일 `/app/next/maintenance.on` 직접 확인 |
| 점검 우회 URL 이 안 먹힘 | conf 시크릿 3곳 일치 확인 → `nginx -t && reload`. 쿠키 24h 만료 시 URL 재방문 |
| 배포 실패 | Actions 로그에서 `롤백 및 ... 확인 완료` 여부 확인. 없으면 자동 복구도 실패한 것이므로 즉시 `systemctl`·로컬 health 확인 → `journalctl` 원인 분석 후 재배포 |
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

## 14-7. AI 소식·팁 자동화

AI 소식 크롤러의 비밀값은 API의 `/app/env/api.env`가 아니라 `/app/caskbycask-crawler/.env`에서 관리한다.

필수값:

| 키 | 용도 |
|---|---|
| `CASKBYCASK_API_URL` | 같은 서버 API. 운영 권장값 `http://127.0.0.1:8080` |
| `CASKBYCASK_INTERNAL_KEY` | API env와 동일한 내부 인증 키 |
| `TAVILY_API_KEY` | 2시간 주기 한국어·영어 웹 검색 |
| `GEMINI_API_KEY` | Google AI Studio 키. 핫딜 분석과 AI 소식·팁 생성에 공용 사용 |
| `GEMINI_MODEL` | 핫딜 멀티모달 분석 모델. 기본 `gemini-3.1-flash-lite` |
| `GEMINI_REQUEST_INTERVAL_SEC` | 핫딜 Gemini 호출 간격. 기본 5초 |
| `AI_NEWS_CLASSIFIER_MODEL` | 후보·중복 분류 모델 |
| `AI_NEWS_WRITER_MODEL` | 최종 근거 검증·한국어 원고 모델 |
| `AI_NEWS_IMAGE_MODEL` | 팁/정보 글 대표 이미지 모델 |
| `AI_NEWS_IMAGE_GENERATION_ENABLED` | AI 이미지 API 호출 여부. 요금제 활성화 전 기본값 `false` |
| `AI_NEWS_GEMINI_FREE_TIER` | 텍스트 무료 티어 사용 여부. 기본 `true` |
| `AI_NEWS_GEMINI_HARD_MONTHLY_USD` | 관리자 DB 설정과 별개의 절대 안전상한. `0`이면 비활성 |
| `AI_NEWS_GEMINI_HARD_MONTHLY_TOKENS` | 월 토큰 절대 안전상한. `0`이면 비활성 |
| `AI_NEWS_GEMINI_HARD_MONTHLY_IMAGES` | 월 생성 이미지 절대 안전상한. `0`이면 비활성 |

배포 및 확인:

```bash
# Actions: target=crawler 또는 target=all
readlink -f /app/caskbycask-crawler/current
crontab -l | grep caskbycask-crawler
tail -n 100 /app/caskbycask-crawler/logs/ai-news.log
```

- `CRON_TZ=Asia/Seoul` 기준 핫딜은 `current/run.sh`를 짝수 시각 정각(`0 */2 * * *`)에, AI 소식·팁은 핫딜 17분 후(`17 */2 * * *`)에 실행한다.
- `AI_NEWS_IMAGE_GENERATION_ENABLED=false`이면 Gemini 이미지 API를 호출하지 않는다. 승인 공식 이미지가 없는 원고는 이미지 없이 검토 대기로 보존한다.
- AI 원고의 HTML 태그·공백 제외 본문이 1,000자 미만이면 실제 측정 길이와 부족한 글자 수를 넣어 한 번만 재작성한다.
  첫 응답의 Gemini `finishReason`이 `MAX_TOKENS`일 때만 재작성 출력 상한을 8,192토큰으로 명시한다.
- 재작성 후에도 1,000자 미만인 신규 출시·팁·관리자 요청 원고는 폐기하거나 자동 발행하지 않고 이미지 생성 없이
  `PENDING_REVIEW`로 보존한다. 기존 원고 재작성은 짧은 결과로 원문을 덮어쓰지 않고 실패 처리한다.
- 분량 미달 로그에는 `plainTextLength`, `finishReason`, `responseTextLength`, `evidenceSourceCount`,
  `evidenceTextLength`가 기록된다. 검토 대기로 보존된 원고는 Slack `AI 소식 분량 미달 원고 검토 대기`
  경고에서 1·2차 길이와 근거 분량을 확인한다.
- 코드 배포는 `.env`, `targets.json`, SQLite, `logs/`, `temp/`를 덮어쓰지 않는다. `.venv`는 각
  릴리스 안에서 hash lock으로 새로 설치되며 `current`/`previous`와 함께 전환된다.
- 배포는 핫딜·AI 소식·와인 수집의 세 `flock`을 획득한 뒤 cron을 갱신하고 링크를 교체한다. 실행 중 작업이
  120초 안에 끝나지 않거나 cron 갱신이 실패하면 기존 `current`를 유지한다.
- 관리자 화면 기본값은 자동화 OFF·자동발행 OFF·드라이런 ON이다.
- 드라이런 3회와 원고 10건 확인 후 `자동화 → 조건부 자동발행 → 드라이런 해제` 순으로 켠다.
- Tavily 기본 월 한도는 900크레딧이다. Gemini는 토큰/이미지/예상비용을 화면에서 확인하고 필요할 때 월 상한을 입력한다. 텍스트 무료 티어에서도 대표 이미지 생성은 유료다.
- 관리자 비용·토큰·이미지 상한은 80%에서 경고하고 100%에서 신규 호출을 중단한다. 환경변수 절대 상한도 별도로 적용된다.
- 수동 롤백도 세 crawler `flock`을 획득한 뒤 `previous`의 `.venv/bin/python`을 확인하고
  `current` 링크를 교체한다. 정확한 명령은 [`../caskbycask-crawler/DEPLOY.md`](../caskbycask-crawler/DEPLOY.md)를 따른다.

---

## 14-8. Vivino 기반 와인 빈티지 수집

와인 수집은 관리자 `주류 > 와인 크롤링`에서 실행과 결과를 관리하며, 실제 등록 데이터는 관리자 검토 전까지
`HIDDEN`으로 저장한다. 기존 위스키·꼬냑 데이터와 기존 와인의 레코드 형식은 유지하고, 새 와인부터 마스터 아래
`VINTAGE` 변형으로 저장한다.

동작 점검 단계:

1. 관리자에서 `오프라인 테스트 3건`을 눌러 FIXTURE 실행을 만든다.
2. 크롤러에서 `run-wine.sh`를 한 번 실행한다(또는 매시 37분 cron을 기다린다).
3. 관리자 목록에서 3건의 성공·중복 PASS·실패 사유와 숨김 상태를 확인한다.
4. 사용자 상세 미리보기에서 이미지 우측 하단 `VIVINO · SAMPLE` 점수 표시를 확인한다.

FIXTURE는 외부 네트워크를 사용하지 않는 오프라인 점검 데이터다. Vivino 수집은 별도 API나 토큰 없이
공개 HTML만 읽는다. Vivino 측 조건은 한 번에 과도한 호출을 하지 않는 것이므로, 아래 상한을 임의로
올리지 않는다.

크롤러 `.env` 항목 — **모두 선택값이다.** 필수 값은 핫딜과 공유하는 `CASKBYCASK_API_URL`,
`CASKBYCASK_INTERNAL_KEY` 두 개뿐이며 나머지는 코드 기본값으로 동작한다.

| 키 | 용도 |
|---|---|
| `WINE_FIXTURE_PATH` | 오프라인 점검용 3건 JSON. 미설정 시 릴리스 내 기본 경로 사용 |
| `VIVINO_BASE_URL` | 기본값 `https://www.vivino.com`. API URL이 아닌 공개 웹 기준 주소 |
| `VIVINO_START_URLS` | 공개 탐색/카탈로그 시작 페이지. 쉼표로 여러 개 지정 |
| `VIVINO_REQUEST_DELAY_SECONDS` | Vivino 요청 간 최소 간격. 코드가 1초 미만을 허용하지 않으며 운영 권장값은 5초 이상 |
| `VIVINO_DISCOVERY_PAGE_LIMIT` | 실행당 탐색/페이지네이션 HTML 상한. 기본 3, 코드 절대 상한 10 |
| `VIVINO_REQUEST_TIMEOUT_SECONDS` / `VIVINO_MAX_HTML_BYTES` | 요청 시간·HTML 응답 크기 안전 제한 |
| `VIVINO_CRAWLER_USER_AGENT` | 수집 요청에 쓸 User-Agent. 비우면 일반 브라우저 기본값 사용 |
| `SLACK_WEBHOOK_URL` | 와인명·원문 링크·실패 사유 알림. 기존 크롤러 webhook 재사용 |

운영 안전장치:

- 수동 실행(`오프라인 테스트 3건`, `Vivino 수집 시작`)은 언제든 가능하다.
- 예약 실행은 관리자 설정의 `자동 수집`이 켜져 있을 때만 매시 cron이 만든다. 대기 중에 꺼지면 취소된다.
- 실행당 최대 10건, 최근 1시간 예약량 최대 10건을 API와 크롤러 양쪽에서 제한한다.
- 크롤러는 Vivino 공개 HTML의 JSON-LD/페이지 내 구조화 데이터만 파싱한다. 로그인·비공개 endpoint·CAPTCHA·접근 제한은 우회하지 않는다.
- 외부 와인/빈티지 ID와 `생산자 + 정규화 영문명 + 빈티지` 해시를 이중 검사해 중복은 `PASS`한다.
- 영문명은 Vivino 기준으로 HIDDEN 등록하고 국문명은 관리자가 입력한다. 국문명 입력 전에는 검수 완료·공개를 할 수 없다.
- 기존 와이너리를 영문명으로 정확히 찾지 못하거나 필수 필드가 없으면 등록하지 않고 Slack 알림을 보낸다.
- `run-wine.sh`는 전용 `/tmp/caskbycask-wine-crawler.lock`을 사용하고 매시 37분에 실행한다.

운영 확인:

```bash
crontab -l | grep run-wine.sh
/app/caskbycask-crawler/current/run-wine.sh
tail -n 100 /app/caskbycask-crawler/logs/wine-cron.log
```

`.env`의 시작 페이지를 확정하고 `Vivino 수집 시작`으로 1회 검증한 뒤 자동 수집을 켠다.
Vivino HTML 구조가 바뀌어 필수 필드 파싱이 실패하면 자동 수집을 끄고 Slack의 링크·사유를 기준으로 파서를 수정한다.
Vivino가 429나 bot challenge로 응답하기 시작하면 우회하지 말고 `VIVINO_REQUEST_DELAY_SECONDS`를 올리거나
`시간당 최대`를 낮춘다.

---

## 15. 운영 알람 (Slack)

모든 알람은 한 webhook(`SLACK_WEBHOOK_URL`, 채널 `#server-prd`)으로 모인다.
메시지는 **요약 한 줄 + 간단 본문** 규칙(예: `서버장애 - 용량부족` / `/ 디스크 사용량 99% (임계 95%)`).

| 알람 | 트리거 | 구현 | 도는 위치 |
|---|---|---|---|
| 앱 ERROR | ERROR 로그 발생(분당 5건 제한) | `SlackErrorAppender` (logback, prod) | 서버 |
| DB 백업 | 로컬/외부 백업 성공·실패 | `backup-db.sh`, `backup-offsite.sh` | 서버(cron) |
| **배포 결과** | Actions 배포 성공/실패(BE·FE·crawler·배포 단계별) | `deploy.yml` notify job | GitHub |
| **API 비정상 종료** | 크래시·OOM·비정상 exit (`systemctl stop`/배포 재시작은 제외) | `notify-systemd.sh` (ExecStopPost) | 서버 |
| **API 기동** | 서비스 시작(배포·장애복구) | `notify-systemd.sh` (ExecStartPost) | 서버 |
| **디스크/SSL** | 디스크 임계 초과·SSL 만료 임박 | `check-resources.sh` | 서버(cron) |
| **SNS 토큰 만료** | Instagram/Threads 장기 토큰 자동 갱신 실패 후 만료 | `SocialTokenRefreshScheduler` ERROR 로그 → `SlackErrorAppender` | 서버(매일 03:20) |
| **크롤러 장애** | 네이버 카페 쿠키/인증, 내부 API 토큰, Gemini 인증·quota, 게시글 처리 오류 | `caskbycask-crawler/alerts/slack_notifier.py` | 서버(cron) |
| **와인 수집 실패** | 후보 부족, 필수 필드 누락, 저장 오류 (와이너리 미확인은 실패가 아님) | 영문 와인명·Vivino 링크·사유를 `alerts/slack_notifier.py`로 전송 | 서버(매시 37분) |
| **AI 원고 분량 미달** | 1회 재작성 후에도 HTML·공백 제외 본문이 1,000자 미만 | 원고 자동 발행 차단·이미지 생성 생략·관리자 검토 대기 저장 후 Slack 경고 | 서버(cron) |
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
| `Exchange-rate refresh failed; keeping the last successful rates` | 공개 환율 API 네트워크/응답 장애가 최대 재시도 횟수까지 지속됨 | 마지막 정상 환율을 계속 사용. 9장의 제공자 상태 확인 명령과 API 서버 outbound HTTPS를 점검 |

> 위 3개 WARN 은 2026-06-16 이후 빌드부터 사라진다. 다시 나타나면 해당 코드/마이그레이션이 누락된 것.

---

> 📎 관련 문서(레포): `deploy/DEPLOY-PIPELINE.md`(배포 파이프라인 상세), `deploy/server/setup-server.md`(최초 서버 셋업 전체 절차)
> 🔒 이 문서의 `CHANGE_ME_*` 는 운영자가 채우되, **실제 비밀번호·시크릿은 Notion 본문이 아닌 별도 비밀번호 관리자에 보관**하는 것을 권장한다.
