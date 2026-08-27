import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'
import type {
  ContentTranslation,
  TranslationLanguage,
  TranslationResourceType,
} from '../types/translation.types'

export const translationApi = {
  translate: async (
    resourceType: TranslationResourceType,
    resourceId: number,
    targetLanguage: TranslationLanguage,
  ): Promise<ContentTranslation> => {
    const response = await axiosInstance.post<ApiResponse<ContentTranslation>>('/api/translations', {
      resourceType,
      resourceId,
      targetLanguage,
    })
    if (!response.data.data) throw new Error('Translation response is empty.')
    return response.data.data
  },
}
