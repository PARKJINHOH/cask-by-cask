import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'
import type { AdminGnbMenuItem } from '../types/gnbMenu.types'

export const gnbMenuApi = {
  // ── 공개 ──
  getHiddenKeys: () =>
    axiosInstance.get<ApiResponse<string[]>>('/api/gnb-menus/hidden'),

  // ── 관리자 ──
  getAdminMenus: () =>
    axiosInstance.get<ApiResponse<AdminGnbMenuItem[]>>('/api/admin/gnb-menus'),

  updateVisibility: (menuKey: string, isVisible: boolean) =>
    axiosInstance.patch<ApiResponse<null>>(
      `/api/admin/gnb-menus/${encodeURIComponent(menuKey)}/visibility`,
      { isVisible },
    ),
}
