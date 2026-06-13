# CaskByCask SEO/AEO 운영 가이드

운영 도메인 (`https://caskbycask.net`) 배포 후 수행해야 하는 검색 노출 작업 체크리스트.

---

## 1. 런칭 직전 점검

- [ ] DNS 설정 완료, HTTPS 정상 동작 (`curl -I https://caskbycask.net`)
- [ ] `https://caskbycask.net/robots.txt` 응답 200, 내용 정상
- [ ] `https://caskbycask.net/sitemap.xml` 응답 200, `<url>` 항목 포함
- [ ] `https://caskbycask.net/llms.txt` 응답 200
- [ ] 메인/카테고리/공지 등 주요 페이지의 HTML `<head>` 에 페이지별 `<title>`, `<meta name="description">`, `<link rel="canonical">`, JSON-LD 가 들어있는지 확인
  - 브라우저: 페이지 진입 후 DevTools → Elements → `<head>` 검사
  - 명령행: `curl -sL https://caskbycask.net/spirits | grep -E "<title>|description|canonical"`
- [ ] OG 미리보기 정상 — https://www.opengraph.xyz/ 같은 사이트에서 URL 입력 후 카드 확인

---

## 2. Google Search Console 등록

1. https://search.google.com/search-console 접속 → 속성 추가
2. **도메인 속성** (`caskbycask.net`) 또는 **URL 접두어** (`https://caskbycask.net/`) 선택
   - 도메인 속성이 더 포괄적 (모든 서브도메인 + 프로토콜). DNS TXT 인증 필요.
3. 소유권 확인
   - 도메인 속성: Cloudflare DNS 에 `google-site-verification=...` TXT 레코드 추가
   - URL 접두어: HTML 파일 업로드, HTML 메타 태그, Google Analytics, GTM 중 택일
4. 좌측 메뉴 → **사이트맵** → `https://caskbycask.net/sitemap.xml` 제출
5. 좌측 메뉴 → **URL 검사** → 메인 페이지 URL 입력 → "색인 생성 요청"

### 색인 모니터링
- **페이지** 리포트에서 색인된 URL 수 확인 (보통 1~2주 후 반영)
- **검색결과 분석** 에서 검색어/CTR/평균 노출 위치 확인
- **Core Web Vitals** 리포트에서 LCP/CLS/INP 점수 확인

---

## 3. Naver 웹마스터도구 등록 (한국 검색 핵심)

1. https://searchadvisor.naver.com 접속 → 로그인
2. **사이트 관리** → 사이트 등록 → `https://caskbycask.net`
3. 소유권 확인 (HTML 파일 업로드 또는 메타 태그 방식)
4. **요청** → 사이트맵 제출 → `https://caskbycask.net/sitemap.xml`
5. **요청** → RSS 제출 (선택)
6. **검증** → robots.txt 검증 정상 확인

### 색인 가속화
- **요청** → 수동 색인 요청 (메인/카탈로그/주요 카테고리 페이지)
- Naver 는 색인 속도가 Google 보다 느릴 수 있음 (수주 ~ 수개월)

---

## 4. Bing/Microsoft 웹마스터 등록

1. https://www.bing.com/webmasters 접속
2. **Add a site** → `https://caskbycask.net`
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
- `https://caskbycask.net/llms.txt` 응답 200 확인
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

`SitemapService.java` 가 1시간 캐시로 동적 생성 → spirit/notice/post 신규 등록 후 최대 1시간 내 sitemap 에 반영.

- 검색엔진은 일반적으로 sitemap.xml 을 주기적으로 재크롤링하므로 별도 ping 불필요.
- 그래도 즉시 재색인이 필요하면:
  - Google: Search Console → 사이트맵 재제출
  - Naver: 웹마스터도구 → 수동 색인 요청
  - Bing: IndexNow API (https://www.indexnow.org/) 활용 가능

URL 수가 50,000 개를 초과하면 sitemap index 로 분할해야 합니다 (현재 코드에는 분할 로직 미구현 — TODO).

---

## 8. Prerender (정적 라우트 HTML 스냅샷)

`caskbycask-web/scripts/prerender.mjs` 가 build 시 정적 라우트들의 HTML 스냅샷을 dist/<route>/index.html 로 생성합니다.

### 대상 라우트
```
/, /spirits, /notices, /ranking, /faq,
/terms, /privacy, /community/free, /community/notice
```

### nginx 동작
`try_files $uri $uri/ /index.html;` 가 `/spirits` 요청 시:
1. `dist/spirits` 파일 없음
2. `dist/spirits/` 디렉토리 있음 → `dist/spirits/index.html` (prerender 결과) 응답
3. 없으면 fallback `dist/index.html`

→ 검색봇은 JS 실행 없이도 head 메타 + JSON-LD 를 즉시 받습니다.

### 트러블슈팅
- 빌드 중 prerender 실패: puppeteer 가 Chrome 다운로드를 못 했을 가능성. `npx puppeteer browsers install chrome` 으로 강제 설치.
- prerender 만 다시 실행: `npm run prerender` (vite build 안 한 채로 dist 만 있으면 동작)
- prerender 건너뛰고 빌드만: `npm run build:no-prerender`

---

## 9. 모니터링 KPI

배포 후 4주, 8주, 12주 시점에 측정:

| 지표 | 도구 | 목표 |
|------|------|------|
| 색인된 URL 수 | Search Console "페이지" | 4주차 50%, 8주차 80%, 12주차 95%+ |
| 평균 노출 위치 | Search Console "성능" | 점차 상승 |
| Core Web Vitals 양호 비율 | Search Console "Core Web Vitals" | 75%+ |
| LCP / FID / CLS | PageSpeed Insights | LCP ≤ 2.5s, CLS ≤ 0.1 |
| Naver 검색 노출 | 직접 검색 ("위스키 리뷰", "꼬냑 VSOP" 등) | 첫 페이지 진입 |
| AI 인용 | ChatGPT/Claude/Perplexity 에 "위스키 리뷰 사이트 추천" 등 질의 | 인용/언급 빈도 ↑ |

---

## 10. 응급 대응 — 검색 노출 갑자기 떨어졌을 때

1. `https://caskbycask.net/robots.txt` 확인 — 실수로 `Disallow: /` 안 들어갔는지
2. 주요 페이지 `curl -sL https://caskbycask.net/spirits | grep "noindex"` — noindex 안 박혔는지
3. Search Console "페이지" → 색인 제외 사유 확인 (예: "noindex로 차단됨", "표준 URL과 다름")
4. `sitemap.xml` 응답 200 확인, 마지막 lastmod 가 합리적인 날짜인지
5. SSL 인증서 만료 확인 (`openssl s_client -connect caskbycask.net:443 -servername caskbycask.net 2>/dev/null | openssl x509 -noout -dates`)

---

## 변경 이력

- 2026-05-21: 초안 작성 (STEP 1~6 완료 시점)
