/**
 * 소개(About) 페이지 본문 — 서버 스냅샷과 SPA 화면의 **단일 출처**.
 *
 * `getAboutSeoSnapshot`(서버)과 `AboutPage`(클라이언트)가 이 상수 하나만 읽는다.
 * 양쪽이 각자 문자열을 갖고 있으면 SSR HTML 과 하이드레이션 뒤 DOM 이 갈리는데,
 * 이 저장소는 그 사고를 이미 두 번 겪었다(주류 상세 aggregateRating, 유튜브 JSON-LD).
 *
 * i18n 예외: AGENTS.md 는 UI 문자열에 `t()` 를 요구하지만 i18next 는 클라이언트 전용이라
 * 서버 스냅샷이 쓸 수 없다. `DEFAULT_SEO_TEXT`·`ORGANIZATION_DESCRIPTION`·`YOUTUBE_SEO_TEXT`·
 * `SPIRIT_SCHEMA_TEXT` 가 모두 같은 이유로 lang-keyed 상수인 선례를 따른다.
 * 화면 크롬(푸터 링크 라벨 등)은 그대로 locale JSON 을 쓴다.
 *
 * 공개 범위는 **서비스 정보로 한정**한다 — 운영자 실명·이메일·주소·사업자등록번호는 넣지 않는다.
 */

/** 서비스 시작일. 약관 시행일(LegalDocumentTemplate.java)과 같은 날이어야 한다. */
export const SERVICE_LAUNCH_DATE = '2026-06-01'

export interface AboutFact {
  label: string
  value: string
}

export interface AboutLink {
  label: string
  href: string
}

export interface AboutCopy {
  /** 페이지 h1. DEFAULT_ROUTE_METADATA.about[lang].h1 과 같은 문자열이어야 한다. */
  heading: string
  eyebrow: string
  /** 리드 문단들. 첫 문단은 정체 문장이며 meta description 과 스키마 description 으로도 쓰인다. */
  lead: string[]
  offeringsHeading: string
  offerings: string[]
  factsHeading: string
  facts: AboutFact[]
  keyPagesHeading: string
  keyPages: AboutLink[]
}

export const ABOUT_CONTENT: Record<'ko' | 'en', AboutCopy> = {
  ko: {
    heading: 'CaskByCask(캐스크바이캐스크) 소개',
    eyebrow: '서비스 소개',
    lead: [
      'CaskByCask(캐스크바이캐스크, 줄여서 캐바캐)는 위스키·와인·꼬냑을 비롯한 주류 정보를 모으고, 시음 노트와 사용자 평점 리뷰를 함께 쌓는 한국어 주류 정보 커뮤니티입니다.',
    ],
    offeringsHeading: '제공하는 것',
    offerings: [
      '주류 카탈로그 — 위스키(싱글 몰트·블렌디드·버번), 와인(레드·화이트·스파클링), 꼬냑(VS·VSOP·XO), 럼·데킬라·진',
      '사용자 리뷰 — 향(nose)·맛(taste)·피니시(finish)를 0~100점으로 나눠 기록하고 아로마를 함께 남깁니다',
      '생산자 정보 — 증류소·와이너리·꼬냑 하우스의 국가와 산지',
      '커뮤니티 — 자유게시판, 소식, BYOB 모임, 이미지 갤러리',
      '랭킹 — 활동 점수 기반 주간·월간·전체 순위',
    ],
    factsHeading: '서비스 정보',
    facts: [
      { label: '서비스 시작', value: '2026년 6월 1일' },
      { label: '기본 언어', value: '한국어(ko-KR), 영어 부분 지원(en-US)' },
      { label: '운영 형태', value: '캐바캐 운영팀이 운영하는 커뮤니티 서비스' },
    ],
    keyPagesHeading: '주요 페이지',
    keyPages: [
      { label: '주류 카탈로그', href: '/ko/spirits' },
      { label: '커뮤니티', href: '/ko/community/all' },
      { label: '자주 묻는 질문', href: '/ko/faq' },
      { label: '이용약관', href: '/ko/terms' },
      { label: '개인정보 처리방침', href: '/ko/privacy' },
      { label: '커뮤니티 운영정책', href: '/ko/operation-policy' },
      { label: '문의하기', href: '/ko/inquiry' },
    ],
  },
  en: {
    heading: 'About CaskByCask (캐스크바이캐스크)',
    eyebrow: 'About the service',
    lead: [
      'CaskByCask (캐스크바이캐스크, also shortened to 캐바캐) is a Korean-language spirits community that collects information on whisky, wine, cognac and other spirits alongside tasting notes and user ratings.',
    ],
    offeringsHeading: 'What we offer',
    offerings: [
      'Spirits catalogue — whisky (single malt, blended, bourbon), wine (red, white, sparkling), cognac (VS, VSOP, XO), rum, tequila and gin',
      'User reviews — nose, taste and finish scored separately on a 0-100 scale, with aroma notes',
      'Producer profiles — distilleries, wineries and cognac houses with country and region',
      'Community — open board, news, BYOB meetups and a photo gallery',
      'Rankings — weekly, monthly and all-time activity rankings',
    ],
    factsHeading: 'Service information',
    facts: [
      { label: 'Launched', value: '1 June 2026' },
      { label: 'Languages', value: 'Korean (ko-KR) primary, partial English (en-US)' },
      { label: 'Operated by', value: 'The CaskByCask team' },
    ],
    keyPagesHeading: 'Key pages',
    keyPages: [
      { label: 'Spirits catalogue', href: '/en/spirits' },
      { label: 'Community', href: '/en/community/all' },
      { label: 'FAQ', href: '/en/faq' },
      { label: 'Terms of Service', href: '/en/terms' },
      { label: 'Privacy Policy', href: '/en/privacy' },
      { label: 'Community Policy', href: '/en/operation-policy' },
      { label: 'Contact', href: '/en/inquiry' },
    ],
  },
}
