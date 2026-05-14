export interface Winery {
  id: number
  nameKo: string
  nameEn: string
  country: string
  region: string | null
  website: string | null
  foundedYear: number | null
  descriptionKo: string | null
  descriptionEn: string | null
}

export interface CreateWineryPayload {
  nameKo: string
  nameEn: string
  country: string
  region?: string
  website?: string
  foundedYear?: number
  descriptionKo?: string
  descriptionEn?: string
}

export interface UpdateWineryPayload {
  nameKo?: string
  nameEn?: string
  country?: string
  region?: string | null
  website?: string | null
  foundedYear?: number | null
  descriptionKo?: string | null
  descriptionEn?: string | null
}
