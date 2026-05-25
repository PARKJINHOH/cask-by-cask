export type FaqLanguage = 'KO' | 'EN'
export type FaqCategory = 'SERVICE' | 'WHISKY' | 'COGNAC' | 'WINE'

export interface FaqItem {
  id: number
  question: string
  answer: string
  sortOrder: number
}

export interface FaqGroup {
  category: FaqCategory
  categoryLabel: string
  items: FaqItem[]
}

export interface AdminFaqListItem {
  id: number
  language: FaqLanguage
  category: FaqCategory
  categoryLabel: string
  question: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AdminFaqDetail {
  id: number
  language: FaqLanguage
  category: FaqCategory
  question: string
  answer: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateFaqPayload {
  language: FaqLanguage
  category: FaqCategory
  question: string
  answer: string
  sortOrder: number
  isActive: boolean
}

export interface UpdateFaqPayload {
  category: FaqCategory
  question: string
  answer: string
  sortOrder: number
  isActive: boolean
}
