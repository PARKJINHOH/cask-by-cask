import { useQuery } from '@tanstack/react-query'
import { popupApi } from '../api/popupApi'
import { isPopupHiddenToday } from '@/shared/utils/popupStorage'
import type { PopupLanguage, PopupResponse } from '../types/popup.types'

export function usePopups(language: PopupLanguage) {
  const isHidden = isPopupHiddenToday()

  const query = useQuery({
    queryKey: ['popups', language],
    queryFn: () => popupApi.getPopups(language).then((r) => r.data.data ?? []),
    staleTime: 60_000,  // 60초 — 탭 복귀 시 관리자 변경사항 빠르게 반영
  })

  // API 호출은 항상 수행하되, 하루 안보기 설정 시 빈 배열 반환
  const data: PopupResponse[] = isHidden ? [] : (query.data ?? [])

  return { ...query, data }
}
