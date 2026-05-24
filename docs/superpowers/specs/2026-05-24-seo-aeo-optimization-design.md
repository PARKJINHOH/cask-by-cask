# SEO / AEO / 검색 키워드 최적화 설계

**날짜**: 2026-05-24  
**프로젝트**: DrinkIndex (drinkindex-web + drinkindex-api)  
**목표**: 기술 SEO 공백 해소 → 구조화 데이터 확장 → AEO 콘텐츠 강화

---

## 1. 현황 분석

### 이미 잘 되어 있는 것

| 항목 | 상태 |
|------|------|
| `SeoMeta.tsx` — OG/Twitter/JSON-LD/hreflang 통합 컴포넌트 | ✅ |
| 공개 페이지 전체 `SeoMeta` 적용 | ✅ |
| `robots.txt` — GPTBot/ClaudeBot/PerplexityBot 등 AI 크롤러 명시 허용 | ✅ |
| `llms.txt` — AI 엔진 대상 사이트 구조 설명 | ✅ |
| `SpiritDetailPage` — Product + AggregateRating + Review + BreadcrumbList | ✅ |
| `FaqPage` — FAQPage JSON-LD | ✅ |
| `index.html` — WebSite + Organization + SearchAction 정적 JSON-LD | ✅ |

### 발견된 공백

| 항목 | 문제 | 영향 |
|------|------|------|
| `sitemap.xml` | `robots.txt` 명시됐지만 파일 없음 | 구글이 크롤 범위 파악 불가 |
| `og-image.png` | `public/`에 파일 없음 | SNS/카카오톡 공유 시 이미지 깨짐 |
| `apple-touch-icon.png` | `public/`에 파일 없음 | iOS 홈 화면 아이콘 없음 |
| `PostDetailPage` | Article JSON-LD 없음 | 게시글 리치 결과 미노출 |
| `NoticeDetailPage` | NewsArticle JSON-LD 없음 | 공지 리치 결과 미노출 |
| `SpiritDetailPage` | manufacturer 스키마 없음 | 증류소 엔티티 신호 부족 |
| FAQ | 15문항, 한국어만 | AI 인용 범위 좁음 |
| `llms.txt` | 구조 정보 위주, Q&A 없음 | AI 직접 인용 약함 |
| 키워드 | 일부 페이지 `keywords` 미적용 | 검색 관련성 신호 부족 |

---

## 2. 배포 환경

- **프론트엔드**: Nginx 정적 서빙 (React SPA)
- **백엔드**: Spring Boot (Java 21)
- **SPA 크롤링 문제 해결**: 이번 스코프에서 제외 (prerender 보류), 나머지 항목 우선 처리

---

## 3. 구현 계획 — 3단계

### 단계 1: 기술 공백 해소 (긴급)

#### 1-1. sitemap.xml — 백엔드 API

**포함 URL**

| URL 패턴 | changefreq | priority |
|----------|-----------|----------|
| `/` | weekly | 1.0 |
| `/spirits` | daily | 0.9 |
| `/spirits?category=WHISKY` | daily | 0.8 |
| `/spirits?category=COGNAC` | daily | 0.8 |
| `/spirits?category=WINE` | daily | 0.8 |
| `/spirits?category=OTHER` | daily | 0.7 |
| `/faq` | monthly | 0.8 |
| `/ranking` | weekly | 0.6 |
| `/notices` | weekly | 0.5 |
| `/community/free` | daily | 0.5 |
| `/spirits/{id}` (전체) | weekly | 0.8 |
| `/notices/{id}` (전체) | monthly | 0.4 |

**제외**: `/admin/**`, `/mypage`, `/login`, `/signup`, `/messages`, `/notifications`, `/verify-email`, `/request/**`, `/community/*/write`, `/community/*/edit`

**아키텍처**

```
GET /sitemap.xml
  → SitemapController
  → SitemapService
      ├── 정적 URL 목록 (하드코딩)
      ├── spiritRepository.findAllPublishedIds()
      └── noticeRepository.findAllIds()
  → @Cacheable("sitemap", TTL=1h)  ← DB 부하 방지
  → Content-Type: application/xml
```

**Spirit 수 50,000 미만이면 단일 파일. 초과 시 sitemap-index.xml + 분할 파일로 확장.**

**Nginx 설정**

```nginx
location = /sitemap.xml {
    proxy_pass http://localhost:8080/sitemap.xml;
    proxy_cache_valid 200 1h;
    add_header Cache-Control "public, max-age=3600";
}
```

#### 1-2. 이미지 파일 생성

| 파일 | 크기 | 내용 |
|------|------|------|
| `public/og-image.png` | 1200×630px | Amber 테마 배경 + DrinkIndex 로고 + 슬로건 |
| `public/apple-touch-icon.png` | 180×180px | DrinkIndex 로고 아이콘 |

- 정적 파일 직접 제작 방식 (빌드 의존성 추가 없음)
- `public/favicon.png`와 동일 브랜딩 일관성 유지

---

### 단계 2: 구조화 데이터 & 키워드 강화

#### 2-1. PostDetailPage — Article 스키마 추가

`buildArticleSchema()` 헬퍼를 `seoSchema.ts`에 추가:

```typescript
export function buildArticleSchema(a: {
  headline: string
  authorName: string
  datePublished: string
  dateModified?: string
  url: string
}) {
  return {
    '@type': 'Article',
    headline: a.headline.slice(0, 110),
    author: { '@type': 'Person', name: a.authorName },
    datePublished: a.datePublished,
    ...(a.dateModified ? { dateModified: a.dateModified } : {}),
    publisher: {
      '@type': 'Organization',
      name: 'DrinkIndex',
      url: 'https://drinkindex.net',
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': a.url },
  }
}
```

`PostDetailPage.tsx`에서 `jsonLd={[articleSchema, breadcrumbSchema]}` 추가.

#### 2-2. NoticeDetailPage — NewsArticle 스키마 추가

```typescript
{
  '@type': 'NewsArticle',
  headline: notice.title,
  datePublished: notice.createdAt,
  publisher: { '@type': 'Organization', name: 'DrinkIndex' },
}
```

#### 2-3. SpiritDetailPage — manufacturer 스키마 보강

현재 `brand: { "@type": "Brand", name }` →

```typescript
brand: {
  '@type': 'Brand',
  name: primaryDistillery,
  ...(secondaryDistillery ? { alternateName: secondaryDistillery } : {}),
},
...(primaryDistillery ? {
  manufacturer: {
    '@type': 'Organization',
    name: primaryDistillery,
    address: {
      '@type': 'PostalAddress',
      addressCountry: spirit.country ?? undefined,
    },
  },
} : {}),
```

#### 2-4. 키워드 개선 대상 페이지

| 페이지 | 개선 내용 |
|--------|----------|
| `MainPage` | description에 "위스키 추천·리뷰", "싱글 몰트" 등 검색 쿼리 직접 삽입 |
| `SpiritListPage` | 카테고리 진입 시 `keywords` prop 추가 (카테고리별 핵심 키워드) |
| `RankingPage` | `keywords="위스키 랭킹, 주류 평점 순위, 드링크인덱스 랭킹"` 추가 |
| `NoticePage` | description 보강 |
| `FaqPage` | 영어 description/keywords 추가 |

**핵심 타깃 키워드 (공통)**

```
위스키 리뷰, 싱글 몰트, 꼬냑 등급, 와인 빈티지,
주류 리뷰 커뮤니티, drinkindex, 드링크인덱스,
whisky review, cognac rating, wine community
```

---

### 단계 3: AEO 콘텐츠 보강

#### 3-1. FaqPage — 8문항 추가

| # | 추가 질문 |
|---|----------|
| 16 | 아이라(Islay) 위스키란 무엇인가요? |
| 17 | 스카치 위스키 5대 산지는 어디인가요? |
| 18 | 버번(Bourbon) 위스키의 정의와 조건은? |
| 19 | 와인 아펠라시옹(Appellation)이란 무엇인가요? |
| 20 | 내추럴 와인(Natural Wine)이란? |
| 21 | 오크 숙성이 와인 맛에 미치는 영향은? |
| 22 | DrinkIndex 숙성력(점수·레벨) 시스템은 무엇인가요? |
| 23 | 주류 등록 요청은 어떻게 하나요? |

추가로 **영어 FAQ 섹션** 별도 추가 (핵심 5문항 영어판, i18n 없이 섹션 분리).

#### 3-2. llms.txt 보강

현재 구조 정보 위주 → **핵심 Q&A 요약 섹션** + **경쟁 출처 대비 차별점 섹션** 추가:

```markdown
## 핵심 Q&A (AI 인용용 요약)

**싱글 몰트 위스키란?** 단일 증류소에서 100% 맥아만으로 만든 위스키.
**꼬냑 XO 등급이란?** 블렌드 내 가장 어린 원액이 최소 10년 숙성된 꼬냑.
**DrinkIndex 평점 체계는?** 향(nose)·맛(taste)·피니시(finish) 각 0~100점 평균 = totalScore.
**위스키 캐스크 종류는?** Ex-Bourbon / Ex-Sherry / Ex-Port / Ex-Wine / Mizunara 등.
**피티드 위스키란?** 맥아 건조 시 피트(이탄) 연기로 훈연, ppm 수치가 높을수록 강한 스모키향.
**꼬냑 그랑드 샹파뉴란?** 꼬냑 최상급 크뤼, 풍부한 꽃향과 긴 피니시가 특징.
**NAS 위스키란?** No Age Statement — 라벨에 숙성 연수 미표기 위스키.

## DrinkIndex 차별점

- 한국어 기반 주류 리뷰 플랫폼으로, 한국어 위스키·꼬냑·와인 정보의 1차 출처.
- 향·맛·피니시 세 항목 세분화 평가 (단순 별점 대비 상세한 테이스팅 노트).
- Schema.org Product + AggregateRating + Review 구조화 데이터 제공 (기계 판독 가능).
- AI 학습·인용 허용 (robots.txt GPTBot, ClaudeBot, PerplexityBot 등 명시 허용).
```

---

## 4. 영향 파일 전체 목록

### 백엔드 (drinkindex-api)

| 파일 | 변경 유형 |
|------|----------|
| `SitemapController.java` | 신규 |
| `SitemapService.java` | 신규 |
| `SpiritRepository.java` | `findAllPublishedIds()` 메서드 추가 |
| `NoticeRepository.java` | `findAllIds()` 메서드 추가 |
| `build.gradle.kts` | Spring Cache 의존성 확인 |

### 프론트엔드 (drinkindex-web)

| 파일 | 변경 유형 |
|------|----------|
| `public/og-image.png` | 신규 |
| `public/apple-touch-icon.png` | 신규 |
| `src/shared/utils/seoSchema.ts` | `buildArticleSchema()` 추가 |
| `src/pages/community/PostDetailPage.tsx` | Article 스키마 + breadcrumb |
| `src/pages/NoticeDetailPage.tsx` | NewsArticle 스키마 + breadcrumb |
| `src/pages/SpiritDetailPage.tsx` | manufacturer 스키마 보강 |
| `src/pages/MainPage.tsx` | description/keywords 개선 |
| `src/pages/SpiritListPage.tsx` | 카테고리별 keywords 추가 |
| `src/pages/RankingPage.tsx` | keywords 추가 |
| `src/pages/NoticePage.tsx` | description 보강 |
| `src/pages/FaqPage.tsx` | 8문항 추가 + 영어 FAQ 섹션 |
| `public/llms.txt` | Q&A 섹션 + 차별점 섹션 추가 |

---

## 5. 검증 체크리스트

- [ ] `https://drinkindex.net/sitemap.xml` 접근 시 유효한 XML 응답
- [ ] Sitemap에 `/spirits/{id}` URL 포함 확인
- [ ] Google Search Console에 sitemap 제출
- [ ] SNS 공유 시 og-image 정상 노출 (카카오 공유 디버거)
- [ ] Google Rich Results Test — Spirit 상세 Product 스키마 통과
- [ ] Google Rich Results Test — FAQ 스키마 통과
- [ ] Google Rich Results Test — Article 스키마 통과
- [ ] `llms.txt` Q&A 섹션 AI 도구 직접 테스트 (Perplexity에서 "DrinkIndex 위스키" 검색)
