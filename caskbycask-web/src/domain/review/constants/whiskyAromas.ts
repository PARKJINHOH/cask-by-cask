export interface AromaItem {
  id: string
  icon: string
  ko: string
  en: string
}

export interface AromaCategory {
  id: string
  ko: string
  en: string
  items: AromaItem[]
}

// 출처: Aromaster Whisky Aroma Wheel
// https://aromaster.com/wp-content/uploads/2019/06/Whisky-Aroma-Wheel-copy-1-600x600.jpg
export const WHISKY_AROMA_CATEGORIES: AromaCategory[] = [
  // ── FRUITY ───────────────────────────────────────────────────────
  {
    id: 'citrus',
    ko: '시트러스',
    en: 'Citrus',
    items: [
      { id: 'lime',        icon: '🍈', ko: '라임',      en: 'Lime' },
      { id: 'lemon',       icon: '🍋', ko: '레몬',      en: 'Lemon' },
      { id: 'grapefruit',  icon: '🍊', ko: '자몽',      en: 'Grapefruit' },
      { id: 'tangerine',   icon: '🍊', ko: '귤',        en: 'Tangerine' },
      { id: 'orange_peel', icon: '🟠', ko: '오렌지 필', en: 'Orange Peel' },
    ],
  },
  {
    id: 'tropical',
    ko: '열대 과일',
    en: 'Tropical Fruits',
    items: [
      { id: 'guava',        icon: '🍈', ko: '구아바',     en: 'Guava' },
      { id: 'mango',        icon: '🥭', ko: '망고',       en: 'Mango' },
      { id: 'banana',       icon: '🍌', ko: '바나나',     en: 'Banana' },
      { id: 'pineapple',    icon: '🍍', ko: '파인애플',   en: 'Pineapple' },
      { id: 'passion_fruit',icon: '🌺', ko: '패션프루트', en: 'Passion Fruit' },
    ],
  },
  {
    id: 'pome_stone',
    ko: '사과류 & 핵과류',
    en: 'Pome & Stone Fruits',
    items: [
      { id: 'pear',        icon: '🍐', ko: '배',     en: 'Pear' },
      { id: 'green_apple', icon: '🍏', ko: '풋사과', en: 'Green Apple' },
      { id: 'apple',       icon: '🍎', ko: '사과',   en: 'Apple' },
      { id: 'peach',       icon: '🍑', ko: '복숭아', en: 'Peach' },
      { id: 'cherry',      icon: '🍒', ko: '체리',   en: 'Cherry' },
      { id: 'plum',        icon: '🟣', ko: '자두',   en: 'Plum' },
    ],
  },
  {
    id: 'berries_dried',
    ko: '베리 & 건과일',
    en: 'Berries & Dried Fruits',
    items: [
      { id: 'raspberry',     icon: '🫐', ko: '라즈베리',    en: 'Raspberry' },
      { id: 'blackcurrant',  icon: '🫐', ko: '블랙커런트',  en: 'Blackcurrant' },
      { id: 'blackberry',    icon: '🫐', ko: '블랙베리',    en: 'Blackberry' },
      { id: 'prune',         icon: '🍇', ko: '프룬',        en: 'Prune' },
      { id: 'dried_fig',     icon: '🌰', ko: '무화과건조',  en: 'Dried Fig' },
      { id: 'dried_apricot', icon: '🍑', ko: '살구건조',    en: 'Dried Apricot' },
    ],
  },
  // ── FLORAL ───────────────────────────────────────────────────────
  {
    id: 'floral',
    ko: '꽃향',
    en: 'Floral',
    items: [
      { id: 'orange_blossom', icon: '🌸', ko: '오렌지꽃',  en: 'Orange Blossom' },
      { id: 'rose',           icon: '🌹', ko: '장미',      en: 'Rose' },
      { id: 'heather',        icon: '🌼', ko: '헤더',      en: 'Heather' },
      { id: 'geranium',       icon: '🌸', ko: '제라늄',    en: 'Geranium' },
      { id: 'lavender',       icon: '💜', ko: '라벤더',    en: 'Lavender' },
      { id: 'violet',         icon: '🟣', ko: '제비꽃',    en: 'Violet' },
    ],
  },
  // ── GRASSY ───────────────────────────────────────────────────────
  {
    id: 'grassy',
    ko: '풀향',
    en: 'Grassy',
    items: [
      { id: 'cut_grass',        icon: '🌿', ko: '풀냄새',        en: 'Cut Grass' },
      { id: 'fern',             icon: '🌿', ko: '양치식물',      en: 'Fern' },
      { id: 'eucalyptus',       icon: '🌱', ko: '유칼립투스',    en: 'Eucalyptus' },
      { id: 'mint',             icon: '🌱', ko: '민트',          en: 'Mint' },
      { id: 'juniper',          icon: '🌲', ko: '주니퍼',        en: 'Juniper' },
      { id: 'blackcurrant_leaf',icon: '🍃', ko: '블랙커런트 잎', en: 'Blackcurrant Leaf' },
      { id: 'bay_leaf',         icon: '🍃', ko: '월계수잎',      en: 'Bay Leaf' },
    ],
  },
  // ── CEREAL ───────────────────────────────────────────────────────
  {
    id: 'cereal',
    ko: '곡물향',
    en: 'Cereal',
    items: [
      { id: 'potato',  icon: '🥔', ko: '감자',   en: 'Potato' },
      { id: 'malt',    icon: '🍺', ko: '몰트',   en: 'Malt' },
      { id: 'biscuit', icon: '🍪', ko: '비스킷', en: 'Biscuit' },
      { id: 'corn',    icon: '🌽', ko: '옥수수', en: 'Corn' },
    ],
  },
  {
    id: 'roasted',
    ko: '구운향',
    en: 'Roasted',
    items: [
      { id: 'toast',     icon: '🍞', ko: '토스트', en: 'Toast' },
      { id: 'chocolate', icon: '🍫', ko: '초콜릿', en: 'Chocolate' },
      { id: 'coffee',    icon: '☕', ko: '커피',   en: 'Coffee' },
      { id: 'liquorice', icon: '🖤', ko: '감초',   en: 'Liquorice' },
      { id: 'anise',     icon: '⭐', ko: '아니스', en: 'Anise' },
    ],
  },
  {
    id: 'yeasty',
    ko: '발효향',
    en: 'Yeasty',
    items: [
      { id: 'sausage', icon: '🌭', ko: '소시지',  en: 'Sausage' },
      { id: 'gravy',   icon: '🍖', ko: '그레이비', en: 'Gravy' },
    ],
  },
  // ── FEINTY ───────────────────────────────────────────────────────
  {
    id: 'feinty',
    ko: '피인티',
    en: 'Feinty',
    items: [
      { id: 'tobacco',    icon: '🚬', ko: '담배',   en: 'Tobacco' },
      { id: 'leather',    icon: '🧳', ko: '가죽',   en: 'Leather' },
      { id: 'black_tea',  icon: '🍵', ko: '홍차',   en: 'Black Tea' },
      { id: 'butter',     icon: '🧈', ko: '버터',   en: 'Butter' },
      { id: 'candle_wax', icon: '🕯️', ko: '양초',   en: 'Candle Wax' },
      { id: 'fish',       icon: '🐟', ko: '생선',   en: 'Fish' },
      { id: 'iodine',     icon: '💉', ko: '요오드', en: 'Iodine' },
      { id: 'seaweed',    icon: '🌊', ko: '해초',   en: 'Seaweed' },
      { id: 'shellfish',  icon: '🦪', ko: '조개류', en: 'Shellfish' },
      { id: 'flint',      icon: '🪨', ko: '부싯돌', en: 'Flint' },
      { id: 'kerosene',   icon: '⛽', ko: '등유',   en: 'Kerosene' },
      { id: 'rubber',     icon: '⚫', ko: '고무',   en: 'Rubber' },
      { id: 'tar',        icon: '🟫', ko: '타르',   en: 'Tar' },
    ],
  },
  // ── PEATY ────────────────────────────────────────────────────────
  {
    id: 'peaty',
    ko: '피티',
    en: 'Peaty',
    items: [
      { id: 'bacon',       icon: '🥓', ko: '베이컨',   en: 'Bacon' },
      { id: 'old_bandaid', icon: '🩹', ko: '반창고',   en: 'Old Band-Aid' },
      { id: 'medicinal',   icon: '💊', ko: '약품',     en: 'Medicinal' },
      { id: 'tree_moss',   icon: '🌿', ko: '나무이끼', en: 'Tree Moss' },
      { id: 'earth',       icon: '🌍', ko: '흙',       en: 'Earth' },
      { id: 'peat',        icon: '💨', ko: '피트',     en: 'Peat' },
    ],
  },
  // ── WOODY ────────────────────────────────────────────────────────
  {
    id: 'maturation',
    ko: '오크통 숙성',
    en: 'Maturation / Oak Barrels',
    items: [
      { id: 'smoked',     icon: '💨', ko: '스모키',  en: 'Smoked' },
      { id: 'caramel',    icon: '🍮', ko: '카라멜',  en: 'Caramel' },
      { id: 'oak',        icon: '🪵', ko: '오크',    en: 'Oak' },
      { id: 'sandalwood', icon: '🪵', ko: '샌달우드', en: 'Sandalwood' },
      { id: 'cedar',      icon: '🌲', ko: '시더',    en: 'Cedar' },
      { id: 'pine',       icon: '🌲', ko: '소나무',  en: 'Pine' },
    ],
  },
  {
    id: 'nutty',
    ko: '너티',
    en: 'Nutty',
    items: [
      { id: 'honey',    icon: '🍯', ko: '꿀',      en: 'Honey' },
      { id: 'vanilla',  icon: '🍦', ko: '바닐라',  en: 'Vanilla' },
      { id: 'coconut',  icon: '🥥', ko: '코코넛',  en: 'Coconut' },
      { id: 'almond',   icon: '🌰', ko: '아몬드',  en: 'Almond' },
      { id: 'hazelnut', icon: '🌰', ko: '헤이즐넛', en: 'Hazelnut' },
      { id: 'walnut',   icon: '🌰', ko: '호두',    en: 'Walnut' },
    ],
  },
  // ── SPICY ────────────────────────────────────────────────────────
  {
    id: 'spicy',
    ko: '스파이시',
    en: 'Spicy',
    items: [
      { id: 'ginger',      icon: '🫚', ko: '생강',  en: 'Ginger' },
      { id: 'black_pepper',icon: '🌶️', ko: '후추',  en: 'Black Pepper' },
      { id: 'coriander',   icon: '🌿', ko: '고수',  en: 'Coriander' },
      { id: 'cinnamon',    icon: '🌿', ko: '시나몬', en: 'Cinnamon' },
      { id: 'nutmeg',      icon: '🟤', ko: '육두구', en: 'Nutmeg' },
      { id: 'cloves',      icon: '🟤', ko: '정향',  en: 'Cloves' },
    ],
  },
  // ── WINEY ────────────────────────────────────────────────────────
  {
    id: 'winey',
    ko: '와이니',
    en: 'Winey',
    items: [
      { id: 'sherry',  icon: '🍷', ko: '셰리',    en: 'Sherry' },
      { id: 'madeira', icon: '🍷', ko: '마데이라', en: 'Madeira' },
      { id: 'port',    icon: '🍷', ko: '포트와인', en: 'Port' },
    ],
  },
]

export const WHISKY_AROMA_MAP = new Map<string, AromaItem>(
  WHISKY_AROMA_CATEGORIES.flatMap((c) => c.items).map((item) => [item.id, item]),
)

// ── 섹션별 아로마 노트 (선택 ID + 커스텀 텍스트) ──────────────────

export interface AromaNotes {
  ids: string[]     // 선택한 predefined 아이템 ID 목록
  custom: string[]  // 직접 입력한 커스텀 단어 목록
}

export const EMPTY_AROMA_NOTES: AromaNotes = { ids: [], custom: [] }

/**
 * 저장 형식: "raisin,citrus,c:흙냄새,c:달콤한%20향"
 * predefined ID: 그대로, custom: "c:" + encodeURIComponent(value)
 */
export function parseAromaNotes(raw: string | null | undefined): AromaNotes {
  if (!raw) return { ids: [], custom: [] }
  const ids: string[] = []
  const custom: string[] = []
  for (const part of raw.split(',').filter(Boolean)) {
    if (part.startsWith('c:')) {
      try { custom.push(decodeURIComponent(part.slice(2))) } catch { custom.push(part.slice(2)) }
    } else {
      ids.push(part)
    }
  }
  return { ids, custom }
}

export function serializeAromaNotes(notes: AromaNotes): string | undefined {
  const parts = [
    ...notes.ids,
    ...notes.custom.map((c) => `c:${encodeURIComponent(c)}`),
  ]
  return parts.length > 0 ? parts.join(',') : undefined
}
