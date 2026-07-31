// ─────────────────────────────────────────────────────────────
// 관리자 메뉴 단일 소스 (SINGLE SOURCE OF TRUTH)
//
// 좌측 사이드바(AdminLayout)와 회원별 메뉴 접근 권한 체크리스트(AdminUserDetailPage)가
// 모두 이 정의를 사용한다. 메뉴를 추가하면 사이드바와 권한 체크리스트에 자동 반영된다.
//
// 메뉴 키 = 라우트 `path` 문자열. (별도 enum 없음 → 메뉴 추가 시 백엔드 변경 불필요)
// ─────────────────────────────────────────────────────────────

export interface AdminNavItem {
  path: string
  label: string
  exact?: boolean
}

export type AdminNavEntry =
  | { type: 'item'; path: string; label: string; icon: string; exact?: boolean }
  | { type: 'group'; groupLabel: string; groupIcon: string; items: AdminNavItem[] }

/** 회원 메뉴 그룹 라벨 — "전체 선택" 시 제외되는 민감 그룹 */
export const MEMBER_GROUP_LABEL = '회원'

export const ADMIN_NAV: AdminNavEntry[] = [
  {
    type: 'item',
    path: '/admin',
    label: '대시보드',
    icon: '📊',
    exact: true,
  },
  {
    type: 'group',
    groupLabel: '관리',
    groupIcon: '⚙️',
    items: [
      { path: '/admin/notices',  label: '공지사항' },
      { path: '/admin/banners',  label: '배너',     exact: true },
      { path: '/admin/events',   label: '이벤트 달력', exact: true },
      { path: '/admin/popups',   label: '팝업',     exact: true },
      { path: '/admin/legal',    label: '약관 관리', exact: true },
      { path: '/admin/faq',      label: 'FAQ 관리',  exact: true },
    ],
  },
  {
    type: 'group',
    groupLabel: MEMBER_GROUP_LABEL,
    groupIcon: '👥',
    items: [
      { path: '/admin/users',           label: '회원 관리', exact: true },
      { path: '/admin/users/nickname-bad-words', label: '닉네임 금지 단어', exact: true },
      { path: '/admin/logs',            label: '변경 이력', exact: true },
      { path: '/admin/reports',         label: '신고 관리' },
      { path: '/admin/inquiries',       label: '문의 관리', exact: true },
      { path: '/admin/emails/send',     label: '메일 발송', exact: true },
      { path: '/admin/emails/history',  label: '메일 이력', exact: true },
    ],
  },
  {
    type: 'group',
    groupLabel: '주류',
    groupIcon: '🥃',
    items: [
      { path: '/admin/spirits/requests', label: '주류 등록 요청' },
      { path: '/admin/spirits/variant-requests', label: '하위 에디션/리뷰 승인', exact: true },
      { path: '/admin/spirits',          label: '주류 관리', exact: true },
      // 테이스팅 트리는 위스키 전용이 아니라 전 카테고리(위스키·와인·꼬냑) 공통이다.
      { path: '/admin/taste-trees',      label: '주류 트리', exact: true },
    ],
  },
  {
    type: 'group',
    groupLabel: '제조사',
    groupIcon: '🏭',
    items: [
      { path: '/admin/producers/requests', label: '생산자 등록 요청', exact: true },
      { path: '/admin/producers',          label: '생산자 관리',      exact: true },
    ],
  },
  {
    type: 'group',
    groupLabel: '가격 트래커',
    groupIcon: '💰',
    items: [
      { path: '/admin/price-reports', label: '가격 등록 승인', exact: true },
      // 크롤러 수집 + 관리자 직접 등록 가격을 함께 다루므로 '핫딜' 대신 '가격 동향'.
      { path: '/admin/deals',         label: '가격 동향',      exact: true },
    ],
  },
  {
    type: 'group',
    groupLabel: '점수·레벨',
    groupIcon: '🏅',
    items: [
      { path: '/admin/score/points', label: '점수 설정', exact: true },
      { path: '/admin/score/levels', label: '레벨 설정', exact: true },
    ],
  },
  {
    type: 'group',
    groupLabel: '커뮤니티',
    groupIcon: '💬',
    items: [
      { path: '/admin/community/ai-news',      label: '소식(AI)', exact: true },
      { path: '/admin/social',                 label: 'SNS 게시 관리', exact: true },
      { path: '/admin/community/post-reports', label: '게시글·댓글 신고' },
      { path: '/admin/community/bad-words',    label: '욕설 필터' },
      { path: '/admin/community/emojis',       label: '이모지 관리', exact: true },
      { path: '/admin/community/prefixes',     label: '말머리 관리', exact: true },
    ],
  },
]

/** 그룹에 속한 모든 메뉴 그룹 목록 (체크리스트 생성용) */
export const ADMIN_MENU_GROUPS = ADMIN_NAV.filter(
  (e): e is Extract<AdminNavEntry, { type: 'group' }> => e.type === 'group',
)

/** 권한 부여 가능한 모든 메뉴 path (그룹 내 아이템 전체). 대시보드 등 최상위 단독 메뉴는 제외(관리자 전용). */
export function allGrantableMenuPaths(): string[] {
  return ADMIN_MENU_GROUPS.flatMap((g) => g.items.map((i) => i.path))
}

/** "전체 선택" 대상 메뉴 path — 회원 그룹 제외 */
export function selectAllMenuPaths(): string[] {
  return ADMIN_MENU_GROUPS
    .filter((g) => g.groupLabel !== MEMBER_GROUP_LABEL)
    .flatMap((g) => g.items.map((i) => i.path))
}

/**
 * 메뉴 노출 여부. 관리자(ADMIN/SUPER_ADMIN)는 전체 노출, 그 외 역할은 허용 메뉴(path)만 노출.
 */
export function isMenuVisible(path: string, isAdmin: boolean, allowedMenus: string[]): boolean {
  if (isAdmin) return true
  return allowedMenus.includes(path)
}
