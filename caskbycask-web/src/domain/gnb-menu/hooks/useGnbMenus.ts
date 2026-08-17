import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gnbMenuApi } from '../api/gnbMenuApi'
import type { AdminGnbMenuItem } from '../types/gnbMenu.types'

const KEYS = {
  hidden: () => ['gnbMenus', 'hidden'] as const,
  adminList: () => ['gnbMenus', 'admin'] as const,
}

/** SSR 이 심어 준 시드. 없으면 undefined 를 돌려 React Query 가 평소대로 로딩하게 둔다. */
function hiddenSeed(): string[] | undefined {
  if (typeof window === 'undefined') return undefined
  return Array.isArray(window.__GNB_HIDDEN__) ? window.__GNB_HIDDEN__ : undefined
}

// ── 공개 ──────────────────────────────────────────────────────

/**
 * 숨김 처리된 GNB 메뉴 키.
 *
 * 실패하면 빈 배열 = 전 메뉴 노출로 떨어진다. GNB 가 통째로 사라지는 것보다 안전하고,
 * 그래서 재시도로 렌더를 붙잡지 않는다(retry: false — useBanners 와 동일).
 */
export function useGnbHiddenKeys() {
  return useQuery({
    queryKey: KEYS.hidden(),
    queryFn: () => gnbMenuApi.getHiddenKeys().then((r) => r.data.data ?? []),
    initialData: hiddenSeed(),
    staleTime: 60_000, // 60초 — SSR 시드의 revalidate 와 맞춰 두 경로가 어긋나는 창을 줄인다
    retry: false,
  })
}

// ── 관리자 ────────────────────────────────────────────────────

export function useAdminGnbMenus() {
  return useQuery({
    queryKey: KEYS.adminList(),
    queryFn: () =>
      gnbMenuApi.getAdminMenus().then((r) => (r.data.data ?? []) as AdminGnbMenuItem[]),
  })
}

export function useUpdateGnbMenuVisibility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ menuKey, isVisible }: { menuKey: string; isVisible: boolean }) =>
      gnbMenuApi.updateVisibility(menuKey, isVisible),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.adminList() })
      // 관리자가 같은 브라우저에서 사용자 화면으로 넘어갔을 때 바로 반영되도록 공개 캐시도 비운다.
      qc.invalidateQueries({ queryKey: KEYS.hidden() })
    },
  })
}
