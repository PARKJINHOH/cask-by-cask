export interface CognacHouse {
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

export interface CreateCognacHousePayload {
  nameKo: string
  nameEn: string
  country: string
  region?: string
  website?: string
  foundedYear?: number
  descriptionKo?: string
  descriptionEn?: string
}

export interface UpdateCognacHousePayload {
  nameKo?: string
  nameEn?: string
  country?: string
  region?: string | null
  website?: string | null
  foundedYear?: number | null
  descriptionKo?: string | null
  descriptionEn?: string | null
}
