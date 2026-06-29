# 로컬 PC 수동 배포

GitHub Actions 장애 시 사용하는 비상 배포 경로다. 평소에는 GitHub Actions의 **Deploy (manual)** 워크플로를 우선 사용한다.

## 핵심 방향

- API는 로컬 PC에서 `bootJar`를 만든 뒤 SSH/SCP로 서버에 올린다.
- WEB은 기본적으로 로컬 PC가 SSH로 서버 빌드를 지휘한다. Next.js standalone에는 `sharp`, `@next/swc` 같은 OS/CPU별 의존성이 들어갈 수 있어 Windows에서 만든 산출물을 Ubuntu aarch64 운영 서버에 그대로 올리는 방식은 기본값으로 쓰지 않는다.
- 서버의 최종 교체, 재시작, 헬스체크, 롤백은 기존 `/app/scripts/deploy-api.sh`, `/app/scripts/deploy-web.sh`가 담당한다.
- nginx 설정, systemd 유닛, `/app/env/api.env`, 업로드 파일(`/app/upload`)은 건드리지 않는다.

## 사전 조건

로컬 PC:

- PowerShell
- OpenSSH `ssh`, `scp`
- API 배포 시 Java 21과 Gradle wrapper 실행 가능 환경
- WEB 로컬 빌드 모드를 쓸 때만 Node.js/npm과 `tar`

운영 서버:

- 기존 운영 셋업 완료
- `/app/scripts/deploy-api.sh`, `/app/scripts/deploy-web.sh` 실행 가능
- WEB remote 빌드용 Node.js/npm 사용 가능
- 배포 유저가 `systemctl restart caskbycask-api`, `systemctl restart caskbycask-web` 무암호 sudo 가능

## 기본 사용법

레포 루트에서 실행한다.

```powershell
.\deploy\local\manual-deploy.ps1 `
  -Target both `
  -HostName CHANGE_ME_SERVER_IP `
  -User CHANGE_ME_SSH_USER `
  -Port CHANGE_ME_SSH_PORT `
  -KeyPath "$env:USERPROFILE\.ssh\CHANGE_ME_KEY"
```

대상 선택:

```powershell
# API만
.\deploy\local\manual-deploy.ps1 -Target api -HostName CHANGE_ME_SERVER_IP -User CHANGE_ME_SSH_USER -KeyPath "$env:USERPROFILE\.ssh\CHANGE_ME_KEY"

# WEB만
.\deploy\local\manual-deploy.ps1 -Target web -HostName CHANGE_ME_SERVER_IP -User CHANGE_ME_SSH_USER -KeyPath "$env:USERPROFILE\.ssh\CHANGE_ME_KEY"
```

## WEB 배포 방식

기본값은 `-WebBuildMode remote`다.

1. 로컬에서 `caskbycask-web` 소스를 `deploy/.manual-artifacts/web/web-src.tar.gz`로 묶는다.
2. 서버 `/app/manual-build/web-src.tar.gz`로 올린다.
3. 서버에서 `npm ci`, `npm run build`를 실행한다.
4. `.next/standalone`에 `.next/static`과 `public`을 포함해 `/app/next/dist.new`에 준비한다.
5. `/app/scripts/deploy-web.sh`가 운영본으로 교체하고 헬스체크 실패 시 롤백한다.

Windows 로컬 산출물을 꼭 올려야 하는 예외 상황에서는 아래처럼 명시적으로 허용해야 한다.

```powershell
.\deploy\local\manual-deploy.ps1 `
  -Target web `
  -HostName CHANGE_ME_SERVER_IP `
  -User CHANGE_ME_SSH_USER `
  -WebBuildMode local `
  -AllowCrossPlatformWebBuild
```

이 모드는 운영 서버와 OS/CPU가 다르면 실패할 수 있으므로 권장하지 않는다.

## 유용한 옵션

| 옵션 | 설명 |
|---|---|
| `-Target both/api/web` | 배포 대상 선택 |
| `-WebBuildMode remote/local` | WEB 빌드 위치 선택. 기본값 `remote` |
| `-SkipBuild` | 이미 만들어 둔 `deploy/.manual-artifacts` 산출물을 재사용 |
| `-SkipNpmCi` | WEB 빌드 시 `npm ci` 대신 서버에서 `npm install` 사용 |
| `-SkipScriptUpload` | `deploy/server/*.sh` 서버 업로드 생략 |
| `-JavaHome` | 로컬 Java 21 경로 직접 지정 |

## 배포 후 확인

```bash
/app/scripts/status.sh
systemctl status caskbycask-api caskbycask-web --no-pager
curl -fsS http://127.0.0.1:8081/actuator/health/readiness
curl -fsS http://127.0.0.1:3000/healthz
```

## 주의

- 이 경로는 GitHub Actions 장애 시 쓰는 비상 절차다. 평소 배포 이력과 Slack 결과 알림은 Actions 기준으로 남긴다.
- 수동 배포는 로컬 작업 트리의 현재 상태를 그대로 배포할 수 있다. 배포 전 IDE에서 대상 변경 파일을 반드시 확인한다.
- DB 스키마 변경이 포함된 API 배포는 Flyway 마이그레이션 파일이 포함되어야 한다.
- WEB remote 빌드는 서버에서 npm 패키지를 내려받을 수 있어야 한다.
