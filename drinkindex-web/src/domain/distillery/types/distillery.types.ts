export interface Distillery {
  id: number
  nameKo: string
  nameEn: string
  country: string
  region: string | null
  website: string | null
}

export interface CreateDistilleryPayload {
  nameKo: string
  nameEn: string
  country: string
  region?: string
  website?: string
}

export interface UpdateDistilleryPayload {
  nameKo?: string
  nameEn?: string
  country?: string
  region?: string | null
  website?: string | null
}
