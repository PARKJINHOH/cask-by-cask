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
  - Naver: `INDEXNOW_ENABLED=true`일 때 트랜잭션 커밋 후 KO/EN canonical을 비동기 통지. 통지 대상은 셋이다.
    - 주류(`SpiritIndexingEventPublisher`) — 공개·수정·비활성화
    - 게시글(`PostIndexingEventPublisher`) — 공개 글만(성인 전용·숨김·삭제 제외), `/ko` 만
    - 생산자(`ProducerIndexingEventPublisher`) — 생산자 정보 수정 시, 그리고 **소속 주류가 바뀔 때**.
      생산자가 색인 대상이 되는 시점이 첫 활성 주류가 붙는 순간이라 주류 쪽에서도 함께 통지한다.
      활성 주류가 없는 생산자는 sitemap 과 같은 기준으로 제외한다.
  - 각 발행자의 대상 판정은 `SitemapService` 의 해당 쿼리와 **같아야 한다** — 어긋나면 sitemap 에서
    일부러 뺀 주소를 IndexNow 로는 크롤해 달라고 조르는 상태가 된다. 테스트가 이를 고정한다.
  - IndexNow는 sitemap과 수동 URL 검사를 대체하지 않으며 색인을 보장하지 않는다.
  - **주의**: sitemap 의 `lastmod` 는 데이터 변경 시각(`updatedAt`)에서 온다. 렌더링만 바꾼 배포는
    lastmod 가 그대로여서 재크롤 신호가 없다 — 그런 배포 뒤에는 Search Console 수동 색인 요청이 필요하다.

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
| `/users/{id}/bottles\|reviews` | `{닉네임}님의 보틀 컬렉션\|주류 리뷰` | **없음 (noindex, follow)** |
| `/taste-trees/t/{shareKey}` | `{트리 제목} — 주류 취향 트리` | 언어별 self + hreflang |

`/users/{id}/bottles|reviews`는 색인 대상에서 제외한다. 본문이 주류 상세·리뷰 페이지와 중복되고
사용자명 기반 검색 수요가 없는데 사용자 수만큼 URL이 늘어나, 그대로 두면 크롤 예산이 주류 페이지에서
빠져나간다. `follow`는 유지해 목록의 주류 링크를 따라가는 경로는 살려두며, `noindex`와 신호가
충돌하지 않도록 canonical·hreflang은 내보내지 않는다. 조회가 실패해도 라우트 기본값(index)으로
되돌아가지 않고 `noindex`를 유지한다. 페이지는 계속 `200`이고 OG 태그도 남아 링크 공유에는 영향이 없다.

`X-Robots-Tag` 헤더 목록(`proxy.ts`)에는 넣지 않는다. 그 헤더는 `noindex, nofollow`를 보내므로
`follow` 정책과 어긋난다. HTML meta 단독으로 처리한다.

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

### 웹폰트 (Core Web Vitals)

본문 서체는 Pretendard **가변(variable) + dynamic subset** 배포본을 **self-host** 한다.

- 정적(static) 배포본은 weight 하나가 한글 전체를 담은 약 750KB 파일이다. 본문에서 실제 렌더링되는
  weight가 400·500·600·700 네 종이므로 그대로 쓰면 페이지당 약 **3,048KB**를 내려받는다.
- 가변 + dynamic subset은 `unicode-range`로 92개 조각(조각당 8~43KB)으로 나뉘어 페이지에 실제로
  등장하는 문자 범위만 받고, 하나의 파일이 45~920 weight를 모두 커버한다. 홈 실측 기준
  폰트 **291KB + CSS 48KB**다.
- self-host이므로 서드파티 요청이 **0건**이다. CDN 장애·차단으로 서체가 폴백으로 떨어지는 위험이
  없고 추가 DNS/TLS 연결도 사라진다. 정적 자산이라 Cloudflare 엣지 캐시를 그대로 탄다.
- 모든 `@font-face`에 `font-display: swap`이 포함되어 있어 폰트 대기 중에도 텍스트가 먼저 그려진다.
- family 이름이 `'Pretendard Variable'`이므로 `src/index.css`의 `--font-sans`, `html { font-family }`,
  TipTap 편집기의 기본 글꼴 옵션이 이 이름을 함께 유지해야 한다. 이름이 어긋나면 폰트가 조용히
  미적용되고 폴백 서체로 렌더링된다.

#### 폰트 자산 관리

| 항목 | 위치 |
|---|---|
| 동기화 스크립트 | `caskbycask-web/scripts/sync-pretendard.mjs` (`npm run fonts:sync`) |
| 폰트 파일 | `public/fonts/pretendard/<버전>/*.woff2` (92개, 약 2.8MB) |
| `@font-face` CSS | `src/fonts/pretendard.css` — **생성물이므로 직접 편집 금지** |
| 캐시 헤더 | `next.config.js`의 `headers()` — `/fonts/:path*`에 `immutable`, 1년 |

- 조각 파일명(`PretendardVariable.subset.N.woff2`)은 버전이 올라가도 동일하므로 **경로에 버전을 넣는다.**
  버전 교체가 URL 교체가 되어 `immutable` 장기 캐시가 안전해진다.
- 버전을 올릴 때는 스크립트의 `PRETENDARD_VERSION`만 바꿔 `npm run fonts:sync`를 다시 실행한다.
  이전 버전 디렉토리는 스크립트가 정리하고, CSS도 함께 재생성된다.
- `public/`은 CI의 "Copy static & public to standalone" 단계에서 그대로 복사되므로 별도 배포 작업이 없다.

### JS 번들 (Core Web Vitals)

클라이언트 앱은 route 단위 코드 스플리팅을 쓰지만, **레이아웃이나 상세 페이지가 무거운 의존성을
정적 import 하면 그 의존성이 초기 번들로 끌려온다.** 다음 두 곳이 그런 경우였고 지연 로드로 분리했다.

| 위치 | 끌려온 의존성 | 조치 |
|---|---|---|
| `MainLayout` → `ForcePasswordChangeModal` | zod + @hookform/resolvers (약 288KB) | 강제 변경이 필요한 사용자일 때만 마운트 |
| `SpiritDetailPage` → `PriceRangeChart` | recharts (약 313KB) | '가격' 탭을 열 때만 로드 |

실측 다운로드량(비압축 JS 합계):

| 경로 | 이전 | 이후 |
|---|---|---|
| `/ko` | 1,454KB | 1,129KB |
| `/ko/spirits` | 1,427KB | 1,103KB |
| `/ko/spirits/{id}-{slug}` | 1,887KB | 1,168KB |

주의: `React.lazy`는 **컴포넌트가 렌더되는 순간** 청크를 내려받는다. 컴포넌트 내부에서 조건을 검사해
`null`을 반환하더라도 모듈은 이미 로드된다. 따라서 조건은 반드시 부모에서 검사해 마운트 자체를 막아야
분리 효과가 생긴다.

이미지는 목록·카드·썸네일에 `loading="lazy"`, 주류 상세 대표 이미지에 `loading="eager"`와
`fetchPriority="high"`, 배너 슬라이더는 첫 장만 `eager`로 이미 적용되어 있다.

### SEO API 캐싱 (백엔드)

`/api/seo/spirits/{id}`는 주류 페이지 요청의 임계 경로다. Next.js proxy 가 canonical 판정을 위해
호출하고 클라이언트 SPA 도 상세 진입 시 호출하며, 한 번 조회에 주류 상세·에디션 목록·대표 이미지·
최근 가격·최근 핫딜까지 5~6개 쿼리가 나간다. 그래서 백엔드에 Caffeine 캐시(`spiritSeo`, TTL 60초,
최대 2,000건)를 적용해 반복 조회를 흡수한다.

- TTL 60초는 이미 존재하는 지연(proxy canonical 캐시 5분, Next.js ISR 3600초)보다 짧으므로
  색인 신호의 최악 지연을 늘리지 않는다.
- 개별 무효화는 하지 않는다. 다만 비활성 주류는 예외를 던지고 **예외는 캐시되지 않으므로**
  404 전환은 즉시 반영된다.
- 단일 인스턴스 인메모리 캐시다. 다중 인스턴스로 확장하면 인스턴스별로만 적용되므로
  그때 Redis 로 옮기거나 TTL 을 줄인다.

`npm run test:proxy-seo`(프론트)와 `SpiritSeoServiceCacheTest`(백엔드)가 이 계약을 검증한다.

> 참고: 과거 API 가 Vite 시절 `index.html` 을 읽어 메타를 주입하던 `SeoPageController` 는 제거했다.
> nginx 가 `/spirits*` 를 Next.js(3000)로 보내고 API(8080)로는 `/api`·sitemap·IndexNow 만 보내므로
> 도달할 수 없는 코드였고, 참조하던 `seo.index-path`(`/app/vite/dist/index.html`)도 존재하지 않는
> 경로였다. 페이지 HTML 은 Next.js 가 단독으로 소유한다.

### 트러블슈팅 및 검증

> 아래 세 검증(`test:proxy-seo`, `test:seo-indexing`, `test:seo-entity`)은 GitHub Actions 의
> `build-web` 잡에서 **빌드 직후 자동 실행되는 배포 게이트**다. 실패하면 배포가 중단된다.
> 수동 배포(`deploy/local/manual-deploy.ps1`)는 Actions 를 거치지 않아 게이트가 실행되지 않으므로,
> SEO 관련 코드를 수정한 뒤 수동 배포할 때는 로컬에서 먼저 실행한다.
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
6. 색인 신호(canonical·robots·리다이렉트) 자체가 의심되면 로컬에서 계약 검증을 돌려 재현한다. 운영 API 없이 동작하므로 즉시 실행할 수 있다.

   ```powershell
   cd caskbycask-web
   npm run build
   npm run test:proxy-seo; npm run test:seo-indexing; npm run test:seo-entity
   ```

7. 주류 URL 이 대량으로 `503` 이면 백엔드 SEO API(`/api/seo/spirits/{id}`)를 먼저 확인한다. proxy 는
   캐시가 없고 API 도 응답하지 않을 때만 slug 없는 URL 에 `503` 을 반환한다. `curl -sI https://www.caskbycask.net/ko/spirits/{id}-{slug}` 가 `200` 이면 정규 URL 은 정상이다.

---

## 11. 배포 후 운영 검증 (SEO 영향 변경 시)

배포는 `both` 한 번으로 실행한다. Actions 의 `deploy` 잡이 `api` → `web` 순서를 보장하고
API readiness 가 실패하면 프론트는 교체하지 않는다(이유는 [`OPERATIONS-GUIDE.md`](./OPERATIONS-GUIDE.md)
2장 "SEO 영향이 있는 변경의 배포 순서" 참고). 배포 직후 아래를 순서대로 확인한다.

### 1) 리다이렉트 체인 (홉 수가 늘어나지 않았는지)

```powershell
# 기대: 308 -> /ko
curl.exe -sI https://www.caskbycask.net/ | Select-String "HTTP/|location"
# 기대: 301 -> /ko/spirits/{id}-{slug}  (1홉)
curl.exe -sI https://www.caskbycask.net/spirits/244 | Select-String "HTTP/|location"
# 기대: 200 (정규 URL 은 리다이렉트 없음)
curl.exe -sI https://www.caskbycask.net/ko/spirits/244-카발란-솔리스트-px-셰리-px151126026a | Select-String "HTTP/"
```

### 2) 색인 신호

```powershell
# 공개 주류: index, follow + self-canonical
curl.exe -sL https://www.caskbycask.net/ko/spirits | Select-String 'name="robots"|rel="canonical"'
# 사용자 공개 목록: noindex, follow + canonical 없음
curl.exe -sL https://www.caskbycask.net/ko/users/1/bottles | Select-String 'name="robots"|rel="canonical"'
# 비공개: X-Robots-Tag 헤더
curl.exe -sI https://www.caskbycask.net/ko/mypage | Select-String "x-robots-tag"
```

### 3) 웹폰트 (self-host)

```powershell
# 기대: 200, content-type: font/woff2, cache-control 에 immutable
curl.exe -sI https://www.caskbycask.net/fonts/pretendard/v1.3.9/PretendardVariable.subset.0.woff2 |
  Select-String "HTTP/|content-type|cache-control"
# 기대: 출력 없음 (외부 CDN 참조가 남아 있지 않아야 한다)
curl.exe -sL https://www.caskbycask.net/ko | Select-String "jsdelivr"
```

### 4) sitemap · robots

```powershell
curl.exe -sI https://www.caskbycask.net/sitemap.xml | Select-String "HTTP/|content-type"
curl.exe -sI https://www.caskbycask.net/robots.txt  | Select-String "HTTP/"
```

### 5) 전체 렌더링 검증

```powershell
cd caskbycask-web
$env:SEO_VERIFY_BASE_URL = 'https://www.caskbycask.net'
npm.cmd run seo:verify
Remove-Item Env:SEO_VERIFY_BASE_URL -ErrorAction SilentlyContinue
```

### 6) 이후 며칠간 Search Console 에서 볼 것

| 지표 | 기대 방향 | 의미 |
|---|---|---|
| 서버 오류(5xx) | **감소** | 주류 URL 이 `503` 을 반환하던 문제 해소 |
| `noindex 태그에 의해 제외됨` | 증가 | `/users/{id}/*` 색인 제외 — **의도된 변화** |
| `대체 페이지(적절한 표준 태그 있음)` | 증가 | `/price-tracker/spirits/{id}` → 주류 상세로 통합 — **의도된 변화** |
| `중복, 사용자가 표준으로 지정하지 않음` | 감소 | 엔티티별 title·canonical 분리 효과 |
| 주류 페이지 노출·클릭 | 증가 | 색인 통합과 5xx 해소 후 2~4주 반영 |

증가가 기대되는 두 항목은 색인 제외 사유이지만 정책상 의도한 것이다. 반면 **주류 URL 에서
`서버 오류(5xx)` 나 `찾을 수 없음(404)` 이 늘어나면 즉시 조사**한다(10장 응급 대응).

---

## 변경 이력

- 2026-07-30: Pretendard를 **self-host**로 전환(`npm run fonts:sync`, `public/fonts/pretendard/<버전>/`, 92개 약 2.8MB). 서드파티 요청 0건, 경로에 버전을 넣어 `immutable` 1년 캐시. `/users/{id}/bottles|reviews`를 `noindex, follow`로 전환(canonical·hreflang 미출력, 조회 실패 시에도 noindex 유지)
- 2026-07-30: SEO 계약 검증 3종을 GitHub Actions `build-web` 잡의 배포 게이트로 등록(빌드 직후 실행, 실패 시 배포 중단). 외부 API 응답이 비어 있을 때 `null`이 title·canonical 로 새는 경로 차단, proxy 의 `410 Gone` 판정과 canonical 형식 검증 추가
- 2026-07-30: `/api/seo/spirits/{id}` 에 Caffeine 캐시(TTL 60초, 최대 2,000건) 적용 — proxy 가 모든 주류 요청에서 의존하는 엔드포인트의 조회 비용(5~6쿼리)을 낮춰 장애 전이 가능성을 줄였다. 도달 불가 레거시 `SeoPageController` 와 고아 설정 `seo.index-path` 제거
- 2026-07-30: 초기 JS 번들에 끌려오던 zod(약 288KB)와 recharts(약 313KB)를 지연 로드로 분리. 홈·주류 목록 약 -325KB, 주류 상세 약 -719KB(1,887KB → 1,168KB)
- 2026-07-30: Pretendard를 가변+dynamic subset 배포본으로 전환. 홈 실측 폰트 전송량 약 3,048KB → 343KB(약 89% 감소). `cdn.jsdelivr.net` preconnect 추가. family가 `'Pretendard Variable'`로 바뀌어 `index.css`·TipTap 기본 글꼴 옵션도 동기 수정
- 2026-07-30: 엔티티별 metadata 도입. 라우트 키 단위 기본값 때문에 리뷰·생산자·사용자·공유 취향 트리·주류 가격 페이지가 동일 title을 공유하던 문제 해소(`/reviews/{id}`는 사이트 기본값과 같아 홈과 title이 동일했음). `/price-tracker/spirits/{id}`는 canonical을 주류 상세로 통합. 회귀 테스트 `npm run test:seo-entity` 추가
- 2026-07-30: 홈 SEO snapshot 추가(단일 H1 + 카테고리·주요 경로·주류 canonical 내부 링크). `SeoFallback` 목록 제목을 경로별로 분리해 주류 목록에 "최신 공개 글"이 표시되던 문구 오류 교정. proxy `X-Robots-Tag` 목록에 `taste-trees/new|mine|{id}/edit`·`price-tracker/register` 추가(공개 경로 미영향). 색인 정책 회귀 테스트 `npm run test:seo-indexing` 추가
- 2026-07-30: 주류 canonical 조회에 stale-while-error 캐시 도입. SEO API 장애 시 주류 URL 전체가 503이 되던 문제를 해소하고, slug 없는 요청만 503을 유지하도록 축소. fallback metadata의 잘못된 canonical 제거(noindex 전환). Next.js 16의 `proxy.ts` 규약과 리다이렉트 체인 계약 문서화. 회귀 테스트 `npm run test:proxy-seo` 추가
- 2026-07-23: 공개 티어리스트 base와 소유자 편집 뷰의 SSR/CSR 색인 정책·H1·hreflang 검증 일치
- 2026-07-21: SEO 메타 단일화, 정규/에디션 self-canonical, sitemap index/shard, IndexNow 운영 절차 반영
- 2026-07-18: 대표 호스트를 `www.caskbycask.net`으로 전환
- 2026-05-21: 초안 작성 (STEP 1~6 완료 시점)
