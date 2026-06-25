export type WishlistType = 'COLLECTION'

export interface WishlistSpiritInfo {
  id: number
  nameKo: string
  nameEn: string
  seriesIdentifier?: string | null
  category: string
  primaryImageUrl: string | null
  avgScore: number | null
}

export interface WishlistItem {
  id: number
  type: WishlistType
  spirit: WishlistSpiritInfo
}

export interface WishlistRequest {
  spiritId: number
  type: WishlistType
}
