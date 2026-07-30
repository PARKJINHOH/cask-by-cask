# CaskByCask SEO/AEO 운영 가이드

운영 대표 URL (`https://www.caskbycask.net`) 배포 후 수행해야 하는 검색 노출 작업 체크리스트.

---

## 1. 런칭 직전 점검

- [ ] DNS 설정 완료, HTTPS 정상 동작 (`curl -I https://www.caskbycask.net`)
- [ ] `https://www.caskbycask.net/robots.txt` 응답 200, 내용 정상
- [ ] `https://www.caskbycask.net/sitemap.xml` 응답 200, 루트가 `<sitemapindex>`인지 확인
- [ ] 루트가 가리키는 `/sitemaps/*.xml` 전체가 GET/HEAD 200이며 3xx·404·`noindex` URL을 포함하지 않는지 확인
- [ ] `https://www.caskbycask.net/llms.txt` 응답 200
- [ ] 메인/카테고리/공지 등 주요 페이지의 HTML `<head>` 에 페이지별 `<title>`, `<meta name="description">`, `<link rel="canonical">`이 있고, 구조화 데이터 적용 대상 경로에는 JSON-LD가 들어있는지 확인
  - 브라우저: 페이지 진입 후 DevTools → Elements → `<head>` 검사
  - 명령행: `curl -sL https://www.caskbycask.net/ko/spirits | grep -E "<title>|description|canonical"`
- [ ] OG 미리보기 정상 — https://www.opengraph.xyz/ 같은 사이트에서 URL 입력 후 카드 확인

---

## 2. Google Search Console 등록

1. https://search.google.com/search-console 접속 → 속성 추가
2. **도메인 속성** (`caskbycask.net`) 또는 **URL 접두어** (`https://www.caskbycask.net/`) 선택
   - 도메인 속성이 더 포괄적 (모든 서브도메인 + 프로토콜). DNS TXT 인증 필요.
3. 소유권 확인
   - 도메인 속성: Cloudflare DNS 에 `google-site-verification=...` TXT 레코드 추가
   - URL 접두어: HTML 파일 업로드, HTML 메타 태그, Google Analytics, GTM 중 택일
4. 좌측 메뉴 → **사이트맵** → `https://www.caskbycask.net/sitemap.xml` 제출
5. 좌측 메뉴 → **URL 검사** → 메인 페이지 URL 입력 → "색인 생성 요청"

### 색인 모니터링
- **페이지** 리포트에서 색인된 URL 수 확인 (보통 1~2주 후 반영)
- **검색결과 분석** 에서 검색어/CTR/평균 노출 위치 확인
- **Core Web Vitals** 리포트에서 LCP/CLS/INP 점수 확인

---

## 3. Naver 웹마스터도구 등록 (한국 검색 핵심)

1. https://searchadvisor.naver.com 접속 → 로그인
2. **사이트 관리** → 사이트 등록 → `https://www.caskbycask.net`
3. 소유권 확인 (HTML 파일 업로드 또는 메타 태그 방식)
4. **요청** → 사이트맵 제출 → `https://www.caskbycask.net/sitemap.xml`
5. RSS는 현재 별도 endpoint를 제공하지 않으므로 제출하지 않는다. 향후 공개 RSS를 구현한 뒤에만 제출한다.
6. **검증** → robots.txt 검증 정상 확인

### 색인 가속화
- **요청** → 수동 색인 요청 (메인/카탈로그/주요 카테고리 페이지)
- Naver 는 색인 속도가 Google 보다 느릴 수 있음 (수주 ~ 수개월)
- canonical 호스트와 동일한 `https://www.caskbycask.net` 속성에서 사이트맵을 관리한다. 기존 non-www 속성은 과거 통계 확인용으로 90일 유지하되, www 사이트맵이 정상 수집된 후 non-www 사이트맵 제출은 제거한다.

---

## 4. Bing/Microsoft 웹마스터 등록

1. https://www.bing.com/webmasters 접속
2. **Add a site** → `https://www.caskbycask.net`
3. Google Search Console 가 이미 등록되어 있으면 **Import from Google Search Console** 로 한 번에 가져오기 가능
4. 사이트맵 자동 제출됨 (또는 수동: `/sitemap.xml`)

---

## 5. AI 검색 — robots.txt 확인

이미 `public/robots.txt` 에 명시 허용:
- `GPTBot`, `ChatGPT-User`, `OAI-SearchBot` (OpenAI)
- `ClaudeBot`, `Claude-Web`, `anthropic-ai` (Anthropic)
- `PerplexityBot`, `Perplexity-User`
- `Google-Extended` (Gemini 학습용 별도 봇)
- `Applebot-Extended` (Apple Intelligence)
- `CCBot` (Common Crawl)
- `Bytespider` (Doubao)

학습 거부로 정책을 바꾸려면 각 봇 아래 `Disallow: /` 추가.

### llms.txt
- `https://www.caskbycask.net/llms.txt` 응답 200 확인
- 사이트 구조 변경 시 갱신 (특히 카테고리/주요 페이지 URL)

---

## 6. SNS / 메신저 OG 캐시 갱신

OG 메타가 바뀌어도 메신저/SNS 는 캐시한 이전 미리보기를 계속 보여줍니다. 강제 갱신 방법:

### 카카오톡
1. https://developers.kakao.com/tool/clear/og 접속
2. URL 입력 → "캐시 초기화"

### Facebook
1. https://developers.facebook.com/tools/debug/ 접속
2. URL 입력 → "Scrape Again"

### Twitter / X
1. https://cards-dev.twitter.com/validator (현재는 X로 통합)
2. URL 입력 → "Preview card"

### LinkedIn
1. https://www.linkedin.com/post-inspector/ 접속
2. URL 입력 → "Inspect"

---

## 7. Sitemap 자동 업데이트

`/sitemap.xml`은 sitemap index이고 다음 하위 파일을 동적으로 가리킨다.

- `/sitemaps/static.xml`: 언어 루트, 주류 목록, 실제 결과가 있는 카테고리, 주요 공개 정적 경로
- `/sitemaps/content-{bucket}.xml`: 공지·공개 게시글·BYOB. ID 10,000 단위 shard
- `/sitemaps/spirits-ko-{bucket}.xml`, `/sitemaps/spirits-en-{bucket}.xml`: 활성 정규 주류와 에디션의 최종 canonical. ID 10,000 단위 shard

각 응답은 `Cache-Control: public, max-age=3600`과 `ETag`를 제공하고 GET/HEAD를 모두 허용한다. 주류 조회는 sitemap 전용 projection을 사용하며 `lastmod`는 MariaDB의 Asia/Seoul 시간을 `+09:00` offset으로 출력한다.

- 검색엔진은 일반적으로 sitemap.xml 을 주기적으로 재크롤링하므로 별도 ping 불필요.
- 그래도 즉시 재색인이 필요하면:
  - Google: Search Console → 사이트맵 재제출
  - Naver: `INDEXNOW_ENABLED=true`일 때 주류 공개·수정·비활성화 트랜잭션 커밋 후 KO/EN canonical을 비동기 통지
  - IndexNow는 sitemap과 수동 URL 검사를 대체하지 않으며 색인을 보장하지 않는다.

IndexNow 키는 8~128자의 `a-f`, `A-F`, `0-9`, `-`로 만들고 `/app/env/api.env`에 설정한다. 활성화 후 `https://www.caskbycask.net/indexnow-key.txt`가 200 및 키 원문을 반환하는지 확인한다. 전송 실패는 콘텐츠 저장을 롤백하지 않고 로그만 남긴다.

---

## 8. SSR & SSG (Next.js 서버 및 정적 렌더링)

Next.js의 동적 catch-all route가 기존 React Router SPA를 감싸고, 직접 요청의 route별 metadata와
SEO snapshot을 서버에서 생성한다. 클라이언트 앱 본체는 `ssr: false`이므로 snapshot을 제공하지 않는
경로의 본문은 브라우저에서 렌더링된다.

### 대상 및 렌더링 방식
- **SSR metadata**: 알려진 공개 경로는 직접 요청에서 title·description·robots·canonical을 반환한다.
- **SSR SEO snapshot**: `/`(홈), `/spirits`, `/spirits/[id]`, 공개 게시판 목록·상세, 공지, BYOB와
  `/tier-lists` 기본 경로는 JS 실행 전에도 단일 H1과 핵심 요약 본문을 반환한다.
  홈 snapshot은 카테고리·주요 경로와 주류 canonical 링크를 서버 HTML로 제공한다. 홈은 링크 권위가
  가장 높은 페이지이므로, 여기서 주류 상세로 가는 내부 링크가 raw HTML에 있어야 JS를 실행하지 않는
  크롤러(특히 Naver Yeti)도 주류 페이지를 발견할 수 있다.
- **클라이언트 본문**: ranking·faq·약관 등 snapshot이 없는 기존 SPA 경로는 head metadata는
  서버에서 받지만 본문은 브라우저에서 렌더링된다. 이 경로들은 검색 수요가 낮거나 상시 변동하는
  화면이라 snapshot을 추가하지 않는다(thin content와 크롤 예산 낭비를 피한다).
- 직접 요청의 title·description·robots·canonical과 경로 JSON-LD는 Next.js 서버가 소유한다. SPA 내부 이동 시 클라이언트 SEO 동기화 코드는 기존 태그를 교체하며 누적하지 않는다.
- 검색·정렬·페이지·세부 필터 URL은 `noindex,follow`와 기본 목록/카테고리 canonical을 사용한다. 결과가 없는 카테고리는 자동 `noindex`되고 sitemap에서 제외되며 첫 활성 주류 등록 후 자동 복귀한다.

#### 엔티티별 metadata (중복 title 방지)

`DEFAULT_ROUTE_METADATA`는 라우트 키 단위이므로 그대로 쓰면 같은 라우트의 URL 수백 개가 동일한
title·description을 갖는다. 검색엔진은 이를 중복으로 판단해 대표 1개만 남기고, 노출돼도 제목이
내용을 설명하지 못해 클릭률이 떨어진다. 다음 경로는 `getPublicRouteMetadata`가 엔티티 정보를 반영한다.

| 경로 | title 구성 | canonical |
|---|---|---|
| `/reviews/{id}` | `{주류명} 시음 후기 ({닉네임})` | `/ko` 고정 (본문이 한국어라 hreflang 미출력) |
| `/producers/{id}` | `{생산자명} {증류소\|와이너리\|꼬냑 하우스} 정보` | 언어별 self + hreflang |
| `/price-tracker/spirits/{id}` | `{주류명} 가격 정보` | **주류 상세 canonical로 통합** |
| `/users/{id}/bottles\|reviews` | `{닉네임}님의 보틀 컬렉션\|주류 리뷰` | 언어별 self + hreflang |
| `/taste-trees/t/{shareKey}` | `{트리 제목} — 주류 취향 트리` | 언어별 self + hreflang |

`/price-tracker/spirits/{id}`만 canonical을 자기 자신이 아닌 주류 상세로 보낸다. 이 화면의 가격 추이·매장
정보는 주류 상세의 가격 탭에 이미 포함되어 사실상 부분집합이고, sitemap에도 등재되지 않는다. 두 URL이
같은 주류로 색인 경쟁하는 대신 신호를 주류 상세로 모으는 것이 목적이다. 페이지는 계속 `200`으로
동작하므로 기능 영향은 없으며, 자체 색인이 필요해지면 canonical을 self로 되돌리면 된다.

엔티티 조회가 일시적으로 실패하면 라우트 기본 metadata로 되돌아간다. 장애 중 `noindex`로 뒤집히거나
canonical이 사라지지 않도록 한 안전한 기본값이며 `npm run test:seo-indexing`이 이를 검증한다.
- 티어리스트 기본 경로(`/ko/tier-lists`, `/en/tier-lists`)는 공개 index/self-canonical이며 static
  sitemap에 포함한다. `?id=` 소유자 편집 뷰는 `noindex,follow`와 언어별 기본 경로 canonical을
  사용한다. 공개 share 경로는 self-canonical/index를 유지하고, 존재하지 않는 share는 HTTP 404와
  `noindex`를 반환한다. 티어리스트에는 검색엔진 전용 JSON-LD를 억지로 추가하지 않는다.

### nginx 동작
`location /` 블록이 3000번 포트의 Next.js Node 서버로 프록시 패스(`proxy_pass http://127.0.0.1:3000`)하고, `/_next/static/` 경로는 nginx가 `/app/next/dist/.next/static/`에서 직접 정적 자원을 서빙합니다.

→ 검색봇은 JS 실행 없이 route별 head metadata를 받으며, 구조화 데이터와 SEO snapshot을 지원하는
핵심 경로에서는 JSON-LD와 요약 본문도 함께 받는다.

### 리다이렉트 정규화 (Next.js proxy)

URL 정규화는 `caskbycask-web/src/proxy.ts`가 담당한다.

> **Next.js 16부터 `middleware.ts` 파일 규약은 `proxy.ts`로 이름이 바뀌었다.**
> 따라서 `src/proxy.ts`가 정식 미들웨어 파일이며 별도 `middleware.ts`를 만들면 안 된다.
> Turbopack 빌드에서는 `.next/server/middleware-manifest.json`이 `{}`로 비어 있는 것이 **정상**이다.
> 활성 여부는 `npm run build` 로그 마지막의 `ƒ Proxy (Middleware)` 줄로 확인한다.

측정된 리다이렉트 체인(운영 기준, 최대 2홉):

| 진입 URL | 응답 |
|---|---|
| `https://www.caskbycask.net/` | `308` → `/ko` |
| `https://www.caskbycask.net/spirits/{id}` | `301` → 최종 canonical (locale+slug 한 번에) |
| `https://www.caskbycask.net/ko/spirits/{id}` | `301` → `/ko/spirits/{id}-{slug}` |
| `https://www.caskbycask.net/ko/spirits/{id}-{slug}` | `200` (sitemap 등재 형태) |
| `http://caskbycask.net/spirits/{id}` | Cloudflare `301` www → proxy `301` canonical |
| `/s/{code}` | nginx가 API로 직접 프록시 — proxy를 거치지 않음 |

Cloudflare Rules의 `Canonical apex to www`(301)가 앞단에 있고, proxy는 locale과 slug를 한 번의 301로
합쳐 처리하므로 apex 진입에서도 2홉을 넘지 않는다. 새 리다이렉트 규칙을 Cloudflare에 추가할 때는
이 표를 넘기지 않는지 먼저 확인한다.

#### SEO API 장애 시 동작 (색인 보호 정책)

proxy는 canonical 판정을 위해 `/api/seo/spirits/{id}`를 조회한다. 이 조회가 실패할 때의 정책은
"검색엔진에 색인 제거 신호를 주지 않는다"를 우선한다.

- **조회 캐시 + stale-while-error**: 결과를 5분 TTL로 캐싱하고, 백엔드 장애·재시작 중에는 TTL이 지난
  값이라도 계속 사용해 canonical 리다이렉트를 유지한다. API 재배포가 색인에 영향을 주지 않는다.
- **캐시도 없고 API도 응답하지 않을 때**
  - slug가 있는 요청(=sitemap 등재 형태)은 `200`으로 렌더링을 진행한다. 페이지의 `generateMetadata`는
    별도 ISR 캐시(3600초)를 쓰므로 대체로 정상 canonical을 낸다.
  - slug가 없는 요청만 `503 Retry-After: 60`을 반환한다. 목적지를 알 수 없기 때문이다.
    이 503에는 `noindex`를 넣지 않는다 — 일시 장애에 색인 제거 신호를 섞으면 복구가 느려진다.
  - 주류 SEO 데이터를 끝까지 얻지 못한 경우 `generateMetadata`는 canonical을 **생략하고**
    `noindex, follow`로 응답한다. slug 없는 URL을 canonical로 선언하면 "canonical이 리다이렉트된다"는
    잘못된 신호가 되므로, 선언하지 않는 편이 안전하다.

이 계약은 `npm run test:proxy-seo`가 회귀 검증한다(백엔드 정상/장애 양쪽 모두).

### 트러블슈팅 및 검증
- **빌드 검증**: 로컬 빌드 시 터미널 로그에서 각 라우트별 렌더링 타입(○ Static, λ SSR)이 정상적으로 설계와 일치하는지 확인합니다. 로그 마지막에 `ƒ Proxy (Middleware)` 줄이 있어야 URL 정규화가 활성 상태입니다.
- **리다이렉트 계약 검증**: `cd caskbycask-web && npm run build && npm run test:proxy-seo`. 가짜 백엔드를 띄워 canonical 301·locale 308·noindex 헤더·hreflang 쌍을 확인하고, 백엔드를 내린 뒤 stale 캐시 리다이렉트·slug URL 200·slug 없는 URL만 503인지까지 검증합니다. 외부 네트워크나 운영 API가 필요하지 않으므로 배포 전 로컬에서 항상 실행할 수 있습니다.
- **색인 정책 검증**: `cd caskbycask-web && npm run build && npm run test:seo-indexing`. 라우트별로 index/noindex 판정, canonical, hreflang이 각각 정확히 1개인지, 비공개 경로에 canonical이 없는지, 공개 경로에 noindex 헤더가 잘못 붙지 않는지, snapshot 경로의 H1이 1개인지, 홈이 주류 경로 내부 링크를 제공하는지 확인합니다. 백엔드를 의도적으로 죽은 포트로 지정하므로 **API 장애 중에도 공개 경로가 색인 가능 상태를 유지하는지**까지 함께 검증합니다.
- **엔티티 metadata 검증**: `cd caskbycask-web && npm run build && npm run test:seo-entity`. 같은 라우트의 서로 다른 엔티티가 서로 다른 title을 갖는지, 어떤 엔티티 페이지도 홈과 title이 같지 않은지, 리뷰의 한국어 canonical 통합과 주류 가격 페이지의 주류 상세 canonical 통합이 유지되는지 확인합니다.
- **standalone 구동 검증**: 서버의 systemd 서비스 `caskbycask-web`이 정상 작동 중인지 확인합니다 (`systemctl status caskbycask-web`).
- **배포 후 자동 검증**: `cd caskbycask-web && SEO_VERIFY_BASE_URL=https://www.caskbycask.net npm run seo:verify`. 원본 HTML뿐 아니라 Puppeteer 렌더링 뒤의 title·description·robots·canonical·H1·JSON-LD 중복도 확인하고, SNS 허브와 공개 리뷰 상세 경로도 렌더링한다. 브라우저 실행이 불가능한 제한 환경에서만 `SEO_VERIFY_BROWSER=false`로 생략할 수 있다. 전체 sitemap URL의 최종 200·self-canonical·index 가능 여부를 검사하는 배포 게이트는 `SEO_VERIFY_ALL_URLS=true`를 함께 지정한다. 운영 API의 요청 제한과 SSR 부하를 피하기 위해 전체 검증은 URL 사이에 기본 1초 간격을 두므로 현재 규모에서는 약 10~15분이 걸릴 수 있다. 간격은 `SEO_VERIFY_REQUEST_DELAY_MS`로 늘릴 수 있으나 운영에서는 1,000ms 미만으로 낮추지 않는다. 이 모드는 배포 직후 한 번만 실행한다. 정규·에디션 대표 ID 기본값은 `295,296,309`이며 데이터가 달라진 환경에서는 `SEO_VERIFY_SPIRIT_IDS=...`로 존재하는 ID를 쉼표로 지정한다. 공개 리뷰 대표 ID 기본값은 `11`이며 환경별로 `SEO_VERIFY_REVIEW_ID=...`를 지정할 수 있다.

  Windows PowerShell에서는 소스 체크아웃의 `caskbycask-web` 폴더에서 다음과 같이 실행한다.

  ```powershell
  $env:SEO_VERIFY_BASE_URL = 'https://www.caskbycask.net'
  $env:SEO_VERIFY_ALL_URLS = 'true'
  $env:SEO_VERIFY_BROWSER = 'true'
  $env:SEO_VERIFY_REVIEW_ID = '11'
  npm.cmd run seo:verify
  Remove-Item Env:SEO_VERIFY_BASE_URL, Env:SEO_VERIFY_ALL_URLS, Env:SEO_VERIFY_BROWSER, Env:SEO_VERIFY_REVIEW_ID -ErrorAction SilentlyContinue
  ```

  Codex 샌드박스나 일부 컨테이너처럼 Chrome OS sandbox를 실행할 수 없는 신뢰된 검증 환경에서 브라우저 기동 자체가 실패할 때만 `SEO_VERIFY_BROWSER_NO_SANDBOX=true`를 임시로 사용한다. 일반 개발 PC·배포 러너에서는 설정하지 않으며, 신뢰할 수 없는 사이트를 대상으로 이 옵션을 사용하지 않는다. 검사 후에는 `Remove-Item Env:SEO_VERIFY_BROWSER_NO_SANDBOX -ErrorAction SilentlyContinue`로 제거한다.

---

## 9. 모니터링 KPI

배포 후 4주, 8주, 12주 시점에 측정:

| 지표 | 도구 | 목표 |
|------|------|------|
| 색인된 URL 수 | Search Console "페이지" | 4주차 50%, 8주차 80%, 12주차 95%+ |
| 평균 노출 위치 | Search Console "성능" | 점차 상승 |
| Core Web Vitals 양호 비율 | Search Console "Core Web Vitals" | 75%+ |
| LCP / INP / CLS | PageSpeed Insights | LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 |
| Naver 검색 노출 | 직접 검색 ("위스키 리뷰", "꼬냑 VSOP" 등) | 첫 페이지 진입 |
| AI 인용 | ChatGPT/Claude/Perplexity 에 "위스키 리뷰 사이트 추천" 등 질의 | 인용/언급 빈도 ↑ |

---

## 10. 응급 대응 — 검색 노출 갑자기 떨어졌을 때

1. `https://www.caskbycask.net/robots.txt` 확인 — 실수로 `Disallow: /` 안 들어갔는지
2. 주요 페이지 `curl -sL https://www.caskbycask.net/spirits | grep "noindex"` — noindex 안 박혔는지
3. Search Console "페이지" → 색인 제외 사유 확인 (예: "noindex로 차단됨", "표준 URL과 다름")
4. `sitemap.xml`의 모든 하위 sitemap 응답 200 확인, 주류 shard의 마지막 lastmod가 합리적인 날짜인지
5. SSL 인증서 만료 확인 (`openssl s_client -connect www.caskbycask.net:443 -servername www.caskbycask.net 2>/dev/null | openssl x509 -noout -dates`)

---

## 변경 이력

- 2026-07-30: 엔티티별 metadata 도입. 라우트 키 단위 기본값 때문에 리뷰·생산자·사용자·공유 취향 트리·주류 가격 페이지가 동일 title을 공유하던 문제 해소(`/reviews/{id}`는 사이트 기본값과 같아 홈과 title이 동일했음). `/price-tracker/spirits/{id}`는 canonical을 주류 상세로 통합. 회귀 테스트 `npm run test:seo-entity` 추가
- 2026-07-30: 홈 SEO snapshot 추가(단일 H1 + 카테고리·주요 경로·주류 canonical 내부 링크). `SeoFallback` 목록 제목을 경로별로 분리해 주류 목록에 "최신 공개 글"이 표시되던 문구 오류 교정. proxy `X-Robots-Tag` 목록에 `taste-trees/new|mine|{id}/edit`·`price-tracker/register` 추가(공개 경로 미영향). 색인 정책 회귀 테스트 `npm run test:seo-indexing` 추가
- 2026-07-30: 주류 canonical 조회에 stale-while-error 캐시 도입. SEO API 장애 시 주류 URL 전체가 503이 되던 문제를 해소하고, slug 없는 요청만 503을 유지하도록 축소. fallback metadata의 잘못된 canonical 제거(noindex 전환). Next.js 16의 `proxy.ts` 규약과 리다이렉트 체인 계약 문서화. 회귀 테스트 `npm run test:proxy-seo` 추가
- 2026-07-23: 공개 티어리스트 base와 소유자 편집 뷰의 SSR/CSR 색인 정책·H1·hreflang 검증 일치
- 2026-07-21: SEO 메타 단일화, 정규/에디션 self-canonical, sitemap index/shard, IndexNow 운영 절차 반영
- 2026-07-18: 대표 호스트를 `www.caskbycask.net`으로 전환
- 2026-05-21: 초안 작성 (STEP 1~6 완료 시점)
