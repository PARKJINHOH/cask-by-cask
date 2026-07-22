# CaskByCask 외부 백업·복원 훈련

`/app/db_backup`과 `/app/upload`는 운영 인스턴스의 같은 디스크에 있으므로 로컬 백업만으로는
인스턴스·볼륨 장애를 복구할 수 없습니다. 이 절차는 별도 private OCI Object Storage 버킷에
매일 복제하고, **운영 서버와 분리된 disposable 호스트**에서 실제 복원을 검증합니다.

춘천 리전 Object Storage는 인스턴스·볼륨 장애에 대한 1단계 보호입니다. 춘천 리전 전체 장애가
RPO/RTO 범위에 포함되면 서울 등 다른 리전 사본을 별도 2단계로 설계해야 합니다.

## 1. OCI 사전 설정 — 자동화하지 않는 운영 승인 항목

1. 배포 아티팩트와 다른 춘천 리전 private bucket을 생성합니다.
2. Object Versioning을 활성화하고 public access가 `NoPublicAccess`인지 확인합니다.
3. lifecycle을 다음 prefix별로 설정하고 개발 prefix에서 먼저 시험합니다.
   - timestamp가 붙는 `production/database/`, `production/manifests/`, SHA sidecar의 latest 보관 기간
   - `production/uploads/current/`은 active 객체를 age만으로 삭제하지 않고 noncurrent version 보관만 적용
   - 실패한 multipart upload 정리
4. 백업 전용 OCI 사용자와 Customer Secret Key를 발급합니다. 배포 키를 재사용하지 않습니다.
   백업 writer에는 대상 bucket에 제한된 `BUCKET_INSPECT`, `BUCKET_READ`, `OBJECT_INSPECT`,
   `OBJECT_READ`, `OBJECT_CREATE`, `OBJECT_OVERWRITE`만 허용하고 `OBJECT_DELETE`와
   `OBJECT_VERSION_DELETE`는 부여하지 않습니다.
5. lifecycle 규칙은 `Latest version of objects`와 `Previous versions of objects`를 구분합니다.
   춘천 리전 서비스 principal `objectstorage-ap-chuncheon-1`에도 대상 bucket에 제한된
   `BUCKET_INSPECT`, `BUCKET_READ`, `OBJECT_INSPECT`, `OBJECT_DELETE`,
   `OBJECT_VERSION_DELETE` 권한을 부여합니다. tier 전환 규칙을 쓸 때만 `OBJECT_UPDATE_TIER`도
   추가합니다. 이 regional service policy는 OCI 문서 지침대로 tenancy root compartment에
   생성합니다.
6. 복원 훈련에는 `BUCKET_INSPECT`, `BUCKET_READ`, `OBJECT_INSPECT`, `OBJECT_READ`만 가진
   별도 read-only 사용자를 사용합니다. Customer Secret Key는 자동 만료되지 않으므로
   두 키를 겹쳐 교체하는 방식으로 정기 회전합니다.

versioning과 lifecycle은 S3 호환 API에서 신뢰성 있게 조회할 수 있는 항목이 아니므로 OCI Console
또는 인증된 OCI Cloud Shell/native CLI에서 최초 설정과 정기 점검을 기록합니다.

```bash
oci os bucket get --namespace-name '<namespace>' --bucket-name '<bucket>' \
  --query 'data.{public:"public-access-type",versioning:versioning}'
oci os object-lifecycle-policy get --namespace-name '<namespace>' --bucket-name '<bucket>'
```

참고: [OCI S3 호환 API](https://docs.oracle.com/en-us/iaas/Content/Object/Tasks/s3compatibleapi.htm),
[Object Versioning](https://docs.oracle.com/en-us/iaas/Content/Object/Tasks/usingversioning.htm),
[Lifecycle](https://docs.oracle.com/en-us/iaas/Content/Object/Tasks/usinglifecyclepolicies.htm)

## 2. 운영 서버 설정

AWS CLI는 [AWS 공식 설치 문서](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)의
운영 서버 아키텍처용 CLI v2를 설치하고 `aws --version`을 운영 기록에 남깁니다. 자동 최신화하지
말고 검증한 버전으로 고정한 뒤 별도 점검에서 갱신합니다.

배포 workflow는 `deploy/server/*.sh`를 `/app/scripts/`로 전송하지만 비밀 환경 파일과 cron은
의도적으로 자동 활성화하지 않습니다.

```bash
sudo cp /path/to/deploy/env/backup.env.example /app/env/backup.env
sudo chown ubuntu:ubuntu /app/env/backup.env
sudo chmod 600 /app/env/backup.env
sudo -u ubuntu nano /app/env/backup.env

# 잘못된 UPLOAD_PATH가 /app 같은 상위 경로를 외부로 복제하지 못하도록 로컬 marker를 둔다.
printf '%s\n' 'caskbycask-upload-root-v1' \
  | sudo -u ubuntu tee /app/upload/.caskbycask-upload-root >/dev/null
sudo chmod 600 /app/upload/.caskbycask-upload-root
```

`backup.env`에 실제값을 입력하고 다음 확인값을 채웁니다.

```properties
OCI_BACKUP_VERSIONING_CONFIRMED=true
OCI_BACKUP_TARGET_CONFIRMATION=<bucket>/production
OFFSITE_DB_SOURCE_CONFIRMED=/app/db_backup
OFFSITE_UPLOAD_SOURCE_CONFIRMED=/app/upload
```

OCI Console에서 복사한 HTTPS **path-style S3 호환 endpoint**만 사용합니다. 스크립트는 현재 region의
`*.compat.objectstorage.<region>.oraclecloud.com` 또는 OCI가 안내하는
`*.compat.objectstorage.<region>.oci.customer-oci.com` 형식 외에는 자격증명을 보내지 않습니다.

원격 대상 오입력을 막는 sentinel을 **최초 한 번만** 생성합니다. 다음 명령은 `backup.env`의
값을 다시 확인한 뒤 운영 사용자 셸에서 실행합니다.

```bash
. /app/env/backup.env
sentinel=$(mktemp)
aws_config=$(mktemp)
printf 'caskbycask-offsite-backup-v1\nbucket=%s\nprefix=%s\n' \
  "$OCI_BACKUP_BUCKET" "$OCI_BACKUP_PREFIX" > "$sentinel"
cat > "$aws_config" <<EOF
[default]
region = $OCI_BACKUP_REGION
s3 =
    addressing_style = path
    payload_signing_enabled = false
EOF
chmod 600 "$aws_config"
export AWS_ACCESS_KEY_ID="$OCI_BACKUP_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$OCI_BACKUP_SECRET_ACCESS_KEY"
export AWS_CONFIG_FILE="$aws_config"
export AWS_SHARED_CREDENTIALS_FILE=/dev/null
AWS_REQUEST_CHECKSUM_CALCULATION=when_required \
AWS_RESPONSE_CHECKSUM_VALIDATION=when_required \
aws s3 cp "$sentinel" \
  "s3://$OCI_BACKUP_BUCKET/$OCI_BACKUP_PREFIX/.caskbycask-backup-target" \
  --endpoint-url "$OCI_BACKUP_ENDPOINT" --region "$OCI_BACKUP_REGION"
rm -f "$sentinel" "$aws_config"
unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_CONFIG_FILE AWS_SHARED_CREDENTIALS_FILE
unset OCI_BACKUP_ACCESS_KEY_ID OCI_BACKUP_SECRET_ACCESS_KEY
```

환경 파일, Access Key, Secret Key는 Git과 GitHub Secrets에 저장하지 않습니다.

## 3. 최초 수동 백업 검증

```bash
/app/scripts/backup-db.sh
/app/scripts/backup-offsite.sh
```

성공 기준:

- 로컬 dump의 gzip 무결성 검사 통과
- `production/database/*.sql.gz`와 `.sha256` 생성
- `production/uploads/current/**` 동기화
- `production/uploads/current/.caskbycask-generation`이 `complete` 상태
- 모든 단계가 끝난 후에만 `production/manifests/backup-*.env` 생성
- 로그나 `ps` 명령행에 DB 비밀번호가 노출되지 않음

manifest가 없는 DB 객체는 중간 실패 산출물이며 복원 대상으로 사용하지 않습니다. SHA-256은
전송·저장 손상 검사용이지 작성자 인증 서명이 아닙니다. 접근 통제, versioning, 감사 로그가
백업의 신뢰 경계입니다.

## 4. 업로드 완료 상태와 원격 삭제 정책

이번 릴리스는 `uploads/current/`에 추가·갱신만 수행하고 `aws s3 sync --delete`를 지원하지
않습니다. 잘못된 로컬 경로나 비정상적인 대량 삭제가 외부 백업에 전파되는 위험이 더 크기
때문입니다. 각 sync 직전에 generation을 `in-progress`로 바꾸고 성공 후에만 `complete`로
전환합니다. 복원 훈련은 최신 완료 manifest의 generation과 원격 generation이 정확히 같을
때만 진행하므로, 다음 sync가 중간 실패한 상태를 이전 정상 백업으로 오인하지 않습니다.

로컬에서 삭제된 업로드의 원격 current 객체와 이전 version은 자동 삭제되지 않습니다. 외부
백업의 개인정보 보존기간을 정하고, 활성 객체까지 지우는 단순 age lifecycle이 아니라 retained
manifest 기준 snapshot/garbage-collection 설계를 별도 검증하기 전에는 자동 원격 삭제를 추가하지
않습니다. versioning은 복구 가능성을 제공할 뿐 lifecycle 이후의 영구 삭제를 되돌리지 못합니다.

## 5. 매일 자동 백업 — 기존 crontab과 분리

전역 `CRON_TZ`를 수정하지 않도록 백업 전용 `/etc/cron.d` 파일을 사용합니다. 기존 사용자
crontab에서는 `backup-db.sh`가 들어간 **작업 한 줄만** `crontab -e`로 제거하고 다른
`CRON_TZ`나 crawler 관리 블록은 건드리지 않습니다.

```bash
sudo install -o root -g root -m 644 \
  /path/to/deploy/cron/caskbycask-backup /etc/cron.d/caskbycask-backup
sudo install -o root -g root -m 644 \
  /path/to/deploy/logrotate/caskbycask-backup /etc/logrotate.d/caskbycask-backup
sudo systemctl status cron --no-pager
sudo logrotate -d /etc/logrotate.d/caskbycask-backup
```

다음 날 완료 manifest와 로그를 확인합니다.

```bash
sudo tail -n 100 /app/logs/backup-db.log
sudo cat /etc/cron.d/caskbycask-backup
```

## 6. 월간 복원 훈련 — 운영 서버 실행 금지

복원 스크립트는 외부 SQL을 실행하므로 운영 MariaDB socket, 운영 data volume, 운영 DB
자격증명을 절대 사용하지 않습니다. 매월 disposable OCI 인스턴스 또는 동등하게 격리된 호스트를
준비하고 그 호스트에서만 실행합니다.

1. 격리 호스트에 MariaDB client/server, 검증한 AWS CLI v2, 저장소의
   `restore-offsite-drill.sh`와 별도 `backup.env`를 준비합니다.
2. 운영 볼륨을 mount하지 않고 운영 DB로 향하는 네트워크 경로를 Security List/방화벽으로
   차단합니다.
3. 격리 MariaDB에 비어 있는 `caskbycask_restore_drill_validation` DB와 그 DB에만 권한을 가진
   non-root 사용자를 만듭니다. 전역 권한이 있으면 스크립트가 중단됩니다.
4. 격리 호스트 marker와 machine ID를 설정합니다.
5. DB dump 다운로드용 디스크 경로를 만들고 실행 사용자만 접근하도록 합니다. `/run`은 tmpfs이므로
   작업공간으로 사용하지 않습니다.

```bash
sudo install -d -o root -g root -m 755 /etc/caskbycask
printf '%s\n' 'caskbycask-isolated-restore-host-v1' \
  | sudo tee /etc/caskbycask/restore-drill-host >/dev/null
sudo chmod 644 /etc/caskbycask/restore-drill-host
cat /etc/machine-id
sudo install -d -o '<restore-user>' -g '<restore-user>' -m 700 /var/tmp/caskbycask-restore
```

격리 DB 관리자에게 다음과 동등한 작업을 수행하게 합니다. 비밀번호는 예시 SQL이나 셸 history에
직접 남기지 않습니다.

```sql
CREATE DATABASE caskbycask_restore_drill_validation
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'caskbycask_restore_drill'@'127.0.0.1' IDENTIFIED BY '<restore-only-password>';
GRANT ALL PRIVILEGES ON caskbycask_restore_drill_validation.*
  TO 'caskbycask_restore_drill'@'127.0.0.1';
```

격리 호스트의 `backup.env`에는 read-only Object Storage 키와 아래 확인값을 넣습니다.

```properties
RESTORE_DRILL_ISOLATION_CONFIRMED=true
RESTORE_DRILL_EXPECTED_MACHINE_ID=<격리 호스트 /etc/machine-id>
RESTORE_DRILL_TARGET_CAPACITY_CONFIRMED=true
RESTORE_DRILL_WORK_DIR=/var/tmp/caskbycask-restore
RESTORE_DRILL_WORK_DIR_CONFIRMED=/var/tmp/caskbycask-restore
RESTORE_DRILL_DB_TARGET_CONFIRMATION=127.0.0.1:3306/caskbycask_restore_drill_validation
```

root가 아닌 복원 훈련 사용자로 실행합니다.

```bash
/app/scripts/restore-offsite-drill.sh
```

스크립트는 최신 **완료 manifest**만 선택하고 freshness, 원격 크기, SHA-256, gzip, 로컬 여유
공간을 검사합니다. 제한 DB 계정의 권한 범위와 빈 schema를 확인한 뒤 timeout·낮은 CPU 우선순위로
import하고 `mariadb-check`와 업로드 표본을 검증합니다.

운영 기록에는 완료 manifest 시각(RPO), 총 복원 시간(RTO), dump 크기, 테이블 수, 실행 호스트,
성공/실패 원인을 남긴 뒤 격리 인스턴스와 복원 키를 폐기합니다. 최초 수동 훈련이 성공하기 전에는
외부 백업을 “복구 가능” 상태로 간주하지 않습니다.

실제 재해 복구는 새 DB/새 인스턴스에서 동일 검증을 먼저 수행한 뒤 점검 모드, 현재 잔존 데이터
추가 백업, API 중지, 제한된 복원, Flyway 버전 확인, readiness 검증 순서로 진행합니다.
