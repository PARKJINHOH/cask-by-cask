import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type { Producer, ProducerLogoImage, ProducerType } from '../types/producer.types'

export const producerApi = {
  search: (
    params: {
      keyword?: string
      country?: string
      type?: ProducerType
      page?: number
      size?: number
      /** 로고가 등록된 생산자만 — 포토카드에서 로고를 고를 때 쓴다. */
      hasLogo?: boolean
    },
    // 자동완성처럼 글자마다 부르는 곳에서 이전 요청을 끊는다.
    signal?: AbortSignal,
  ) => axiosInstance.get<ApiResponse<PageResponse<Producer>>>('/api/producers', { params, signal }),

  findById: (id: number) =>
    axiosInstance.get<ApiResponse<Producer>>(`/api/producers/${id}`),

  // 로고는 생산자 저장(PUT)과 분리한다 — UpdateProducerRequest 가 "null = 변경 안 함" 규약이라
  // 폼 필드로는 목록 편집(추가·삭제·순서변경)을 표현할 수 없다.
  // 최대 5장 — 응답은 항상 갱신된 전체 목록이다(그 자리에서 그리드를 다시 그리면 된다).
  uploadLogo: (id: number, file: File) => {
    const form = new FormData()
    form.append('image', file)
    return axiosInstance.post<ApiResponse<ProducerLogoImage[]>>(`/api/admin/producers/${id}/logos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.data ?? [])
  },

  deleteLogo: (id: number, logoId: number) =>
    axiosInstance.delete<ApiResponse<ProducerLogoImage[]>>(`/api/admin/producers/${id}/logos/${logoId}`)
      .then((r) => r.data.data ?? []),

  reorderLogos: (id: number, orderedLogoIds: number[]) =>
    axiosInstance.post<ApiResponse<ProducerLogoImage[]>>(`/api/admin/producers/${id}/logos/reorder`, {
      ids: orderedLogoIds,
    }).then((r) => r.data.data ?? []),
}
