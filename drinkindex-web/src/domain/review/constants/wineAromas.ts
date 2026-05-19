// 출처: Aromaster Wine Aroma Wheel
// https://aromaster.com/wp-content/uploads/2014/08/The-Wine-Aroma-Wheel-1.jpg
import type { AromaCategory } from './whiskyAromas'

export const WINE_AROMA_CATEGORIES: AromaCategory[] = [
  // ── FRUITY WHITE WINE ─────────────────────────────────────────
  {
    id: 'w_citrus_pome',
    ko: '시트러스 & 과일',
    en: 'Citrus & Pome Fruits',
    items: [
      { id: 'lemon',       icon: '🍋', ko: '레몬',      en: 'Lemon' },
      { id: 'lime',        icon: '🍈', ko: '라임',      en: 'Lime' },
      { id: 'grapefruit',  icon: '🍊', ko: '자몽',      en: 'Grapefruit' },
      { id: 'gooseberry',  icon: '🍏', ko: '구즈베리',  en: 'Gooseberry' },
      { id: 'pear',        icon: '🍐', ko: '배',        en: 'Pear' },
      { id: 'apple',       icon: '🍎', ko: '사과',      en: 'Apple' },
      { id: 'green_apple', icon: '🍏', ko: '풋사과',    en: 'Green Apple' },
    ],
  },
  {
    id: 'w_tropical',
    ko: '열대 과일',
    en: 'Tropical Fruits',
    items: [
      { id: 'peach',        icon: '🍑', ko: '복숭아',     en: 'Peach' },
      { id: 'melon',        icon: '🍈', ko: '멜론',       en: 'Melon' },
      { id: 'guava',        icon: '🍈', ko: '구아바',     en: 'Guava' },
      { id: 'pineapple',    icon: '🍍', ko: '파인애플',   en: 'Pineapple' },
      { id: 'passion_fruit',icon: '🌺', ko: '패션프루트', en: 'Passion Fruit' },
      { id: 'lychee',       icon: '🔴', ko: '리치',       en: 'Lychee' },
      { id: 'dried_apricot',icon: '🍑', ko: '살구건조',   en: 'Dried Apricot' },
      { id: 'orange_peel',  icon: '🟠', ko: '오렌지 필',  en: 'Orange Peel' },
      { id: 'banana',       icon: '🍌', ko: '바나나',     en: 'Banana' },
    ],
  },
  // ── FRUITY RED WINE ────────────────────────────────────────────
  {
    id: 'w_berries_stone',
    ko: '베리 & 핵과류',
    en: 'Berries & Stone Fruits',
    items: [
      { id: 'raspberry',   icon: '🫐', ko: '라즈베리',   en: 'Raspberry' },
      { id: 'blackcurrant',icon: '🫐', ko: '블랙커런트', en: 'Blackcurrant' },
      { id: 'strawberry',  icon: '🍓', ko: '딸기',       en: 'Strawberry' },
      { id: 'blackberry',  icon: '🫐', ko: '블랙베리',   en: 'Blackberry' },
      { id: 'cherry',      icon: '🍒', ko: '체리',       en: 'Cherry' },
      { id: 'plum',        icon: '🟣', ko: '자두',       en: 'Plum' },
      { id: 'prune',       icon: '🍇', ko: '프룬',       en: 'Prune' },
    ],
  },
  // ── FLORAL ─────────────────────────────────────────────────────
  {
    id: 'w_white_flowers',
    ko: '흰꽃',
    en: 'White Flowers',
    items: [
      { id: 'honeysuckle',    icon: '🌼', ko: '인동초',    en: 'Honeysuckle' },
      { id: 'hawthorn',       icon: '🌸', ko: '산사나무꽃', en: 'Hawthorn' },
      { id: 'orange_blossom', icon: '🌸', ko: '오렌지꽃',  en: 'Orange Blossom' },
      { id: 'linden',         icon: '🌼', ko: '린든꽃',    en: 'Linden' },
      { id: 'jasmine',        icon: '🌸', ko: '재스민',    en: 'Jasmine' },
      { id: 'acacia',         icon: '🌼', ko: '아카시아',  en: 'Acacia' },
    ],
  },
  {
    id: 'w_colored_flowers',
    ko: '색꽃',
    en: 'Colored Flowers',
    items: [
      { id: 'rose',     icon: '🌹', ko: '장미',   en: 'Rose' },
      { id: 'lavender', icon: '💜', ko: '라벤더', en: 'Lavender' },
      { id: 'violet',   icon: '🟣', ko: '제비꽃', en: 'Violet' },
    ],
  },
  // ── VEGETAL ────────────────────────────────────────────────────
  {
    id: 'w_vegetal_herbs',
    ko: '채소 & 허브',
    en: 'Vegetal & Herbs',
    items: [
      { id: 'capsicum',        icon: '🫑', ko: '피망',          en: 'Capsicum' },
      { id: 'fennel',          icon: '🌿', ko: '펜넬',          en: 'Fennel' },
      { id: 'tomato_leaf',     icon: '🍅', ko: '토마토잎',      en: 'Tomato Leaf' },
      { id: 'dill',            icon: '🌿', ko: '딜',            en: 'Dill' },
      { id: 'mint',            icon: '🌱', ko: '민트',          en: 'Mint' },
      { id: 'anise',           icon: '⭐', ko: '아니스',        en: 'Anise' },
      { id: 'fern',            icon: '🌿', ko: '양치식물',      en: 'Fern' },
      { id: 'tobacco',         icon: '🚬', ko: '담배',          en: 'Tobacco' },
      { id: 'blackcurrant_leaf',icon: '🍃', ko: '블랙커런트 잎', en: 'Blackcurrant Leaf' },
      { id: 'hay',             icon: '🌾', ko: '건초',          en: 'Hay' },
    ],
  },
  // ── MINERAL ────────────────────────────────────────────────────
  {
    id: 'w_mineral',
    ko: '미네랄',
    en: 'Mineral',
    items: [
      { id: 'iodine',    icon: '💉', ko: '요오드',  en: 'Iodine' },
      { id: 'flint',     icon: '🪨', ko: '부싯돌',  en: 'Flint' },
      { id: 'kerosene',  icon: '⛽', ko: '등유',    en: 'Kerosene' },
      { id: 'wet_stone', icon: '🪨', ko: '젖은 돌', en: 'Wet Stone' },
    ],
  },
  // ── MADERIZED / YEAST ──────────────────────────────────────────
  {
    id: 'w_yeast_butter',
    ko: '이스트 & 버터',
    en: 'Yeast & Butter',
    items: [
      { id: 'bread',   icon: '🥐', ko: '빵',     en: 'Bread' },
      { id: 'butter',  icon: '🧈', ko: '버터',   en: 'Butter' },
      { id: 'biscuit', icon: '🍪', ko: '비스킷', en: 'Biscuit' },
    ],
  },
  // ── TOASTED ────────────────────────────────────────────────────
  {
    id: 'w_toasted',
    ko: '구운향',
    en: 'Toasted',
    items: [
      { id: 'toast',     icon: '🍞', ko: '토스트', en: 'Toast' },
      { id: 'chocolate', icon: '🍫', ko: '초콜릿', en: 'Chocolate' },
      { id: 'coffee',    icon: '☕', ko: '커피',   en: 'Coffee' },
      { id: 'caramel',   icon: '🍮', ko: '카라멜', en: 'Caramel' },
    ],
  },
  // ── SPICES & NUTS ──────────────────────────────────────────────
  {
    id: 'w_spices_nuts',
    ko: '스파이스 & 너티',
    en: 'Spices & Nuts',
    items: [
      { id: 'vanilla',     icon: '🍦', ko: '바닐라',   en: 'Vanilla' },
      { id: 'cinnamon',    icon: '🌿', ko: '시나몬',   en: 'Cinnamon' },
      { id: 'black_pepper',icon: '🌶️', ko: '후추',     en: 'Black Pepper' },
      { id: 'liquorice',   icon: '🖤', ko: '감초',     en: 'Liquorice' },
      { id: 'nutmeg',      icon: '🟤', ko: '육두구',   en: 'Nutmeg' },
      { id: 'cloves',      icon: '🟤', ko: '정향',     en: 'Cloves' },
      { id: 'coconut',     icon: '🥥', ko: '코코넛',   en: 'Coconut' },
      { id: 'hazelnut',    icon: '🌰', ko: '헤이즐넛', en: 'Hazelnut' },
      { id: 'almond',      icon: '🌰', ko: '아몬드',   en: 'Almond' },
      { id: 'honey',       icon: '🍯', ko: '꿀',       en: 'Honey' },
    ],
  },
  // ── WOODS & ANIMAL ─────────────────────────────────────────────
  {
    id: 'w_woody_earthy',
    ko: '우디 & 어스',
    en: 'Woody & Earthy',
    items: [
      { id: 'oak',       icon: '🪵', ko: '오크',    en: 'Oak' },
      { id: 'sandalwood',icon: '🪵', ko: '샌달우드', en: 'Sandalwood' },
      { id: 'cedar',     icon: '🌲', ko: '시더',    en: 'Cedar' },
      { id: 'pine',      icon: '🌲', ko: '소나무',  en: 'Pine' },
      { id: 'mushroom',  icon: '🍄', ko: '버섯',    en: 'Mushroom' },
      { id: 'truffle',   icon: '🍄', ko: '트러플',  en: 'Truffle' },
      { id: 'leather',   icon: '🧳', ko: '가죽',    en: 'Leather' },
      { id: 'earth',     icon: '🌍', ko: '흙',      en: 'Earth' },
      { id: 'tree_moss', icon: '🌿', ko: '나무이끼', en: 'Tree Moss' },
    ],
  },
]

export const WINE_AROMA_MAP = new Map<string, import('./whiskyAromas').AromaItem>(
  WINE_AROMA_CATEGORIES.flatMap((c) => c.items).map((item) => [item.id, item]),
)
