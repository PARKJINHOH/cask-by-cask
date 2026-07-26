# Instagram·Threads 자동 게시 운영 가이드

이 문서는 리뷰와 커뮤니티 소식(일반/AI)을 CaskByCask 공식 Instagram·Threads 계정에 게시하는 기능의 설정, 발급, 운영 및 장애 대응 절차를 설명한다.

## 1. 기능 범위

- 플랫폼별 체크박스의 기본값은 `false`다.
- 원본 저장과 Meta API 호출은 분리된다. 원본 저장 후 워커가 비동기로 게시하므로 Meta 장애가 원본 저장을 되돌리지 않는다.
- 이미 게시된 SNS 콘텐츠는 원본 수정·삭제와 동기화하지 않는다.
- SNS 삭제는 관리 화면의 permalink를 열어 Instagram 또는 Threads에서 직접 수행한다.
- 관리 이력은 `V52` 적용 이후 게시를 요청한 콘텐츠부터 남는다.
- 일반 리뷰는 저장 후 자동 게시하고, 하위 에디션 리뷰는 관리자 승인으로 실제 `Review`가 만들어진 뒤 게시한다.
- AI 소식 예약 발행은 예약 시 요청을 보관하고 실제 `Post` 발행 뒤 게시한다.
- 실패한 플랫폼만 작성자 또는 관리자가 수동 재시도할 수 있다. 성공했거나 최초 저장 때 요청하지 않은 플랫폼은 수정 화면에서 선택할 수 없다.
- 예외적으로 `V57` 적용 시점에 이미 존재한 리뷰는 `legacy_social_publish_allowed=1`로 표시되어,
  게시 이력이 없는 Instagram·Threads 플랫폼을 수정 화면에서 최초 1회 요청할 수 있다.
- `V57` 적용 이후 생성되는 리뷰의 위 플래그 기본값은 `0`이므로, 신규 리뷰는 작성 시 선택하지 않은 플랫폼을
  수정 화면에서 나중에 추가할 수 없다는 기존 규칙을 그대로 유지한다.
- 기존 리뷰 최초 게시 API도 이미 게시 이력이 존재하는 플랫폼을 제외해 중복 게시 요청을 만들지 않는다.
- `V58`은 `notifications.type` ENUM에 `SOCIAL_PUBLICATION`을 추가한다. 이 값이 없으면 SNS 게시 자체는
  성공해도 완료·실패 알림 저장이 실패하면서 Slack ERROR가 발생한다.

### 게시 이미지

- 최종 파일은 서버에서 `1080×1350` JPEG로 만든다.
- 리뷰 대표 이미지는 비율을 유지해 전부 보이도록 축소하고, 남는 영역은 블러 배경 없이 흰색으로 채운다.
- 리뷰 대표 이미지 하단 중앙에는 게시 언어에 맞춘 주류명을 어두운 직사각형 배경과 흰색 굵은 글씨로
  최대 2줄까지 합성한다. 긴 이름은 모바일 가독성을 유지하도록 말줄임 처리한다.
- 리뷰 본문은 테이스팅 노트를 제외하고 향·맛·피니시별 아로마 휠 항목을 각각 최대 80자로 표시한다.
- 리뷰 제목은 `주류명 후기`로 표시한다.
- 리뷰 캡션은 `링크 > 주류 제목 > 아로마 본문 > 총평` 순서로 글자 수를 확보한다.
- 총평은 최대 200자로 표시하되 앞선 항목을 배치하고 남은 글자 수가 부족하면 `...`으로 줄인다.
- 리뷰 링크는 별도 접두 문구 없이 짧은 URL만 표시하며 플랫폼 제한에서도 자르지 않는다.
- Instagram 리뷰에는 주류 제목 바로 다음에 `전체 리뷰는 프로필 링크에서 확인하세요 🔗`와
  짧은 URL을 배치한다. URL은 그대로 유지하며 안내 문구와 URL을 우선 확보한 뒤
  나머지 본문 길이를 계산한다. Threads에는 이 안내 문구를 추가하지 않고 URL을 본문 마지막에 배치한다.
- 리뷰 해시태그는 사용자 입력 없이 `#카테고리 #주류이름 #캐바캐 #CaskByCask` 순서로 자동 생성한다.
  카테고리가 위스키·와인·꼬냑이면 각각 `#위스키`, `#와인`, `#꼬냑`을 첫 번째 태그로 추가하고
  그 외 카테고리는 카테고리 태그를 생략한다. 주류 이름 태그에서는 공백·괄호·기호를 제거한다.
  국문 게시물의 주류 이름 태그는 국문 필드만, 영문 게시물은 영문 필드만 조합하며
  영문 에디션 식별 값이 없을 때 국문 값을 섞어 넣지 않는다.
  해시태그는 Instagram·Threads 본문 하단에 배치하되 Threads에서는 전체 리뷰 URL보다 앞에 둔다.
- 소식은 관리자가 등록한 배경과 텍스트를 합성하거나 이미지를 직접 업로드한다.
- 소식 배경과 직접 업로드 이미지의 권장 해상도는 `1080×1350px(4:5)`이며, 등록 화면의 이미지 편집기에서 4:5로 자른다.
- 직접 업로드 이미지는 편집 결과가 최종 캔버스를 채우도록 정규화한다. 리뷰 이미지에 사용하는 블러 여백은 적용하지 않는다.
- 생성 파일은 `storage.local.base-path/social/YYYYMM/`에 저장되고 `/api/social/images/**`로 공개된다.
- Meta가 서버에서 이미지를 가져가므로 `SOCIAL_PUBLIC_MEDIA_BASE_URL`은 외부에서 HTTPS로 접근 가능해야 하며 Cloudflare/nginx에서 해당 경로를 로그인·봇 차단하면 안 된다.
- 한글 텍스트 합성에는 운영 서버의 `fonts-noto-cjk`가 필요하다. 글리프가 없으면 네모 글자를 게시하지 않고 해당 발행을 실패 처리한다.

### 짧은 URL

- 게시 본문은 `https://www.caskbycask.net/s/{code}`를 사용한다.
- nginx는 `/s/**`, `/ko/s/**`, `/en/s/**`를 API로 직접 전달한다.
- Next.js에도 같은 경로의 API 전달 route를 두어 nginx 설정 반영 전이나 기존 308 캐시로 `/ko/s/**`가 남은 경우에도 404가 발생하지 않게 한다.
- API는 리뷰의 공개 URL 또는 소식 상세 URL로 `302` 이동한다.

## 2. Meta 사전 준비

Meta 콘솔 UI와 심사 정책은 변경될 수 있다. 설정 시 다음 공식 문서와 App Dashboard에 표시되는 최신 요구사항을 함께 확인한다.

- [Instagram API with Instagram Login 시작](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/get-started)
- [Instagram Platform 문서](https://developers.facebook.com/docs/instagram-platform)
- [Threads API 시작](https://developers.facebook.com/docs/threads/get-started)
- [Threads API 변경 이력](https://developers.facebook.com/docs/threads/changelog)
- [Meta 데이터 삭제 콜백](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback/)
- [Meta 공식 Instagram Postman 컬렉션](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api)
- [Meta 공식 Threads Postman 컬렉션](https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api)

콜백 URL은 Meta 콘솔에 저장하기 전에 운영 API에 먼저 배포해야 한다. Meta의 URL 확인 및 실제 콜백은
로그인 없이 외부 HTTPS로 접근할 수 있어야 하며 nginx/Cloudflare에서 POST, 폼 데이터 또는 Meta 요청을
차단하면 안 된다. 제거·삭제 콜백은 `signed_request`를 해당 플랫폼 App Secret으로 HMAC-SHA256 검증한다.

### Instagram

1. 자동 게시할 계정을 Instagram 프로페셔널 계정(Business 또는 Creator)으로 준비한다.
2. Meta for Developers에서 Business 유형 앱을 만들거나 기존 Business 앱을 선택한다.
3. `Instagram API with Instagram Login` 제품을 추가한다.
4. Instagram 로그인 설정에 다음 redirect URI를 정확히 등록한다.

   `https://www.caskbycask.net/api/admin/social/accounts/oauth/callback`

5. 최소 권한을 설정한다.

   - `instagram_business_basic`
   - `instagram_business_content_publish`

6. 앱이 개발 모드라면 연결할 공식 Instagram 계정을 앱 역할/테스터로 등록하고 초대를 수락한다.
7. 앱 역할이 아닌 계정도 연결해야 하거나 Meta가 Live 전환 때 요구하면 Business Verification과 App Review에서 위 권한의 Advanced Access를 신청한다. 심사 영상에는 최고관리자 계정 연결, 게시 요청, 게시 완료 링크 확인 흐름을 포함한다.
8. Instagram 로그인 설정에 다음 운영 콜백을 등록한다.

   - 승인 취소(제거) 콜백 URL:
     `https://www.caskbycask.net/api/social/meta/instagram/deauthorize`
   - 데이터 삭제 요청 콜백 URL:
     `https://www.caskbycask.net/api/social/meta/instagram/data-deletion`

### Threads

1. Meta 앱에 Threads API 사용 사례를 추가한다.
2. App Dashboard에 표시되는 Threads App ID와 Threads App Secret을 확인한다.
3. Threads API 설정에 Instagram과 동일한 redirect URI를 정확히 등록한다.
4. 최소 권한을 설정한다.

   - `threads_basic`
   - `threads_content_publish`

5. 개발 모드에서는 공식 Threads 계정을 테스터로 추가하고 Threads 설정에서 초대를 수락한다.
6. 앱 역할 밖의 계정을 연결할 경우 App Review/Advanced Access 요구사항을 완료한다.
7. Threads API 설정에 다음 운영 콜백을 등록한다.

   - 리디렉션 콜백 URL:
     `https://www.caskbycask.net/api/admin/social/accounts/oauth/callback`
   - 제거 콜백 URL:
     `https://www.caskbycask.net/api/social/meta/threads/deauthorize`
   - 삭제 콜백 URL:
     `https://www.caskbycask.net/api/social/meta/threads/data-deletion`

### 제거·데이터 삭제 처리

- Meta는 제거·삭제 콜백을 `application/x-www-form-urlencoded` POST의 `signed_request`로 호출한다.
- API는 URL 경로의 플랫폼에 맞는 Instagram 또는 Threads App Secret으로 서명을 검증한다.
- 제거 콜백은 일치하는 공식 계정 연결과 암호화 access token만 제거한다. 기존 SNS 게시물과 게시 이력은
  자동 삭제하지 않는다.
- 데이터 삭제 콜백은 공식 계정 연결을 제거하고 해당 플랫폼 게시 이력에서 Meta가 반환한 container ID,
  media ID, permalink, provider 오류 정보를 지운다. 원본 리뷰·소식 및 자체 생성한 게시 스냅샷은 유지한다.
- 삭제 처리는 동기 완료 후 영구 확인 코드를 발급하고 다음 공개 상태 URL을 Meta에 반환한다.

  `https://www.caskbycask.net/api/social/meta/data-deletion/status/{confirmationCode}`

- 유효하지 않은 서명은 `400`, 설정되지 않은 App Secret이나 서버 장애는 `5xx`로 응답한다. 콜백 본문,
  App Secret, access token, 원본 외부 사용자 ID는 로그에 남기지 않는다.
- 브라우저로 각 제거·삭제 콜백 URL을 GET 했을 때 `{"status":"ready",...}`가 반환되어야 한다.

## 3. 운영 환경변수

`/app/env/api.env`에 다음 값을 설정한다. 실제 secret이나 access token을 Git에 저장하지 않는다.

```dotenv
SOCIAL_PUBLISH_ENABLED=false
SOCIAL_PUBLIC_MEDIA_BASE_URL=https://www.caskbycask.net
SOCIAL_OAUTH_REDIRECT_URI=https://www.caskbycask.net/api/admin/social/accounts/oauth/callback
SOCIAL_TOKEN_ENCRYPTION_KEY=BASE64_32_BYTE_KEY
SOCIAL_HTTP_CONNECT_TIMEOUT=5s
SOCIAL_HTTP_READ_TIMEOUT=20s
SOCIAL_INSTAGRAM_APP_ID=...
SOCIAL_INSTAGRAM_APP_SECRET=...
SOCIAL_INSTAGRAM_API_BASE_URL=https://graph.instagram.com/v25.0
SOCIAL_INSTAGRAM_TOKEN_API_BASE_URL=https://graph.instagram.com
SOCIAL_THREADS_APP_ID=...
SOCIAL_THREADS_APP_SECRET=...
SOCIAL_THREADS_API_BASE_URL=https://graph.threads.net
SOCIAL_THREADS_TOKEN_API_BASE_URL=https://graph.threads.net
```

Instagram 게시·조회 API는 Graph API `v25.0`으로 고정하고, 장기 토큰 교환·갱신 API는 버전이 없는
`https://graph.instagram.com`을 사용한다. 두 주소를 하나로 합치면 토큰 갱신 경로가 잘못될 수 있으므로
`SOCIAL_INSTAGRAM_API_BASE_URL`과 `SOCIAL_INSTAGRAM_TOKEN_API_BASE_URL`을 구분한다.
Threads는 Meta 공식 Postman 컬렉션의 현재 호스트인 `https://graph.threads.net`을 게시·토큰 API에 사용한다.

Meta가 API 버전을 올리거나 폐기 일정을 공지했을 때만 `SOCIAL_INSTAGRAM_API_BASE_URL`,
`SOCIAL_INSTAGRAM_OAUTH_API_BASE_URL`, `SOCIAL_INSTAGRAM_TOKEN_API_BASE_URL`,
`SOCIAL_THREADS_API_BASE_URL`, `SOCIAL_THREADS_OAUTH_API_BASE_URL`,
`SOCIAL_THREADS_TOKEN_API_BASE_URL`을 공식 문서에 맞춰 변경한다. 버전 변경은 운영에 바로 적용하지 않고
공식 계정 `연결 확인`과 플랫폼별 시험 게시를 먼저 통과시킨다.

Meta HTTP 연결 제한 시간은 5초, 응답 제한 시간은 20초다. 시간 초과는 원본 저장을 실패시키지 않으며
비동기 게시 이력에서 재시도 또는 결과 확인 상태로 처리한다. 운영 장애 대응 외에는 무작정 늘리지 않는다.

암호화 키 생성:

```bash
openssl rand -base64 32
```

`SOCIAL_TOKEN_ENCRYPTION_KEY`는 DB의 Meta access token을 AES-256-GCM으로 암호화하는 키다. 운영 중 임의로 회전하면 기존 토큰을 복호화할 수 없으므로 먼저 공식 계정을 해제하고 새 키 적용 후 다시 연결한다.

## 4. 장기 토큰 발급·연결

토큰 문자열을 수동으로 환경변수에 넣지 않는다. 구현된 최고관리자 OAuth 흐름이 인가 코드를 장기 토큰으로 교환하고 암호화해 DB에 저장한다.

1. 환경변수 설정 후 API를 재시작한다.
2. `SOCIAL_PUBLISH_ENABLED=false` 상태로 최고관리자 계정에 로그인한다.
3. `관리자 > SNS 게시 관리 > 공식 계정`을 연다.
4. Instagram의 `공식 계정 연결`을 누르고 게시할 공식 계정으로 로그인해 권한을 승인한다.
5. Threads도 같은 방식으로 연결한다.
6. 각 계정의 `연결 확인`을 눌러 username, 상태, 만료일이 정상인지 확인한다.
7. `SOCIAL_PUBLISH_ENABLED=true`로 변경하고 API를 재시작한다.
8. 비공개 운영용 리뷰/소식 한 건으로 플랫폼별 시험 게시 후 permalink, 이미지 비율, 본문, 짧은 URL과 `/ko/social` 허브를 확인한다.

OAuth에서 받은 단기 토큰은 서버가 즉시 장기 토큰으로 교환한다. 매일 03:20(Asia/Seoul)에 만료 14일 이내 토큰을 자동 갱신한다. 자동 갱신에 실패해 만료되면 ERROR 로그와 Slack 오류 알림 대상이 되며 관리 화면에서 `다시 연결`해야 한다.

## 5. 배포 순서

1. DB 백업과 배포 점검 절차를 수행한다.
2. API를 배포해 Flyway `V52__create_social_publishing.sql`,
   `V53__add_social_publication_operational_indexes.sql`,
   `V55__create_social_data_deletion_requests.sql`을 적용한다.
3. Web을 배포한다.
4. `/app/env/api.env`에 Meta 설정을 추가한 뒤 API를 재시작한다.
5. `fc-match 'Noto Sans CJK KR'`로 한글 합성 글꼴을 확인한다. 없으면 `sudo apt-get install -y fonts-noto-cjk`로 설치한다.
6. 최고관리자가 공식 계정을 연결·검증한다.
7. 운영 콜백 readiness URL 네 개가 `200`인지 확인한 후 Meta 콘솔에 제거·삭제 콜백 URL을 저장한다.
8. `SOCIAL_PUBLISH_ENABLED=false` 상태에서 관리자 계정 연결과 콜백만 먼저 검증한다.
9. 기능을 잠시 활성화해 운영용 비공개 시험 리뷰 한 건을 Instagram·Threads에 각각 게시하고,
   게시 이력의 `PUBLISHED`, permalink, 1080×1350 이미지, 본문과 짧은 URL을 확인한다.
10. 테스트 게시물을 각 플랫폼에서 직접 삭제한 뒤 다음 날 이력이 `EXTERNALLY_DELETED`로 바뀌는지 확인한다.
11. 위 검증이 모두 정상일 때만 `SOCIAL_PUBLISH_ENABLED=true`를 유지한다. 실패하면 즉시 `false`로 되돌리고
    `FAILED`/`VERIFYING` 이력과 API 로그를 확인한다.

기능을 긴급 중지할 때는 `SOCIAL_PUBLISH_ENABLED=false`로 변경하고 API를 재시작한다. 이 설정은 새 워커 실행을 멈추며 원본 작성 기능은 유지한다. 다시 활성화하면 남아 있는 `QUEUED`/`RETRY_WAIT` 작업을 계속 처리한다.

## 6. 상태와 장애 대응

| 상태 | 의미 | 운영 조치 |
|---|---|---|
| `WAITING_SOURCE` | 하위 에디션 승인 또는 AI 예약 발행 대기 | 원본 승인/발행 상태 확인 |
| `QUEUED` | 발행 대기 | 워커와 feature flag 확인 |
| `RENDERING` | 서버 이미지 생성 중 | 10분 이상이면 자동 복구 |
| `CONTAINER_CREATED` | Meta 컨테이너 생성 완료 | 10분 이상이면 자동 재시도 |
| `PUBLISHING` / `VERIFYING` | 발행 중이거나 결과 불확실 | Instagram은 최근 목록의 timestamp를 로컬 검증하고, Threads는 `since`와 timestamp를 함께 검증해 중복을 막으며 최대 30분 확인 |
| `RETRY_WAIT` | 일시 오류 자동 재시도 대기 | 1분, 5분, 15분, 1시간 간격 재시도 |
| `FAILED` | 자동 재시도 종료 | 플랫폼에 중복 게시가 없는지 확인 후 수동 재발행 |
| `PUBLISHED` | 게시 완료 | permalink로 확인 |
| `EXTERNALLY_DELETED` | 플랫폼에서 직접 삭제됨 | 재발행하지 않음 |
| `CANCELED` | 승인 전 원본 취소/거절 | 조치 없음 |

매일 04:40에 최근 게시 이력과 Meta를 대조해 플랫폼에서 직접 삭제된 글을 `EXTERNALLY_DELETED`로 표시한다. API 제한과 운영 규모를 고려해 한 번에 최대 500건을 확인한다.

Meta 게시가 성공한 뒤 permalink 조회만 실패한 경우에는 외부 media ID를 보존하고 링크만 재조회한다.
30분 뒤에도 링크를 얻지 못하면 상태는 `PUBLISHED`로 확정하되 오류 안내를 남기며, 중복 방지를 위해 재발행 버튼은 제공하지 않는다.

Prometheus에는 `social.publication{platform,result}` 카운터가 기록된다. 실패 증가, 10분 이상 대기 작업, 토큰 `EXPIRING`/`EXPIRED`, 디스크 용량을 함께 점검한다.

## 7. 정책·운영 체크리스트

- 공식 계정 2단계 인증과 복구 이메일/전화번호를 최신 상태로 유지한다.
- Meta App 관리자 권한은 최소 인원에게만 부여하고 퇴사·역할 변경 즉시 회수한다.
- App Secret과 토큰 암호화 키를 로그, 이슈, 메신저에 복사하지 않는다.
- 관리자 화면의 `연결 해제`는 서버에 저장된 암호화 토큰만 제거하며 기존 SNS 게시물을 삭제하지 않는다. 계정 탈취 등 비상 상황에는 Instagram/Threads의 연결된 앱 설정에서도 앱 권한을 철회한다.
- 이미지 저작권과 주류 광고·연령 관련 Meta 정책을 게시 전에 확인한다.
- 협찬·광고성 소식은 국내 표시광고 규정 및 플랫폼의 유료 파트너십 표시 정책을 별도로 적용한다.
- 사용자 리뷰의 SNS 게시 동의 버전은 DB에 기록된다. 동의 문구가 실질적으로 바뀌면 `CURRENT_CONSENT_VERSION`을 올린다.
- 운영 활성화 전에 개인정보처리방침과 이용약관을 검토해 사용자 리뷰·이미지가 Meta로 전송되는 목적, 항목, 처리 근거와 외부 서비스 처리 사실을 실제 운영 방식에 맞게 반영한다. 법률 문구는 운영자가 별도 검토한다.
- 동의를 철회하거나 원본을 삭제해도 이미 게시된 SNS 콘텐츠가 자동 삭제되지 않는다는 점을 작성 화면과 삭제 확인창에 계속 표시한다.
- `/ko/social` 또는 `/en/social`을 Instagram 프로필 링크 허브로 사용한다.
- 생성 이미지가 누적되므로 `/app/upload/social` 용량과 백업 정책을 운영 점검에 포함한다.
