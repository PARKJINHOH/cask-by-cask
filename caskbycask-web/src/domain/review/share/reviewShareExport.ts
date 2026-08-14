/**
 * html-to-image의 cacheBust는 리소스 URL 뒤에 타임스탬프 쿼리를 붙인다.
 * blob/data URL은 쿼리가 붙으면 원본 리소스를 찾을 수 없으므로 캐시 무효화 대상에서 제외한다.
 */
export const shouldCacheBustReviewExport = (imageUrl: string): boolean =>
  !/^(?:blob:|data:)/i.test(imageUrl)
