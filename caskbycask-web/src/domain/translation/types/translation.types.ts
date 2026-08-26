export type TranslationResourceType = 'SPIRIT_NOTES' | 'REVIEW'
export type TranslationLanguage = 'ko' | 'en'

export interface ContentTranslation {
  resourceType: TranslationResourceType
  resourceId: number
  targetLanguage: TranslationLanguage
  fields: Record<string, string>
}
