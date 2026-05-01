export interface ApiResponse<T> {
  success: boolean
  data: T | null
  code: string | null
  message: string | null
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  first: boolean
  last: boolean
  empty: boolean
}
