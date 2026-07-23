export type WishlistType = 'COLLECTION'

export interface WishlistSpiritInfo {
  id: number
  nameKo: string
  nameEn: string
  seriesIdentifier?: string | null
  category: string
  vintageYear?: number | null
  vintageStatus?: 'VINTAGE' | 'NON_VINTAGE' | 'UNKNOWN' | null
  primaryImageUrl: string | null
  canonicalPathKo?: string | null
  canonicalPathEn?: string | null
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
