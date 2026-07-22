export type BoardListType = 'all' | 'notice' | 'free' | 'byob' | 'notices'
export type MetadataSearchParams = Record<string, string | string[] | undefined>

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

/**
 * Next.js의 searchParams와 React Router의 URLSearchParams가 같은 색인 정책을
 * 사용하도록 브라우저 쿼리를 서버 메타데이터 형식으로 변환한다.
 */
export function metadataSearchParamsFromUrl(searchParams: URLSearchParams): MetadataSearchParams {
  const result: MetadataSearchParams = {}
  searchParams.forEach((value, key) => {
    if (result[key] === undefined) result[key] = value
  })
  return result
}

export function isBoardListNoindex(
  board: BoardListType,
  searchParams: MetadataSearchParams,
): boolean {
  const page = firstSearchParam(searchParams.page)
  if (page != null && page !== '' && page !== '0') return true

  if (board === 'notices') {
    return Boolean(firstSearchParam(searchParams.category))
  }
  if (board === 'byob') {
    const status = firstSearchParam(searchParams.status)
    return Boolean(status && status !== 'ALL')
  }

  const tab = firstSearchParam(searchParams.tab)
  const sort = firstSearchParam(searchParams.sort)
  if (tab && tab !== 'all') return true
  if (sort && sort !== 'LATEST') return true

  return ['keyword', 'prefix', 'authorId', 'commentAuthorId', 'authorNickname', 'distilleryTagId']
    .some((key) => Boolean(firstSearchParam(searchParams[key])))
}
