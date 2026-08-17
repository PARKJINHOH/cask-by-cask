export type BoardListType = 'all' | 'notice' | 'free' | 'byob' | 'photo' | 'notices'
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

/**
 * 0-based 페이지 번호를 목록 경로에 붙인다. 1페이지는 파라미터 없는 기본 주소를 유지한다.
 * <p>서버 metadata 와 SPA 가 같은 canonical 을 만들어야 하므로 양쪽이 이 함수를 함께 쓴다.
 */
export function buildListPageHref(basePath: string, page: number): string {
  if (page <= 0) return basePath
  return `${basePath}${basePath.includes('?') ? '&' : '?'}page=${page}`
}

/**
 * 지금 걸려 있는 쿼리는 유지한 채 page 만 바꾼 목록 주소.
 * <p>SPA 페이지네이션을 {@code <a href>} 로 그릴 때 쓴다. 라우터 basename 이 로케일을 담당하므로
 * {@code basePath} 에는 {@code /ko} 같은 접두어를 포함한 절대 경로를 넘겨야 한다 —
 * 앵커의 href 는 라우터를 거치지 않는다.
 */
export function listPageHrefWithParams(
  basePath: string,
  params: URLSearchParams,
  page: number,
): string {
  const next = new URLSearchParams(params)
  next.delete('page')
  if (page > 0) next.set('page', String(page))
  const query = next.toString()
  return query ? `${basePath}?${query}` : basePath
}

/** 목록 쿼리의 page 파라미터를 0-based 정수로 읽는다. 형식이 어긋나면 첫 페이지로 본다. */
export function readPageParam(searchParams: MetadataSearchParams): number {
  const raw = firstSearchParam(searchParams.page)
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) return 0
  return Math.min(Number(raw), 10_000)
}

/**
 * page 파라미터가 정식 facet 으로 인정되지 않는 형태인지.
 * <p>page 자체는 정식 facet 이다 — 뒤 페이지도 self-canonical 로 색인한다. noindex 로 두면
 * 그 페이지의 항목 링크를 따라가는 신호가 오래 유지되지 않아, 1페이지에서 밀려난 항목이
 * 사이트맵 말고는 유입 경로가 없는 고아가 된다.
 * <p>다만 형식이 어긋난 값과, 기본 주소와 내용이 같은 {@code page=0} 은 중복이라 제외한다.
 */
export function hasUnsupportedPageParam(searchParams: MetadataSearchParams): boolean {
  if (searchParams.page === undefined) return false
  const page = firstSearchParam(searchParams.page)
  return Array.isArray(searchParams.page) || page == null || !/^[1-9]\d*$/.test(page)
}

export function isBoardListNoindex(
  board: BoardListType,
  searchParams: MetadataSearchParams,
): boolean {
  if (hasUnsupportedPageParam(searchParams)) return true

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

  // 이미지 갤러리 전용 파라미터 세 가지도 함께 막는다.
  //   · spirit: 주류별 모아보기. 같은 내용을 주류 상세의 "이 술의 사진"이 이미 담당하므로
  //     1순위 색인 대상인 주류 상세로 신호를 모은다.
  //   · q: 갤러리의 검색어. 다른 게시판의 keyword 에 해당한다(같은 이름을 쓰지 않는다).
  //   · post: 사진 모달 딥링크. 열리는 내용은 /community/photo/{id} 가 정본으로 갖고 있다.
  return ['keyword', 'prefix', 'authorId', 'commentAuthorId', 'authorNickname',
    'distilleryTagId', 'spirit', 'q', 'post']
    .some((key) => Boolean(firstSearchParam(searchParams[key])))
}
