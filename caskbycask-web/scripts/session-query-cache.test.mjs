import assert from 'node:assert/strict'
import test from 'node:test'
import { clearSessionQueryCache } from '../src/shared/api/sessionQueryCache.js'

test('진행 중인 query 취소가 끝난 뒤 전체 캐시를 비운다', async () => {
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
    clear() {
      calls.push('clear')
    },
  })

  await Promise.resolve()
  assert.deepEqual(calls, ['cancel:start'])

  finishCancellation()
  await reset
  assert.deepEqual(calls, ['cancel:start', 'cancel:end', 'clear'])
})

test('query 취소가 실패해도 사용자 캐시는 반드시 비운다', async () => {
  let cleared = false

  await clearSessionQueryCache({
    async cancelQueries() {
      throw new Error('cancel failed')
    },
    clear() {
      cleared = true
    },
  })

  assert.equal(cleared, true)
})
