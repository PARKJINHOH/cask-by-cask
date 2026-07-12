export type TierListItemType = 'SPIRIT' | 'PRODUCER' | 'CUSTOM'

export interface TierListRow {
  id: number | null
  rowKey: string
  label: string
  color: string
  sortOrder: number
}

export interface TierListItem {
  id: number | null
  rowKey: string | null
  itemType: TierListItemType
  spiritId: number | null
  producerId: number | null
  displayName: string
  imageUrl: string | null
  sortOrder: number
  spiritVariantLabel: string | null
  spiritVariantLabelEn: string | null
  spiritCanonicalPathKo: string | null
  spiritCanonicalPathEn: string | null
}

export interface TierList {
  id: number
  title: string
  description: string | null
  shareKey: string
  ownerNickname: string
  owner: boolean
  rows: TierListRow[]
  items: TierListItem[]
  createdAt: string
  updatedAt: string
}

export interface TierListSummary {
  id: number
  title: string
  description: string | null
  shareKey: string
  itemCount: number
  updatedAt: string
}

export interface TierListSavePayload {
  title: string
  description?: string | null
  rows: Array<{
    rowKey: string
    label: string
    color: string
    sortOrder: number
  }>
  items: Array<{
    rowKey: string | null
    itemType: TierListItemType
    spiritId?: number | null
    producerId?: number | null
    displayName: string
    imageUrl?: string | null
    sortOrder: number
  }>
}

export interface TierListImageUpload {
  id: number
  imageUrl: string
  savedFileName: string
  mimeType: string
}

export interface TierListGuestDraft {
  token: string | null
  expiresAt: string
  content: TierListGuestDraftPayload
}

export interface TierListGuestDraftPayload extends Omit<TierListSavePayload, 'items'> {
  items: Array<TierListSavePayload['items'][number] & {
    spiritVariantLabel?: string | null
    spiritVariantLabelEn?: string | null
    spiritCanonicalPathKo?: string | null
    spiritCanonicalPathEn?: string | null
  }>
}
