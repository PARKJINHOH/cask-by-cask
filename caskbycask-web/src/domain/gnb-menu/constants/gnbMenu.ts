// ─────────────────────────────────────────────────────────────
// 사용자 GNB 메뉴 단일 소스 (SINGLE SOURCE OF TRUTH)
//
// MainLayout 의 GNB 와 관리자 노출 설정 화면(AdminGnbMenuPage)이 모두 이 정의를 쓴다.
// 메뉴를 추가하면 GNB 와 관리자 체크리스트에 자동 반영된다.
//
// ⚠️ `key` 는 DB(`gnb_menu_settings.menu_key`)에 그대로 저장되는 값이다.
//    키를 바꾸면 이미 저장된 노출 설정이 끊겨 숨겨 둔 메뉴가 되살아난다.
//    라벨(번역키)이나 경로는 자유롭게 바꿔도 되지만 key 는 건드리지 말 것.
//    회귀 방지: `npm run test:gnb-menu`
//
// 노출 여부는 DB 가 소유하되 "행이 없으면 노출"이 기본값이다 → 새 메뉴는 마이그레이션 없이 바로 보인다.
// ─────────────────────────────────────────────────────────────

export type GnbChild = {
  key: string
  labelKey: string
  to: string
  comingSoon?: boolean
}

export type GnbItem =
  | { key: string; labelKey: string; to: string; variant?: 'cta'; badge?: 'notice' }
  | { key: string; labelKey: string; children: GnbChild[] }

export const GNB_MENUS: GnbItem[] = [
  // 주류 탐색은 서비스의 핵심 진입점이라 알약형 CTA 로 강조한다.
  { key: 'spirits', labelKey: 'nav.spirits', to: '/spirits', variant: 'cta' },
  {
    key: 'request',
    labelKey: 'menu.request',
    children: [
      { key: 'requestSpirit',   labelKey: 'menu.requestSpirit',   to: '/request/spirit' },
      { key: 'requestProducer', labelKey: 'menu.requestProducer', to: '/request/producer' },
      { key: 'requestFeedback', labelKey: 'menu.requestFeedback', to: '/request/feedback' },
    ],
  },
  // 미확인 공지가 있으면 빨간 점을 붙인다.
  { key: 'notice', labelKey: 'menu.notice', to: '/notices', badge: 'notice' },
  {
    key: 'community',
    labelKey: 'menu.community',
    children: [
      { key: 'communityAll',   labelKey: 'menu.communityAll',   to: '/community/all' },
      { key: 'communityNews',  labelKey: 'menu.communityNews',  to: '/community/notice' },
      { key: 'communityBoard', labelKey: 'menu.communityBoard', to: '/community/free' },
      { key: 'communityByob',  labelKey: 'menu.communityByob',  to: '/community/byob' },
      { key: 'communityPhoto', labelKey: 'photoGallery.title',  to: '/community/photo' },
      { key: 'youtubeGallery', labelKey: 'youtube.title',       to: '/youtube' },
      // 포토카드 편집기는 갤러리 목록 안의 버튼으로만 갈 수 있었다 —
      // 만들러 들어온 사람이 목록을 한 번 거쳐야 해서 GNB 에도 바로 연다.
      { key: 'photoCard',      labelKey: 'photoGallery.createCta', to: '/photo-card' },
    ],
  },
  {
    key: 'tasteExplorer',
    labelKey: 'menu.tasteExplorer',
    children: [
      { key: 'tierList',  labelKey: 'menu.tierList',  to: '/tier-lists' },
      { key: 'tasteTree', labelKey: 'menu.tasteTree', to: '/taste-trees' },
    ],
  },
]

export function isGnbGroup(menu: GnbItem): menu is Extract<GnbItem, { children: GnbChild[] }> {
  return 'children' in menu
}

/** 관리 대상 전체 키(부모 + 자식). 관리자 화면과 회귀 테스트가 쓴다. */
export const GNB_MENU_KEYS: string[] = GNB_MENUS.flatMap((menu) =>
  isGnbGroup(menu) ? [menu.key, ...menu.children.map((child) => child.key)] : [menu.key],
)

/**
 * 숨김 키를 걷어낸 메뉴 트리.
 *
 * - 부모가 숨김이면 하위까지 통째로 사라진다.
 * - 자식이 전부 숨겨진 그룹은 그룹 버튼도 사라진다 — 안 그러면 눌러도 빈 드롭다운만 열린다.
 */
export function filterVisibleGnbMenus(menus: GnbItem[], hiddenKeys: Set<string>): GnbItem[] {
  if (hiddenKeys.size === 0) return menus

  return menus.reduce<GnbItem[]>((visible, menu) => {
    if (hiddenKeys.has(menu.key)) return visible

    if (!isGnbGroup(menu)) {
      visible.push(menu)
      return visible
    }

    const children = menu.children.filter((child) => !hiddenKeys.has(child.key))
    if (children.length > 0) visible.push({ ...menu, children })
    return visible
  }, [])
}
