export interface Distillery {
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

export interface CreateDistilleryPayload {
  nameKo: string
  nameEn: string
  country: string
  region?: string
  website?: string
  foundedYear?: number
  descriptionKo?: string
  descriptionEn?: string
}

export interface UpdateDistilleryPayload {
  nameKo?: string
  nameEn?: string
  country?: string
  region?: string | null
  website?: string | null
  foundedYear?: number | null
  descriptionKo?: string | null
  descriptionEn?: string | null
}
