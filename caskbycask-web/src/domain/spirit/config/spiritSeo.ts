export const SPIRIT_CATEGORIES = ['WHISKY', 'COGNAC', 'WINE', 'OTHER'] as const

export type SpiritSeoCategory = typeof SPIRIT_CATEGORIES[number]

export const SPIRIT_CATEGORY_META: Record<SpiritSeoCategory | '', {
  titleKo: string
  titleEn: string
  descKo: string
  descEn: string
  keywordsKo: string
  keywordsEn: string
}> = {
  '': {
    titleKo: '주류 카탈로그',
    titleEn: 'Spirit Catalog',
    descKo: '위스키, 와인, 꼬냑, 럼, 데킬라까지 — CaskByCask의 주류 전체 카탈로그를 탐색하고 사용자 평점·리뷰를 확인하세요.',
    descEn: 'Browse the full spirit catalog — whisky, wine, cognac, rum, tequila and more. User ratings and reviews on CaskByCask.',
    keywordsKo: '주류 리뷰, 위스키 추천, 와인 추천, 꼬냑 추천, 증류소, 캐스크바이캐스크',
    keywordsEn: 'spirit review, whisky catalog, wine catalog, cognac catalog, caskbycask',
  },
  WHISKY: {
    titleKo: '위스키',
    titleEn: 'Whisky',
    descKo: '싱글 몰트, 블렌디드, 버번까지. 증류소·지역별 위스키 정보와 사용자 평점을 한 곳에서 확인하세요.',
    descEn: 'Single malt, blended, bourbon and more. Explore whisky by producer and region with user ratings.',
    keywordsKo: '위스키, 싱글 몰트, 블렌디드 위스키, 버번, 스카치, 아이리시 위스키, 위스키 리뷰',
    keywordsEn: 'whisky, single malt, blended whisky, bourbon, scotch, irish whiskey, whisky review',
  },
  COGNAC: {
    titleKo: '꼬냑',
    titleEn: 'Cognac',
    descKo: 'VS·VSOP·XO 등급별, 그랑드 샹파뉴·프티트 샹파뉴 등 크뤼별 꼬냑 정보와 사용자 리뷰를 확인하세요.',
    descEn: 'Cognac by grade (VS, VSOP, XO) and cru (Grande/Petite Champagne, etc.). User reviews and ratings.',
    keywordsKo: '꼬냑, VS VSOP XO, 그랑드 샹파뉴, 헤네시, 레미마틴, 꼬냑 리뷰, 꼬냑 등급',
    keywordsEn: 'cognac, VS VSOP XO, Grande Champagne, Hennessy, Remy Martin, cognac review, cognac grade',
  },
  WINE: {
    titleKo: '와인',
    titleEn: 'Wine',
    descKo: '레드·화이트·스파클링·디저트 와인을 와이너리·국가·지역별로 살펴보고 사용자 평점을 확인하세요.',
    descEn: 'Red, white, sparkling and dessert wines. Browse wines by winery, country and region.',
    keywordsKo: '와인, 레드 와인, 화이트 와인, 스파클링, 빈티지, 와이너리, 와인 리뷰, 내추럴 와인',
    keywordsEn: 'wine, red wine, white wine, sparkling wine, vintage, winery, wine review, natural wine',
  },
  OTHER: {
    titleKo: '기타 주류',
    titleEn: 'Other Spirits',
    descKo: '럼, 데킬라, 진, 보드카 등 기타 주류의 상세 정보와 사용자 평점·리뷰를 확인하세요.',
    descEn: 'Rum, tequila, gin, vodka and other spirits. User ratings and reviews.',
    keywordsKo: '럼, 데킬라, 진, 보드카, 기타 주류, 주류 리뷰',
    keywordsEn: 'rum, tequila, gin, vodka, spirits review',
  },
}

export function isSpiritSeoCategory(value: string | null | undefined): value is SpiritSeoCategory {
  return SPIRIT_CATEGORIES.includes(value as SpiritSeoCategory)
}
