import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse, PageResponse } from '@/shared/types/common.types'
import type { Producer, ProducerType } from '../types/producer.types'

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
  // 폼 필드로는 삭제를 표현할 수 없다.
  uploadLogo: (id: number, file: File) => {
    const form = new FormData()
    form.append('image', file)
    return axiosInstance.post<ApiResponse<Producer>>(`/api/admin/producers/${id}/logo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data.data)
  },

  deleteLogo: (id: number) =>
    axiosInstance.delete<ApiResponse<Producer>>(`/api/admin/producers/${id}/logo`)
      .then((r) => r.data.data),
}
