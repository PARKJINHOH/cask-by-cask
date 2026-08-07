// @ts-check

/**
 * 로그인 사용자 경계가 바뀔 때 진행 중인 조회를 먼저 취소한 뒤 캐시에 남은 데이터를 비운다.
 * 특정 query key 목록에 의존하지 않아 새 개인정보 조회가 추가돼도 이전 사용자 데이터가
 * 다음 사용자 세션으로 넘어가지 않는다.
 *
 * [clear() 대신 resetQueries() 를 쓰는 이유]
 * clear() 는 캐시 엔트리 자체를 QueryCache 에서 제거한다. 이때 이미 화면에 마운트돼 있던
 * useQuery 옵저버는 삭제된 쿼리 객체를 계속 붙들고 있는 "고아" 상태가 되고, 그 쿼리는
 * QueryCache 목록에서 빠졌으므로 창 포커스 재조회에도 invalidateQueries 에도 걸리지 않는다.
 * 결과적으로 해당 화면은 브라우저를 새로고침하기 전까지 영영 데이터를 다시 불러오지 못한다.
 * (액세스 토큰 재발급이 실패하면 세션과 무관한 메인 화면 공개 데이터까지 통째로 비던 원인)
 *
 * resetQueries() 는 엔트리를 유지한 채 상태만 초기값으로 되돌리므로 이전 사용자 데이터가
 * 남지 않는 것은 clear() 와 같고, 마운트된 활성 쿼리는 곧바로 다시 채워진다.
 *
 * @param {Pick<import('@tanstack/react-query').QueryClient, 'cancelQueries' | 'resetQueries' | 'getMutationCache'>} client
 */
export async function clearSessionQueryCache(client) {
  try {
    await client.cancelQueries()
  } catch {
    // 취소 실패가 로그인·로그아웃을 중단해서는 안 된다. 아래 초기화는 항상 실행한다.
  } finally {
    // mutation 응답에도 이전 사용자 데이터가 남을 수 있어 함께 비운다.
    client.getMutationCache().clear()
    // 상태 초기화(데이터 비우기)는 동기로 끝난다. 뒤이어 자동으로 도는 활성 쿼리
    // 재조회까지 기다리면 로그인/로그아웃이 네트워크에 묶이므로 대기하지 않는다.
    void Promise.resolve(client.resetQueries()).catch(() => {})
  }
}
