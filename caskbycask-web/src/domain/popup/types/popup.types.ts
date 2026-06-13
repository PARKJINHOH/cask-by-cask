export type PopupType = 'IMAGE' | 'HTML'
export type PopupLanguage = 'KO' | 'EN'
export type PopupDisplayPage = 'MAIN'
export type PopupImageType = 'MAIN' | 'CONTENT'

export interface PopupImageInfo {
  imageUrl: string
  originalFileName: string
}

export interface AdminPopupListItem {
  id: number
  adminTitle: string
  popupType: PopupType
  language: PopupLanguage
  isVisible: boolean
  sortOrder: number
  isAlwaysVisible: boolean
  startAt: string | null
  endAt: string | null
  displayPage: PopupDisplayPage
  createdAt: string
}

export interface AdminPopupDetail {
  id: number
  adminTitle: string
  popupType: PopupType
  language: PopupLanguage
  displayPage: PopupDisplayPage
  content: string | null
  contentSanitized: string | null
  linkUrl: string | null
  linkTargetBlank: boolean
  isVisible: boolean
  sortOrder: number
  closeOnOverlay: boolean
  isAlwaysVisible: boolean
  startAt: string | null
  endAt: string | null
  mainImage: PopupImageInfo | null
  createdAt: string
  updatedAt: string
}

export interface UploadedPopupImage {
  id: number
  imageUrl: string
  originalFileName: string
  fileSize: number
  mimeType: string
  imageType: PopupImageType
}

export interface CreatePopupPayload {
  adminTitle: string
  popupType: PopupType
  language: PopupLanguage
  displayPage?: PopupDisplayPage
  content?: string | null
  popupImageId?: number | null
  linkUrl?: string | null
  linkTargetBlank?: boolean
  isVisible: boolean
  sortOrder: number
  closeOnOverlay: boolean
  isAlwaysVisible: boolean
  startAt?: string | null
  endAt?: string | null
}

export interface UpdatePopupPayload {
  adminTitle?: string
  content?: string | null
  popupImageId?: number | null
  linkUrl?: string | null
  linkTargetBlank?: boolean
  isVisible?: boolean
  sortOrder?: number
  closeOnOverlay?: boolean
  isAlwaysVisible?: boolean
  startAt?: string | null
  endAt?: string | null
}

export interface PopupPreviewData {
  popupType: PopupType
  content?: string | null
  mainImageUrl?: string | null
  linkUrl?: string | null
  linkTargetBlank?: boolean
  closeOnOverlay?: boolean
}

// 사용자 공개 API 응답
export interface PopupResponse {
  id: number
  popupType: PopupType
  language: PopupLanguage
  contentSanitized: string | null
  mainImage: PopupImageInfo | null
  linkUrl: string | null
  linkTargetBlank: boolean | null
  closeOnOverlay: boolean
  sortOrder: number
}
