# SEO / AEO / 검색 키워드 최적화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기술 SEO 공백(sitemap 카테고리 URL, og-image, structured data) 해소 + AEO 콘텐츠(FAQ, llms.txt) 강화로 검색·AI 인용 가시성 향상.

**Architecture:** 백엔드 SitemapService에 카테고리 필터 URL 추가 → 프론트엔드 이미지 파일 생성 + JSON-LD 보강 + 키워드 추가 → AEO 콘텐츠(FAQ 확장, llms.txt 보강) 순으로 진행. 각 태스크는 독립적으로 커밋 가능.

**Tech Stack:** Java 21 / Spring Boot 3.5 / React 18 + TypeScript / Vite / Tailwind CSS / react-i18next / Schema.org JSON-LD

---

## 파일 맵

| 파일 | 작업 |
|------|------|
| `drinkindex-api/src/main/java/.../seo/service/SitemapService.java` | 카테고리 필터 URL 4개 추가 |
| `drinkindex-api/src/test/java/.../seo/service/SitemapServiceTest.java` | 신규 — 단위 테스트 |
| `drinkindex-web/scripts/og-image.html` | 신규 — og-image 생성용 HTML 템플릿 |
| `drinkindex-web/public/og-image.png` | 신규 — HTML 스냅샷으로 생성 |
| `drinkindex-web/public/apple-touch-icon.png` | 신규 — favicon.png 복사·리사이즈 |
| `drinkindex-web/src/pages/SpiritDetailPage.tsx` | manufacturer 스키마 추가 |
| `drinkindex-web/src/pages/community/PostDetailPage.tsx` | dateModified 추가 |
| `drinkindex-web/src/pages/NoticeDetailPage.tsx` | dateModified 추가 |
| `drinkindex-web/src/pages/MainPage.tsx` | keywords 추가 |
| `drinkindex-web/src/pages/SpiritListPage.tsx` | 카테고리별 keywords 추가 |
| `drinkindex-web/src/pages/FaqPage.tsx` | 8문항 추가 + 영어 FAQ 섹션 |
| `drinkindex-web/public/llms.txt` | Q&A 섹션 + 차별점 섹션 추가 |

---

## Task 1: 백엔드 — SitemapService 카테고리 URL 추가

**Files:**
- Modify: `drinkindex-api/src/main/java/com/drinkindex/domain/seo/service/SitemapService.java`
- Create: `drinkindex-api/src/test/java/com/drinkindex/domain/seo/service/SitemapServiceTest.java`

- [ ] **Step 1: 테스트 파일 작성**

`drinkindex-api/src/test/java/com/drinkindex/domain/seo/service/SitemapServiceTest.java` 생성:

```java
package com.drinkindex.domain.seo.service;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SitemapServiceTest {

    @Mock
    private EntityManager em;

    @InjectMocks
    private SitemapService sitemapService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(sitemapService, "siteUrl", "https://drinkindex.net");
    }

    @Test
    @DisplayName("sitemap.xml에 카테고리 필터 URL 4개가 포함된다")
    void sitemap_contains_category_urls() {
        when(em.createQuery(anyString())).thenAnswer(inv -> {
            var q = org.mockito.Mockito.mock(jakarta.persistence.Query.class);
            when(q.getResultList()).thenReturn(List.of());
            return q;
        });

        String xml = sitemapService.generateSitemap();

        assertThat(xml).contains("https://drinkindex.net/spirits?category=WHISKY");
        assertThat(xml).contains("https://drinkindex.net/spirits?category=COGNAC");
        assertThat(xml).contains("https://drinkindex.net/spirits?category=WINE");
        assertThat(xml).contains("https://drinkindex.net/spirits?category=OTHER");
    }

    @Test
    @DisplayName("sitemap.xml은 유효한 XML urlset을 반환한다")
    void sitemap_returns_valid_xml() {
        when(em.createQuery(anyString())).thenAnswer(inv -> {
            var q = org.mockito.Mockito.mock(jakarta.persistence.Query.class);
            when(q.getResultList()).thenReturn(List.of());
            return q;
        });

        String xml = sitemapService.generateSitemap();

        assertThat(xml).startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        assertThat(xml).contains("<urlset");
        assertThat(xml).contains("</urlset>");
    }
}
```

- [ ] **Step 2: 테스트 실행 — FAIL 확인**

```
cd drinkindex-api
./gradlew test --tests "com.drinkindex.domain.seo.service.SitemapServiceTest" --info
```

Expected: `sitemap_contains_category_urls` FAIL (카테고리 URL 없음)

- [ ] **Step 3: SitemapService 정적 URL 섹션에 카테고리 URL 4개 추가**

`SitemapService.java`의 정적 페이지 블록(`/spirits` appendUrl 다음 줄)에 추가:

```java
// 기존 코드 (변경 없음)
appendUrl(sb, siteUrl + "/spirits",                null, "daily",  "0.9");

// ── 추가: 카테고리 필터 페이지 ──
appendUrl(sb, siteUrl + "/spirits?category=WHISKY",  null, "daily",  "0.8");
appendUrl(sb, siteUrl + "/spirits?category=COGNAC",  null, "daily",  "0.8");
appendUrl(sb, siteUrl + "/spirits?category=WINE",    null, "daily",  "0.8");
appendUrl(sb, siteUrl + "/spirits?category=OTHER",   null, "daily",  "0.7");
```

- [ ] **Step 4: 테스트 실행 — PASS 확인**

```
./gradlew test --tests "com.drinkindex.domain.seo.service.SitemapServiceTest"
```

Expected: 2 tests PASS

- [ ] **Step 5: 빌드 전체 확인**

```
./gradlew build
```

Expected: BUILD SUCCESSFUL

- [ ] **Step 6: 커밋**

```
git add drinkindex-api/src/main/java/com/drinkindex/domain/seo/service/SitemapService.java
git add drinkindex-api/src/test/java/com/drinkindex/domain/seo/service/SitemapServiceTest.java
git commit -m "feat(seo): add category filter URLs to sitemap"
```

---

## Task 2: og-image.png 생성

**Files:**
- Create: `drinkindex-web/scripts/og-image.html`
- Create: `drinkindex-web/public/og-image.png` (수동 스냅샷)

- [ ] **Step 1: HTML 템플릿 생성**

`drinkindex-web/scripts/og-image.html` 생성:

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1200" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap');

    body {
      width: 1200px;
      height: 630px;
      font-family: 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif;
      background: linear-gradient(135deg, #1c1008 0%, #3d1f00 40%, #78350f 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      position: relative;
    }

    /* 배경 장식 */
    .bg-circle {
      position: absolute;
      border-radius: 50%;
      background: rgba(251, 191, 36, 0.06);
    }
    .bg-circle-1 { width: 600px; height: 600px; top: -200px; right: -100px; }
    .bg-circle-2 { width: 400px; height: 400px; bottom: -150px; left: -80px; }

    .content {
      text-align: center;
      color: white;
      position: relative;
      z-index: 1;
      padding: 0 80px;
    }

    .badge {
      display: inline-block;
      background: rgba(251, 191, 36, 0.2);
      border: 1px solid rgba(251, 191, 36, 0.5);
      color: #fbbf24;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.15em;
      padding: 6px 18px;
      border-radius: 999px;
      margin-bottom: 28px;
      text-transform: uppercase;
    }

    .logo {
      font-size: 72px;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: -0.02em;
      line-height: 1;
      margin-bottom: 20px;
    }

    .logo span {
      color: #fbbf24;
    }

    .tagline {
      font-size: 24px;
      font-weight: 400;
      color: rgba(255,255,255,0.75);
      letter-spacing: 0.02em;
      margin-bottom: 40px;
    }

    .icons {
      font-size: 40px;
      letter-spacing: 12px;
    }

    .url {
      position: absolute;
      bottom: 40px;
      right: 60px;
      font-size: 18px;
      color: rgba(255,255,255,0.4);
      font-weight: 400;
      letter-spacing: 0.05em;
    }
  </style>
</head>
<body>
  <div class="bg-circle bg-circle-1"></div>
  <div class="bg-circle bg-circle-2"></div>

  <div class="content">
    <div class="badge">주류 리뷰 커뮤니티</div>
    <div class="logo">Drink<span>Index</span></div>
    <div class="tagline">위스키 · 와인 · 꼬냑 · 럼 · 데킬라</div>
    <div class="icons">🥃 🍷 🍾</div>
  </div>

  <div class="url">drinkindex.net</div>
</body>
</html>
```

- [ ] **Step 2: 브라우저에서 1200×630 PNG로 저장**

1. Chrome에서 `scripts/og-image.html` 파일 열기
2. DevTools(F12) → Console에 입력:
   ```js
   // 뷰포트를 정확히 1200×630으로 설정하는 확인 코드
   console.log(document.body.offsetWidth, document.body.offsetHeight)
   ```
3. DevTools → **Rendering** 탭 → **Emulate CSS media type: print** 해제 확인
4. DevTools → `Ctrl+Shift+P` → "Capture full size screenshot"
5. 다운로드된 파일을 `drinkindex-web/public/og-image.png`로 저장

> 대안: https://htmlcsstoimage.com 같은 온라인 도구에 HTML 코드 붙여넣기 후 1200×630 다운로드

- [ ] **Step 3: 이미지 확인**

파일 크기 확인 (200KB 이하 권장):
```
dir drinkindex-web\public\og-image.png
```

- [ ] **Step 4: 커밋**

```
git add drinkindex-web/scripts/og-image.html drinkindex-web/public/og-image.png
git commit -m "feat(seo): add og-image.png (1200x630 social preview)"
```

---

## Task 3: apple-touch-icon.png 생성

**Files:**
- Create: `drinkindex-web/public/apple-touch-icon.png`

- [ ] **Step 1: favicon.png를 180×180으로 리사이즈**

Windows PowerShell (System.Drawing 사용):
```powershell
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile("$PWD\drinkindex-web\public\favicon.png")
$bmp = New-Object System.Drawing.Bitmap(180, 180)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($src, 0, 0, 180, 180)
$bmp.Save("$PWD\drinkindex-web\public\apple-touch-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose(); $src.Dispose()
Write-Host "Done"
```

> 대안: favicon.png를 Figma / Paint 에서 열어 180×180으로 내보내기

- [ ] **Step 2: 파일 생성 확인**

```
dir drinkindex-web\public\apple-touch-icon.png
```

Expected: 파일 존재, 0바이트 아님

- [ ] **Step 3: 커밋**

```
git add drinkindex-web/public/apple-touch-icon.png
git commit -m "feat(seo): add apple-touch-icon.png (180x180)"
```

---

## Task 4: SpiritDetailPage — manufacturer 스키마 추가

**Files:**
- Modify: `drinkindex-web/src/pages/SpiritDetailPage.tsx`

- [ ] **Step 1: productJsonLd의 brand 블록을 찾아 manufacturer 추가**

`SpiritDetailPage.tsx`의 `productJsonLd` 객체에서 `brand:` 줄 이후를 수정:

변경 전:
```typescript
    brand: primaryDistillery ? { '@type': 'Brand', name: primaryDistillery } : undefined,
```

변경 후:
```typescript
    brand: primaryDistillery ? {
      '@type': 'Brand',
      name: primaryDistillery,
      ...(secondaryDistillery ? { alternateName: secondaryDistillery } : {}),
    } : undefined,
    manufacturer: primaryDistillery ? {
      '@type': 'Organization',
      name: primaryDistillery,
      ...(secondaryDistillery ? { alternateName: secondaryDistillery } : {}),
      address: spirit.country ? {
        '@type': 'PostalAddress',
        addressCountry: spirit.country,
      } : undefined,
    } : undefined,
```

- [ ] **Step 2: TypeScript 타입 오류 없는지 확인**

```
cd drinkindex-web
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 3: 커밋**

```
git add drinkindex-web/src/pages/SpiritDetailPage.tsx
git commit -m "feat(seo): add manufacturer schema to SpiritDetailPage Product JSON-LD"
```

---

## Task 5: PostDetailPage + NoticeDetailPage — dateModified 추가

**Files:**
- Modify: `drinkindex-web/src/pages/community/PostDetailPage.tsx`
- Modify: `drinkindex-web/src/pages/NoticeDetailPage.tsx`

- [ ] **Step 1: PostDetailPage Article 스키마에 dateModified 추가**

`PostDetailPage.tsx`의 `jsonLd` 배열에서 Article 객체 내 `datePublished` 다음 줄 추가:

변경 전:
```typescript
            datePublished: post.createdAt,
            author: post.authorNickname
```

변경 후:
```typescript
            datePublished: post.createdAt,
            dateModified: post.updatedAt ?? post.createdAt,
            author: post.authorNickname
```

- [ ] **Step 2: NoticeDetailPage Article 스키마에 dateModified 추가**

`NoticeDetailPage.tsx`의 Article 객체 내 `datePublished` 다음 줄 추가:

변경 전:
```typescript
            datePublished: notice.createdAt,
            author: { '@type': 'Organization', name: 'DrinkIndex' },
```

변경 후:
```typescript
            datePublished: notice.createdAt,
            dateModified: notice.updatedAt ?? notice.createdAt,
            author: { '@type': 'Organization', name: 'DrinkIndex' },
```

> `notice.updatedAt`이 타입에 없다면 `notice.createdAt`만 사용 — TypeScript 오류 없으면 OK

- [ ] **Step 3: TypeScript 확인**

```
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 4: 커밋**

```
git add drinkindex-web/src/pages/community/PostDetailPage.tsx
git add drinkindex-web/src/pages/NoticeDetailPage.tsx
git commit -m "feat(seo): add dateModified to Article JSON-LD in PostDetailPage and NoticeDetailPage"
```

---

## Task 6: MainPage + SpiritListPage — keywords 추가

**Files:**
- Modify: `drinkindex-web/src/pages/MainPage.tsx`
- Modify: `drinkindex-web/src/pages/SpiritListPage.tsx`

- [ ] **Step 1: MainPage SeoMeta에 keywords + description 개선**

`MainPage.tsx`의 `<SeoMeta` 블록 수정:

변경 전:
```typescript
      <SeoMeta
        title={isEn
          ? 'DrinkIndex — Whisky, Wine & Cognac Review Community'
          : 'DrinkIndex — 위스키 · 와인 · 꼬냑 리뷰 커뮤니티'}
        description={isEn
          ? 'Explore whisky, wine, cognac, rum and tequila. Read user reviews, distillery profiles and ratings.'
          : '위스키, 와인, 꼬냑 등 다양한 주류 정보를 탐색하고 리뷰를 공유하세요. 증류소·와이너리 정보와 사용자 평점을 한 곳에서.'}
        canonical={buildCanonical('/')}
        locale={isEn ? 'en_US' : 'ko_KR'}
      />
```

변경 후:
```typescript
      <SeoMeta
        title={isEn
          ? 'DrinkIndex — Whisky, Wine & Cognac Review Community'
          : 'DrinkIndex — 위스키 · 와인 · 꼬냑 리뷰 커뮤니티'}
        description={isEn
          ? 'Discover whisky, wine, cognac, rum and tequila reviews. Single malt, bourbon, XO cognac ratings and tasting notes by real users.'
          : '위스키 추천·리뷰, 싱글 몰트, 꼬냑 등급(VS·VSOP·XO), 와인 빈티지 정보를 한 곳에서. 증류소·와이너리별 사용자 평점과 테이스팅 노트.'}
        canonical={buildCanonical('/')}
        locale={isEn ? 'en_US' : 'ko_KR'}
        keywords={isEn
          ? 'whisky review, single malt, bourbon, cognac rating, wine community, distillery, drinkindex'
          : '위스키 리뷰, 위스키 추천, 싱글 몰트, 버번, 꼬냑 등급, 와인 빈티지, 주류 리뷰, 드링크인덱스'}
      />
```

- [ ] **Step 2: SpiritListPage SeoMeta에 카테고리별 keywords 추가**

`SpiritListPage.tsx`에서 `CATEGORY_META` 객체를 아래와 같이 확장 (기존 4 필드에 `keywordsKo`, `keywordsEn` 추가):

```typescript
const CATEGORY_META: Record<SpiritCategory | '', {
  titleKo: string; titleEn: string; descKo: string; descEn: string;
  keywordsKo: string; keywordsEn: string;
}> = {
  '':       { titleKo: '주류 카탈로그',  titleEn: 'Spirit Catalog',
              descKo: '위스키, 와인, 꼬냑, 럼, 데킬라까지 — DrinkIndex 의 주류 전체 카탈로그를 탐색하고 사용자 평점·리뷰를 확인하세요.',
              descEn: 'Browse the full spirit catalog — whisky, wine, cognac, rum, tequila and more. User ratings and reviews on DrinkIndex.',
              keywordsKo: '주류 리뷰, 위스키 추천, 와인 추천, 꼬냑 추천, 증류소, 드링크인덱스',
              keywordsEn: 'spirit review, whisky catalog, wine catalog, cognac catalog, drinkindex' },
  WHISKY:   { titleKo: '위스키',       titleEn: 'Whisky',
              descKo: '싱글 몰트, 블렌디드, 버번까지. 증류소·지역별 위스키 정보와 사용자 평점을 한 곳에서.',
              descEn: 'Single malt, blended, bourbon and more. Explore whisky by distillery and region with user ratings.',
              keywordsKo: '위스키, 싱글 몰트, 블렌디드 위스키, 버번, 스카치, 아이리시 위스키, 위스키 리뷰',
              keywordsEn: 'whisky, single malt, blended whisky, bourbon, scotch, irish whiskey, whisky review' },
  COGNAC:   { titleKo: '꼬냑',         titleEn: 'Cognac',
              descKo: 'VS·VSOP·XO 등급별, 그랑드 샹파뉴·프티트 샹파뉴 등 크뤼별 꼬냑 정보와 사용자 리뷰.',
              descEn: 'Cognac by grade (VS, VSOP, XO) and cru (Grande/Petite Champagne, etc.). User reviews and ratings.',
              keywordsKo: '꼬냑, VS VSOP XO, 그랑드 샹파뉴, 헤네시, 레미마틴, 꼬냑 리뷰, 꼬냑 등급',
              keywordsEn: 'cognac, VS VSOP XO, Grande Champagne, Hennessy, Remy Martin, cognac review, cognac grade' },
  WINE:     { titleKo: '와인',         titleEn: 'Wine',
              descKo: '레드·화이트·스파클링·디저트 와인. 와이너리·국가·지역별 와인 정보와 사용자 평점.',
              descEn: 'Red, white, sparkling and dessert wines. Browse wines by winery, country and region.',
              keywordsKo: '와인, 레드 와인, 화이트 와인, 스파클링, 빈티지, 와이너리, 와인 리뷰, 내추럴 와인',
              keywordsEn: 'wine, red wine, white wine, sparkling wine, vintage, winery, wine review, natural wine' },
  OTHER:    { titleKo: '기타 주류',     titleEn: 'Other Spirits',
              descKo: '럼, 데킬라, 진, 보드카 등 기타 주류 카탈로그. 사용자 평점과 리뷰.',
              descEn: 'Rum, tequila, gin, vodka and other spirits. User ratings and reviews.',
              keywordsKo: '럼, 데킬라, 진, 보드카, 기타 주류, 주류 리뷰',
              keywordsEn: 'rum, tequila, gin, vodka, spirits review' },
}
```

- [ ] **Step 3: SpiritListPage SeoMeta에 keywords prop 연결**

`SpiritListPage.tsx`의 `<SeoMeta` 블록에 `keywords` prop 추가:

변경 전:
```typescript
      <SeoMeta
        title={isEn ? meta.titleEn : meta.titleKo}
        description={isEn ? meta.descEn : meta.descKo}
        canonical={seoCanonical}
        locale={isEn ? 'en_US' : 'ko_KR'}
        noindex={seoNoindex}
        jsonLd={seoJsonLd}
      />
```

변경 후:
```typescript
      <SeoMeta
        title={isEn ? meta.titleEn : meta.titleKo}
        description={isEn ? meta.descEn : meta.descKo}
        canonical={seoCanonical}
        locale={isEn ? 'en_US' : 'ko_KR'}
        noindex={seoNoindex}
        keywords={isEn ? meta.keywordsEn : meta.keywordsKo}
        jsonLd={seoJsonLd}
      />
```

- [ ] **Step 4: TypeScript 확인**

```
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 5: 커밋**

```
git add drinkindex-web/src/pages/MainPage.tsx drinkindex-web/src/pages/SpiritListPage.tsx
git commit -m "feat(seo): add keywords and improve descriptions on MainPage and SpiritListPage"
```

---

## Task 7: FaqPage — 8문항 추가 + 영어 FAQ 섹션

**Files:**
- Modify: `drinkindex-web/src/pages/FaqPage.tsx`

- [ ] **Step 1: QAS 배열에 8문항 추가**

`FaqPage.tsx`의 `QAS` 배열 마지막 항목 `}` 이후(닫는 `]` 이전)에 추가:

```typescript
  {
    q: '아이라(Islay) 위스키란 무엇인가요?',
    a: '아이라는 스코틀랜드 서부 해안의 섬으로, 강한 피트 훈연과 해양성 바람의 영향을 받은 위스키로 유명합니다. 라가불린, 라프로익, 보모어, 브루흐라디, 아드벡 등이 대표 증류소이며, 스모키·아이오딘·바닷소금 향이 특징입니다.',
  },
  {
    q: '스카치 위스키의 5대 산지는 어디인가요?',
    a: '스카치 위스키는 하이랜드 (Highland), 스페이사이드 (Speyside), 아일랜드 (Islay), 로우랜드 (Lowland), 캠벨타운 (Campbeltown) 5개 지역으로 구분됩니다. 스페이사이드는 과일·꿀·바닐라 풍미, 하이랜드는 다채로운 스타일, 아일라는 강한 피트향이 특징입니다.',
  },
  {
    q: '버번(Bourbon) 위스키의 법적 정의와 조건은 무엇인가요?',
    a: '버번은 미국에서 생산되며 곡물 중 51% 이상이 옥수수여야 하고, 새 참나무 오크통에서 숙성해야 합니다. 증류 도수 160 proof(80%) 이하, 병입 도수 80 proof(40%) 이상이 요건입니다. 켄터키 주 생산이 많지만 법적으로 반드시 켄터키일 필요는 없습니다.',
  },
  {
    q: '와인 아펠라시옹(Appellation)이란 무엇인가요?',
    a: '아펠라시옹은 와인의 원산지 명칭 보호 제도입니다. 특정 지역에서 규정된 포도 품종·재배 방식·양조 방법을 따라 만들어진 와인만이 해당 명칭을 사용할 수 있습니다. 프랑스 AOC(원산지 명칭 통제), 이탈리아 DOC, 스페인 DO 등이 대표적입니다.',
  },
  {
    q: '내추럴 와인(Natural Wine)이란 무엇인가요?',
    a: '내추럴 와인은 유기농 또는 바이오다이나믹 농법으로 재배한 포도를 사용하고, 양조 과정에서 첨가물(이산화황, 인공 효모 등)을 최소화하거나 전혀 넣지 않은 와인입니다. 구름처럼 탁한 외관과 독특한 개성이 특징이며, 정해진 법적 기준은 없습니다.',
  },
  {
    q: '오크 숙성이 와인 맛에 미치는 영향은?',
    a: '오크통 숙성은 와인에 바닐라·토스트·향신료·삼나무 향을 더하고, 탄닌을 부드럽게 하며, 산화를 통해 복잡성을 높입니다. 새 오크통일수록 영향이 강하며, 프렌치 오크는 우아한 향신료 풍미, 아메리칸 오크는 강한 바닐라·코코넛 향을 주는 경향이 있습니다.',
  },
  {
    q: 'DrinkIndex 숙성력(점수·레벨) 시스템이란 무엇인가요?',
    a: 'DrinkIndex의 숙성력은 사용자 활동(리뷰 작성, 댓글, 좋아요 등)에 따라 쌓이는 활동 점수입니다. 점수가 쌓일수록 레벨이 올라가며, 주간·월간·전체 기간별 랭킹 (/ranking) 에서 다른 사용자와 비교할 수 있습니다.',
  },
  {
    q: '주류 등록 요청은 어떻게 하나요?',
    a: '로그인 후 [주류 등록 요청] (/request/spirit) 페이지에서 카탈로그에 없는 술의 이름·카테고리·증류소·도수 등 정보를 입력해 신청할 수 있습니다. 관리자가 검토 후 승인하면 정식 카탈로그에 추가되며, 신청 상태는 마이페이지에서 확인 가능합니다.',
  },
```

- [ ] **Step 2: 영어 FAQ 섹션 컴포넌트 추가**

`FaqPage.tsx`의 `QAS` 배열 선언 다음(컴포넌트 선언 이전)에 영어 Q&A 배열 추가:

```typescript
const QAS_EN: QA[] = [
  {
    q: 'What is DrinkIndex?',
    a: 'DrinkIndex is a Korean-based spirits review community for whisky, wine, cognac, rum, tequila and more. Users rate each spirit on nose, taste and finish (0–100 each) and share tasting notes alongside distillery and winery information.',
  },
  {
    q: 'What is a Single Malt Whisky?',
    a: 'A single malt whisky is made entirely from malted barley at a single distillery. It is distilled in pot stills and aged in oak casks. Each distillery\'s single malt has its own distinct character shaped by water source, distillation style, and cask type.',
  },
  {
    q: 'What do VS, VSOP, and XO mean for Cognac?',
    a: 'These grades reflect the minimum age of the youngest eau-de-vie in the blend. VS (Very Special): at least 2 years. VSOP (Very Superior Old Pale): at least 4 years. Napoléon: at least 6 years. XO (Extra Old): at least 10 years (since 2018). XXO: at least 14 years.',
  },
  {
    q: 'What is a NAS Whisky?',
    a: 'NAS stands for No Age Statement — a whisky without a stated age on the label. It allows distillers to blend spirits of various ages freely, often creating consistent house styles without being constrained by a specific maturation period.',
  },
  {
    q: 'How does DrinkIndex score spirits?',
    a: 'DrinkIndex uses a 0–100 scale across three dimensions: nose, taste, and finish. The totalScore is the average of these three ratings. Users can also add written tasting notes and select aromas from a wheel to create detailed reviews.',
  },
]
```

- [ ] **Step 3: FaqPage 컴포넌트에 영어 FAQ 섹션 렌더링 추가**

`FaqPage.tsx`의 `return` 블록에서 QA 리스트 div 다음에 추가:

```typescript
      {/* ── 영어 FAQ 섹션 ── */}
      <div className="mt-10">
        <h2 className="text-xl font-bold text-neutral-900 mb-1">FAQ — English</h2>
        <p className="text-sm text-neutral-500 mb-6">Key questions about whisky, wine and cognac.</p>
        <div className="bg-white border border-neutral-200 rounded-2xl divide-y divide-neutral-100">
          {QAS_EN.map((qa, i) => (
            <FaqItem
              key={`en-${i}`}
              qa={qa}
              open={openIdx === QAS.length + i}
              onToggle={() => setOpenIdx(openIdx === QAS.length + i ? null : QAS.length + i)}
            />
          ))}
        </div>
      </div>
```

- [ ] **Step 4: faqJsonLd에 영어 항목 합치기**

`FaqPage.tsx`의 `faqJsonLd` 객체 수정:

변경 전:
```typescript
  const faqJsonLd = {
    '@type': 'FAQPage' as const,
    mainEntity: QAS.map((qa) => ({
      '@type': 'Question',
      name: qa.q,
      acceptedAnswer: { '@type': 'Answer', text: qa.a },
    })),
  }
```

변경 후:
```typescript
  const faqJsonLd = {
    '@type': 'FAQPage' as const,
    mainEntity: [...QAS, ...QAS_EN].map((qa) => ({
      '@type': 'Question',
      name: qa.q,
      acceptedAnswer: { '@type': 'Answer', text: qa.a },
    })),
  }
```

- [ ] **Step 5: SeoMeta keywords 영어 추가**

`FaqPage.tsx`의 SeoMeta `keywords` prop 업데이트:

변경 전:
```typescript
        keywords="위스키 FAQ, 꼬냑 FAQ, 와인 FAQ, NAS, VSOP, XO, 캐스크, 피티드, 빈티지"
```

변경 후:
```typescript
        keywords="위스키 FAQ, 꼬냑 FAQ, 와인 FAQ, NAS, VSOP, XO, 캐스크, 피티드, 빈티지, whisky FAQ, cognac grade, single malt, bourbon"
```

- [ ] **Step 6: TypeScript 확인**

```
npx tsc --noEmit
```

Expected: 오류 없음

- [ ] **Step 7: 커밋**

```
git add drinkindex-web/src/pages/FaqPage.tsx
git commit -m "feat(aeo): add 8 Korean FAQ entries and English FAQ section to FaqPage"
```

---

## Task 8: llms.txt — Q&A 섹션 + 차별점 섹션 추가

**Files:**
- Modify: `drinkindex-web/public/llms.txt`

- [ ] **Step 1: llms.txt 파일 끝에 섹션 추가**

`drinkindex-web/public/llms.txt` 파일의 맨 끝에 아래 내용 추가:

```markdown

## 핵심 Q&A (AI 인용용 요약)

**싱글 몰트 위스키란?** 단일 증류소에서 100% 맥아만으로 만들고 포트 스틸로 증류한 위스키. 증류소마다 독자적인 풍미를 가진다.

**꼬냑 XO 등급이란?** 블렌드 내 가장 어린 오 드 비가 최소 10년 이상 숙성된 꼬냑 (2018년 기준 개정). XXO는 최소 14년.

**DrinkIndex 평점 체계는?** 향(nose) · 맛(taste) · 피니시(finish) 각 0~100점 평균 = totalScore. 100점에 가까울수록 우수.

**위스키 캐스크 종류는?** Ex-Bourbon(바닐라·꿀) / Ex-Sherry(건과일·초콜릿) / Ex-Port(베리) / Mizunara(향신료·백단향) / Ex-Wine 등.

**피티드 위스키란?** 맥아 건조 시 피트(이탄) 연기로 훈연. ppm(페놀 함량) 수치가 높을수록 강한 스모키향. 아이라 위스키가 대표적.

**꼬냑 그랑드 샹파뉴란?** 꼬냑 최상급 크뤼. 백악질 토양에서 자란 포도로 만들어 풍부한 꽃향과 긴 피니시가 특징.

**NAS 위스키란?** No Age Statement. 라벨에 숙성 연수 미표기. 연수 제약 없이 블렌딩 가능해 일관된 풍미 유지 용이.

**버번 위스키 조건은?** 미국산, 옥수수 51% 이상, 새 참나무 오크통 숙성, 증류 도수 80% 이하, 병입 40% 이상.

**스카치 5대 산지는?** 하이랜드(Highland) · 스페이사이드(Speyside) · 아이라(Islay) · 로우랜드(Lowland) · 캠벨타운(Campbeltown).

**와인 아펠라시옹이란?** 원산지 명칭 보호 제도. 해당 지역·품종·방식 기준 충족 시만 명칭 사용 가능. 프랑스 AOC, 이탈리아 DOC, 스페인 DO 등.

**숙성력(Maturing Power)이란?** DrinkIndex 사용자 활동 점수 시스템. 리뷰·댓글·좋아요 등 활동에 따라 점수가 쌓이고 레벨이 상승.

## DrinkIndex 차별점 (vs 타 플랫폼)

- **한국어 주류 정보 1차 출처**: 한국어로 작성된 위스키·꼬냑·와인 상세 정보 및 사용자 리뷰 플랫폼으로, 국내 최대 규모.
- **세분화된 평가 구조**: 향·맛·피니시 3항목 0~100점 척도 + 아로마 휠 선택 (단순 별점 대비 상세한 테이스팅 노트).
- **기계 판독 가능한 구조화 데이터**: Schema.org Product + AggregateRating + Review JSON-LD 완비 — AI 및 검색엔진이 직접 파싱 가능.
- **AI 학습·인용 전면 허용**: robots.txt에서 GPTBot, ClaudeBot, PerplexityBot, Google-Extended 등 모두 명시 허용.
- **주류 도메인 전문성**: 증류소(위스키) / 와이너리(와인) / 꼬냑 하우스(꼬냑) / 아펠라시옹 별도 데이터베이스 보유.

## Key Q&A (English, for AI citation)

**What is a single malt whisky?** A whisky made entirely from malted barley at a single distillery, distilled in pot stills, aged in oak casks.

**What does XO mean for cognac?** XO (Extra Old) means the youngest eau-de-vie in the blend has been aged at least 10 years (revised standard since 2018).

**What is NAS whisky?** No Age Statement — a whisky without an age declaration on the label, allowing free blending of various age spirits.

**How does DrinkIndex rate spirits?** Nose, taste and finish each scored 0–100; totalScore is their average. Higher is better.

**What is Grande Champagne in cognac?** The top-tier cru in the Cognac region, known for chalky soil, floral aromas, and long finish.
```

- [ ] **Step 2: 내용 확인**

```
Get-Content drinkindex-web\public\llms.txt | Select-Object -Last 30
```

Expected: 추가한 섹션이 마지막에 출력됨

- [ ] **Step 3: 커밋**

```
git add drinkindex-web/public/llms.txt
git commit -m "feat(aeo): add Q&A and differentiator sections to llms.txt"
```

---

## 검증 체크리스트

- [ ] `https://drinkindex.net/sitemap.xml` — 카테고리 URL 4개 포함 확인
- [ ] Google Search Console → Sitemaps에 제출
- [ ] https://cards-dev.twitter.com/validator 에서 og-image 정상 표시
- [ ] https://developers.facebook.com/tools/debug/ 에서 og-image 정상 표시
- [ ] https://search.google.com/test/rich-results — Spirit 상세 Product 스키마 통과
- [ ] https://search.google.com/test/rich-results — FAQ 스키마 통과
- [ ] https://search.google.com/test/rich-results — Article 스키마 통과
- [ ] Perplexity에서 "DrinkIndex 위스키 리뷰" 검색 시 사이트 인용 확인
