export interface ApiResponse<T> {
  success: boolean
  data: T | null
  code: string | null
  message: string | null
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
  empty: boolean
}
