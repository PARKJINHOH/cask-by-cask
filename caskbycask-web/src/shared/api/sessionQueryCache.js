// @ts-check

/**
 * 로그인 사용자 경계가 바뀔 때 진행 중인 조회를 먼저 취소한 뒤 전체 캐시를 비운다.
 * 특정 query key 목록에 의존하지 않아 새 개인정보 조회가 추가돼도 이전 사용자 데이터가
 * 다음 사용자 세션으로 넘어가지 않는다.
 *
 * @param {Pick<import('@tanstack/react-query').QueryClient, 'cancelQueries' | 'clear'>} client
 */
export async function clearSessionQueryCache(client) {
  try {
    await client.cancelQueries()
  } catch {
    // 취소 실패가 로그인·로그아웃을 중단해서는 안 된다. 아래 clear는 항상 실행한다.
  } finally {
    client.clear()
  }
}
