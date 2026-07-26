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
- **SSR SEO snapshot**: `/spirits`, `/spirits/[id]`, 공개 게시판 목록·상세, 공지, BYOB와
  `/tier-lists` 기본 경로는 JS 실행 전에도 단일 H1과 핵심 요약 본문을 반환한다.
- **클라이언트 본문**: ranking·faq·약관 등 snapshot이 없는 기존 SPA 경로는 head metadata는
  서버에서 받지만 본문은 브라우저에서 렌더링된다.
- 직접 요청의 title·description·robots·canonical과 경로 JSON-LD는 Next.js 서버가 소유한다. SPA 내부 이동 시 클라이언트 SEO 동기화 코드는 기존 태그를 교체하며 누적하지 않는다.
- 검색·정렬·페이지·세부 필터 URL은 `noindex,follow`와 기본 목록/카테고리 canonical을 사용한다. 결과가 없는 카테고리는 자동 `noindex`되고 sitemap에서 제외되며 첫 활성 주류 등록 후 자동 복귀한다.
- 티어리스트 기본 경로(`/ko/tier-lists`, `/en/tier-lists`)는 공개 index/self-canonical이며 static
  sitemap에 포함한다. `?id=` 소유자 편집 뷰는 `noindex,follow`와 언어별 기본 경로 canonical을
  사용한다. 공개 share 경로는 self-canonical/index를 유지하고, 존재하지 않는 share는 HTTP 404와
  `noindex`를 반환한다. 티어리스트에는 검색엔진 전용 JSON-LD를 억지로 추가하지 않는다.

### nginx 동작
`location /` 블록이 3000번 포트의 Next.js Node 서버로 프록시 패스(`proxy_pass http://127.0.0.1:3000`)하고, `/_next/static/` 경로는 nginx가 `/app/next/dist/.next/static/`에서 직접 정적 자원을 서빙합니다.

→ 검색봇은 JS 실행 없이 route별 head metadata를 받으며, 구조화 데이터와 SEO snapshot을 지원하는
핵심 경로에서는 JSON-LD와 요약 본문도 함께 받는다.

### 트러블슈팅 및 검증
- **빌드 검증**: 로컬 빌드 시 터미널 로그에서 각 라우트별 렌더링 타입(○ Static, λ SSR)이 정상적으로 설계와 일치하는지 확인합니다.
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

- 2026-07-23: 공개 티어리스트 base와 소유자 편집 뷰의 SSR/CSR 색인 정책·H1·hreflang 검증 일치
- 2026-07-21: SEO 메타 단일화, 정규/에디션 self-canonical, sitemap index/shard, IndexNow 운영 절차 반영
- 2026-07-18: 대표 호스트를 `www.caskbycask.net`으로 전환
- 2026-05-21: 초안 작성 (STEP 1~6 완료 시점)
