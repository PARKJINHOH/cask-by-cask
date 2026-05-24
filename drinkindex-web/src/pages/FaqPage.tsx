import { useState } from 'react'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import { buildBreadcrumbSchema } from '@/shared/utils/seoSchema'

/**
 * FAQ 페이지 — AEO (AI 검색 인용) 최적화 목적.
 *
 * 자주 묻는 질문을 FAQPage 구조화 데이터로 노출하여:
 *  - Google 검색결과의 FAQ rich snippet
 *  - ChatGPT / Perplexity / Claude 의 직접 인용 가능성 ↑
 *
 * 한국어 기준 작성. 영어판은 추후 i18n 으로 확장 예정.
 */

interface QA {
  q: string
  a: string
}

const QAS: QA[] = [
  {
    q: 'DrinkIndex 는 어떤 서비스인가요?',
    a: 'DrinkIndex 는 위스키, 와인, 꼬냑, 럼, 데킬라 등 다양한 주류의 정보를 모으고 사용자 리뷰와 평점을 공유하는 한국어 기반 주류 리뷰 커뮤니티 플랫폼입니다. 향(nose)·맛(taste)·피니시(finish) 세 항목을 0~100점 척도로 평가하고, 증류소·와이너리 등 원산지 정보를 함께 확인할 수 있습니다.',
  },
  {
    q: '위스키란 무엇인가요?',
    a: '위스키 (Whisky / Whiskey) 는 보리, 밀, 옥수수, 호밀 등 곡물을 발효·증류한 뒤 오크통에서 일정 기간 숙성시켜 만든 증류주입니다. 보통 도수는 40% 이상이며, 원산지·곡물·증류 방식에 따라 스카치 (Scotch), 버번 (Bourbon), 아이리시 (Irish), 재패니즈 (Japanese), 라이 (Rye) 등으로 분류됩니다.',
  },
  {
    q: '싱글 몰트 (Single Malt) 와 블렌디드 (Blended) 위스키는 어떻게 다른가요?',
    a: '싱글 몰트는 단일 증류소에서 100% 맥아 (몰트) 만으로 만든 위스키이며, 블렌디드는 여러 증류소의 몰트 위스키와 그레인 위스키를 섞은 위스키입니다. 싱글 몰트는 증류소별 개성이 뚜렷하고, 블렌디드는 균형감과 부드러움이 강조됩니다.',
  },
  {
    q: 'NAS 위스키가 무엇인가요?',
    a: 'NAS (No Age Statement) 는 라벨에 숙성 연수가 표기되지 않은 위스키를 뜻합니다. 다른 연수의 원액을 자유롭게 블렌딩할 수 있어 일관된 풍미를 만들기 좋고, 12년·18년처럼 연수에 묶이지 않는 마스터 블렌더의 창의성을 보여주는 라인업이 많습니다.',
  },
  {
    q: '캐스크 (Cask) 타입이 위스키 맛에 어떤 영향을 주나요?',
    a: '숙성에 사용된 오크통의 이전 내용물이 위스키 풍미를 크게 좌우합니다. 엑스 버번 (Ex-Bourbon) 캐스크는 바닐라·꿀·코코넛 향을, 엑스 셰리 (Ex-Sherry) 캐스크는 건과일·초콜릿·견과류 풍미를, 와인 캐스크는 베리·향신료 노트를 더해줍니다.',
  },
  {
    q: '피티드 (Peated) 위스키와 페놀 ppm 은 무엇인가요?',
    a: '피티드 위스키는 맥아를 건조할 때 피트 (Peat, 이탄) 를 태운 연기로 훈연한 위스키로, 스모키한 향이 특징입니다. ppm (parts per million) 은 피트 페놀 함량 단위로, 숫자가 클수록 강한 피트 향이 납니다. 아일라 위스키들이 대표적이며, 라가불린·라프로익은 25~40 ppm 수준입니다.',
  },
  {
    q: '꼬냑 (Cognac) 은 무엇인가요?',
    a: '꼬냑은 프랑스 꼬냑 지방에서 생산되는 브랜디로, 백포도 (주로 위니 블랑) 를 발효·증류한 뒤 프렌치 오크통에서 최소 2년 이상 숙성합니다. 원산지 명칭 보호 (AOC) 를 받으며, 헤네시·레미 마틴·마르텔·꾸르브와지에가 4대 메종으로 꼽힙니다.',
  },
  {
    q: '꼬냑의 VS, VSOP, XO 등급은 어떻게 다른가요?',
    a: '꼬냑 등급은 블렌드 중 가장 어린 원액 (오 드 비) 의 숙성 연수를 기준으로 합니다. VS (Very Special) 는 최소 2년, VSOP (Very Superior Old Pale) 는 최소 4년, 나폴레옹 (Napoléon) 은 최소 6년, XO (Extra Old) 는 2018년부터 최소 10년, XXO (Extra Extra Old) 는 최소 14년 이상입니다.',
  },
  {
    q: '꼬냑의 크뤼 (Cru) 는 무엇인가요?',
    a: '꼬냑 지방은 토양에 따라 6개 크뤼로 구분됩니다. 그랑드 샹파뉴 (Grande Champagne) 가 최상급이며 풍부한 꽃향과 긴 피니시가 특징, 그 다음이 프티트 샹파뉴 (Petite Champagne), 보르드리 (Borderies), 팽 부아 (Fins Bois), 봉 부아 (Bons Bois), 부아 오르디네르 (Bois Ordinaires) 순입니다. 그랑드+프티트 샹파뉴 100% 블렌드 중 그랑드 50% 이상이면 핀 샹파뉴 (Fine Champagne) 라 부릅니다.',
  },
  {
    q: '와인의 빈티지 (Vintage) 는 무엇을 의미하나요?',
    a: '빈티지는 와인의 원료 포도가 수확된 연도입니다. 같은 와이너리·같은 와인이라도 그 해의 기후 (강수량·일조량·기온) 에 따라 풍미와 품질이 달라지므로, 빈티지는 와인의 개성과 시장가치를 결정하는 중요한 요소입니다.',
  },
  {
    q: '와인의 종류는 어떻게 나뉘나요?',
    a: '와인은 색·발효 방식에 따라 크게 분류됩니다. 레드 (Red), 화이트 (White), 로제 (Rosé), 스파클링 (Sparkling, 샴페인·프로세코 등), 디저트 (Dessert, 소떼른·아이스와인 등), 오렌지 (Orange) 와인이 있습니다.',
  },
  {
    q: '도수 (ABV) 가 높은 위스키는 어떻게 마셔야 하나요?',
    a: '캐스크 스트렝스 같이 50~60% ABV 위스키는 풍미가 농축되어 있어 그대로도 즐기지만, 몇 방울의 물 (워터링) 을 더하면 알코올 자극이 누그러지고 숨어 있던 향이 열리는 경우가 많습니다. 정답은 없으며, 본인의 취향에 맞춰 조절하면 됩니다.',
  },
  {
    q: '리뷰 점수는 어떻게 매겨지나요?',
    a: 'DrinkIndex 는 향 (nose), 맛 (taste), 피니시 (finish) 세 항목을 각각 0~100점으로 평가하고, 세 점수의 평균을 totalScore 로 사용합니다. 사용자 코멘트와 아로마 휠 (직접 감지한 향·맛 카테고리) 도 함께 기록할 수 있어, 단순 별점보다 자세한 테이스팅 노트를 남길 수 있습니다.',
  },
  {
    q: '평점이 높은 술을 어디서 볼 수 있나요?',
    a: '메인 페이지의 "평점 높은 술" 섹션과 주류 카탈로그 (/spirits) 에서 평점순 정렬로 확인할 수 있습니다. 카테고리·국가·도수·점수 범위 등으로 세부 필터링도 가능합니다.',
  },
  {
    q: '직접 술 정보를 등록할 수 있나요?',
    a: '로그인한 회원은 [주류 등록 요청] (/request/spirit) 페이지에서 카탈로그에 없는 술을 신청할 수 있습니다. 관리자가 검토 후 승인하면 카탈로그에 추가됩니다.',
  },
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
]

const QAS_EN: QA[] = [
  {
    q: 'What is DrinkIndex?',
    a: 'DrinkIndex is a Korean-based spirits review community for whisky, wine, cognac, rum, tequila and more. Users rate each spirit on nose, taste and finish (0–100 each) and share tasting notes alongside distillery and winery information.',
  },
  {
    q: 'What is a Single Malt Whisky?',
    a: "A single malt whisky is made entirely from malted barley at a single distillery. It is distilled in pot stills and aged in oak casks. Each distillery's single malt has its own distinct character shaped by water source, distillation style, and cask type.",
  },
  {
    q: 'What do VS, VSOP, and XO mean for Cognac?',
    a: "These grades reflect the minimum age of the youngest eau-de-vie in the blend. VS (Very Special): at least 2 years. VSOP (Very Superior Old Pale): at least 4 years. Napoléon: at least 6 years. XO (Extra Old): at least 10 years (since 2018). XXO: at least 14 years.",
  },
  {
    q: 'What is a NAS Whisky?',
    a: "NAS stands for No Age Statement — a whisky without a stated age on the label. It allows distillers to blend spirits of various ages freely, often creating consistent house styles without being constrained by a specific maturation period.",
  },
  {
    q: 'How does DrinkIndex score spirits?',
    a: 'DrinkIndex uses a 0–100 scale across three dimensions: nose, taste, and finish. The totalScore is the average of these three ratings. Users can also add written tasting notes and select aromas from a wheel to create detailed reviews.',
  },
]

function FaqItem({ qa, open, onToggle }: { qa: QA; open: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-neutral-100 last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start justify-between gap-3 py-4 text-left
          hover:bg-neutral-50/60 transition-colors px-2"
        aria-expanded={open}
      >
        <span className="text-base font-semibold text-neutral-900 leading-snug">
          {qa.q}
        </span>
        <svg
          className={`w-4 h-4 mt-1.5 flex-shrink-0 text-neutral-400 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="px-2 pb-5 text-sm text-neutral-700 leading-relaxed">
          {qa.a}
        </div>
      )}
    </div>
  )
}

export default function FaqPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  const faqJsonLd = {
    '@type': 'FAQPage' as const,
    mainEntity: [...QAS, ...QAS_EN].map((qa) => ({
      '@type': 'Question',
      name: qa.q,
      acceptedAnswer: { '@type': 'Answer', text: qa.a },
    })),
  }

  const breadcrumbJsonLd = buildBreadcrumbSchema([
    { name: '홈', path: '/' },
    { name: '자주 묻는 질문', path: '/faq' },
  ])

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <SeoMeta
        title="자주 묻는 질문 (FAQ)"
        description="위스키, 와인, 꼬냑 등 주류에 대한 자주 묻는 질문 — NAS, 캐스크 타입, 피티드, VSOP/XO 등급, 빈티지 등 핵심 용어 정리. DrinkIndex FAQ."
        canonical={buildCanonical('/faq')}
        keywords="위스키 FAQ, 꼬냑 FAQ, 와인 FAQ, NAS, VSOP, XO, 캐스크, 피티드, 빈티지, whisky FAQ, cognac grade, single malt, bourbon"
        jsonLd={[faqJsonLd, breadcrumbJsonLd]}
      />

      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">자주 묻는 질문</h1>
        <p className="mt-1 text-sm text-neutral-500">
          위스키 · 와인 · 꼬냑 등 주류 기본 용어와 DrinkIndex 사용법.
        </p>
      </div>

      {/* QA 리스트 */}
      <div className="bg-white border border-neutral-200 rounded-2xl divide-y divide-neutral-100">
        {QAS.map((qa, i) => (
          <FaqItem
            key={i}
            qa={qa}
            open={openIdx === i}
            onToggle={() => setOpenIdx(openIdx === i ? null : i)}
          />
        ))}
      </div>

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

      <p className="mt-6 text-xs text-neutral-400">
        더 궁금한 점이 있으면 <a href="/inquiry" className="text-primary-800 hover:underline">문의하기</a> 를 이용해주세요.
      </p>
    </div>
  )
}
