# 도메인 변경 시 체크리스트

현재 도메인: `caskbycask.pinner.dev` (운영), `drink-dev.pinner.dev` (개발)

도메인이 변경될 경우 아래 항목을 순서대로 처리합니다.

---

## 1. 백엔드 (caskbycask-api)

### 1-1. application.yml
```
seo:
  site-url: ${SEO_SITE_URL:https://<새 운영 도메인>}
```

### 1-2. application-dev.yml
```
app:
  email:
    from: ${EMAIL_FROM:caskbycask.cs@gmail.com}   # 커스텀 도메인 이메일로 변경 시 수정

seo:
  site-url: ${SEO_SITE_URL:https://<새 개발 도메인>}
```

### 1-3. application-prod.yml
```
app:
  email:
    from: ${EMAIL_FROM:caskbycask.cs@gmail.com}   # 커스텀 도메인 이메일로 변경 시 수정

cors:
  allowed-origins: ${CORS_ALLOWED_ORIGINS:https://<새 운영 도메인>}

seo:
  site-url: ${SEO_SITE_URL:https://<새 운영 도메인>}
```

### 1-4. SitemapService.java
```java
@Value("${seo.site-url:https://<새 운영 도메인>}")
```

### 1-5. SitemapServiceTest.java
테스트 내 URL 상수 일괄 교체

---

## 2. 프론트엔드 (caskbycask-web)

### 2-1. src/shared/config/site.ts  ← **단일 출처 (여기만 바꾸면 대부분 자동 반영)**
```ts
export const SITE_URL = 'https://<새 운영 도메인>'
```
> `SeoMeta`, `PostDetailPage`, `NoticeDetailPage` 등 `SITE_URL`을 import해서 쓰는 곳은 자동 반영됨.

### 2-2. index.html
`canonical`, OG URL, JSON-LD 내 도메인 일괄 교체
```
https://<구 도메인> → https://<새 운영 도메인>
```

### 2-3. public/robots.txt
```
Sitemap: https://<새 운영 도메인>/sitemap.xml
```

### 2-4. public/llms.txt
파일 내 전체 URL 일괄 교체

### 2-5. src/pages/legal/LegalContent.tsx
개인정보처리방침 내 이메일 주소 확인 및 수정

---

## 3. nginx 설정

### 3-1. deploy/nginx/caskbycask-prod.conf
```nginx
server_name <새 운영 도메인>;
```

### 3-2. deploy/nginx/caskbycask-dev.conf
```nginx
server_name <새 개발 도메인>;
```

---

## 4. 이메일 발신 주소 설정 ⚠️

인증 이메일 From 주소를 `noreply@<새 도메인>`으로 사용하려면 아래 두 가지를 모두 처리해야 합니다.
Gmail SMTP로 발송하므로 도메인 주소를 그냥 쓰면 DKIM 불일치로 스팸 처리됩니다.

### 4-1. Cloudflare Email Routing 설정
1. Cloudflare 대시보드 → 해당 도메인 → **Email** → **Email Routing**
2. `noreply@<새 도메인>` 주소를 생성하고 `caskbycask.cs@gmail.com`으로 포워딩 설정
3. Cloudflare가 자동으로 SPF 레코드를 추가해 줌

### 4-2. Gmail 발신 주소(Send mail as) 추가
1. Gmail → 설정(톱니바퀴) → **모든 설정 보기** → **계정 및 가져오기** 탭
2. **다른 이메일 주소에서 메일 보내기** → **다른 이메일 주소 추가**
3. 이름: `CaskByCask`, 주소: `noreply@<새 도메인>` 입력 → **다음 단계**
4. SMTP 서버 설정 없이 "Gmail을 통해 발송" 선택 → 확인 이메일 발송됨
5. Cloudflare가 포워딩하므로 `caskbycask.cs@gmail.com` 받은편지함에 인증 코드 도착
6. 인증 코드 입력 완료

### 4-3. 환경변수 업데이트
서버의 `.env.dev` / `.env.prod` 파일에서:
```
EMAIL_FROM=noreply@<새 도메인>
```

> **참고**: Gmail 발신 주소 설정(4-2) 없이 `EMAIL_FROM`만 바꾸면 Gmail SMTP가 발송을 거부합니다.
> 설정이 어려운 경우 `EMAIL_FROM=caskbycask.cs@gmail.com`으로 Gmail 주소를 직접 사용하는 것도 가능합니다 (스팸 위험 없음).

---

## 5. DNS 레코드 확인

새 도메인으로 이전 시 Cloudflare에서 아래 레코드를 확인합니다.

| 타입 | 이름 | 값 | 용도 |
|------|------|----|------|
| A / CNAME | `@` | 서버 IP 또는 호스트명 | 운영 프론트 |
| A / CNAME | `api` 또는 서브도메인 | 서버 IP | API (필요 시) |
| MX / TXT | (Cloudflare Email Routing 자동 생성) | — | 이메일 수신 |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:caskbycask.cs@gmail.com` | 스팸 방지 |

---

## 6. 변경 후 검증 체크리스트

- [ ] 운영 도메인으로 접속 → 홈 정상 표시
- [ ] 회원가입 → 인증 이메일 수신 확인 (From 주소 확인)
- [ ] 인증 이메일이 스팸함이 아닌 받은편지함에 도착하는지 확인
- [ ] 문의 제출 → `caskbycask.cs@gmail.com`에서 수신 확인
- [ ] `/sitemap.xml` 접속 → 새 도메인 URL 포함 여부 확인
- [ ] `/robots.txt` 접속 → Sitemap 경로 확인
- [ ] 개발자 도구 → Elements → `<link rel="canonical">` 도메인 확인
- [ ] SNS 공유 시 OG 이미지/URL 정상 표시 확인 (Facebook Debugger 등)
- [ ] Google Search Console에 새 도메인 등록 및 sitemap 제출
