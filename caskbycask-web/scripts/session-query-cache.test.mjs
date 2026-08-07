import assert from 'node:assert/strict'
import test from 'node:test'
import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { clearSessionQueryCache } from '../src/shared/api/sessionQueryCache.js'

/** 마이크로태스크 + 타이머가 한 바퀴 돌 때까지 양보한다. */
const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

test('진행 중인 query 취소가 끝난 뒤 캐시를 초기화한다', async () => {
  const calls = []
  let finishCancellation
  const cancellation = new Promise((resolve) => {
    finishCancellation = resolve
  })

  const reset = clearSessionQueryCache({
    async cancelQueries() {
      calls.push('cancel:start')
      await cancellation
      calls.push('cancel:end')
    },
    resetQueries() {
      calls.push('reset')
    },
    getMutationCache: () => ({ clear: () => calls.push('mutations') }),
  })

  await Promise.resolve()
  assert.deepEqual(calls, ['cancel:start'])

  finishCancellation()
  await reset
  assert.deepEqual(calls, ['cancel:start', 'cancel:end', 'mutations', 'reset'])
})

test('query 취소가 실패해도 사용자 캐시는 반드시 비운다', async () => {
  let didReset = false

  await clearSessionQueryCache({
    async cancelQueries() {
      throw new Error('cancel failed')
    },
    resetQueries() {
      didReset = true
    },
    getMutationCache: () => ({ clear() {} }),
  })

  assert.equal(didReset, true)
})

test('이전 사용자 데이터는 캐시에 남지 않는다', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['me'], { nickname: '이전사용자' })

  await clearSessionQueryCache(client)

  assert.equal(client.getQueryData(['me']), undefined)
  client.clear()
})

// 회귀: clear() 로 캐시 엔트리를 통째로 지우면 이미 마운트된 옵저버가 삭제된 쿼리를 붙들어
// 고아가 되고, 그 화면은 브라우저 새로고침 전까지 데이터를 다시 불러오지 못했다.
test('화면에 떠 있는 조회는 초기화 후 스스로 다시 채워진다', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  let fetchCount = 0
  const observer = new QueryObserver(client, {
    queryKey: ['home', 'recent'],
    queryFn: async () => {
      fetchCount += 1
      return `fetch-${fetchCount}`
    },
    staleTime: 60_000,
  })
  const unsubscribe = observer.subscribe(() => {})

  await tick()
  assert.equal(fetchCount, 1)
  assert.equal(observer.getCurrentResult().data, 'fetch-1')

  await clearSessionQueryCache(client)
  await tick()

  assert.equal(fetchCount, 2, '초기화 후 활성 쿼리가 다시 요청되어야 한다')
  assert.equal(observer.getCurrentResult().data, 'fetch-2')

  unsubscribe()
  client.clear()
})
