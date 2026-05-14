export interface CognacAppellation {
  id: number
  nameKo: string
  nameEn: string
  descriptionKo: string | null
  descriptionEn: string | null
}

export interface CreateCognacAppellationPayload {
  nameKo: string
  nameEn: string
  descriptionKo?: string
  descriptionEn?: string
}

export interface UpdateCognacAppellationPayload {
  nameKo?: string
  nameEn?: string
  descriptionKo?: string | null
  descriptionEn?: string | null
}
