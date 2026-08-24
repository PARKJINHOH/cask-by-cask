import { test } from 'node:test'
import assert from 'node:assert/strict'

const { getSpiritShareUrl, getSpiritCanonicalPath } = await import(
  '@/domain/spirit/utils/spiritUrl'
)

test('한국어 공유 URL 은 slug 없이 ID 경로만 만든다', () => {
  assert.equal(
    getSpiritShareUrl(231, 'ko'),
    'https://www.caskbycask.net/ko/spirits/231',
  )
})

test('영문 공유 URL 은 en 로케일을 유지한다', () => {
  assert.equal(
    getSpiritShareUrl(231, 'en'),
    'https://www.caskbycask.net/en/spirits/231',
  )
})

test('지원하지 않는 언어값은 ko 로 폴백한다', () => {
  assert.equal(
    getSpiritShareUrl(231, 'ja'),
    'https://www.caskbycask.net/ko/spirits/231',
  )
})

// canonical 경로를 그대로 복사하던 과거 동작으로 되돌아가지 않도록 고정한다.
// 한글 slug 는 percent-encoding 되면서 231자까지 늘어났다.
test('공유 URL 에는 slug 도 percent-encoding 도 남지 않는다', () => {
  const shareUrl = getSpiritShareUrl(231, 'ko')
  assert.doesNotMatch(shareUrl, /%/)
  assert.match(shareUrl, /\/spirits\/231$/)
  assert.ok(shareUrl.length < 50, `공유 URL 이 너무 길다: ${shareUrl.length}자`)
})

// 화면에 거는 링크는 SEO 를 위해 slug 를 유지해야 한다 — 두 함수의 역할이 섞이지 않게 확인한다.
test('표시용 canonical 경로는 slug 를 그대로 유지한다', () => {
  const spirit = {
    id: 231,
    canonicalPathKo: '/ko/spirits/231-와일드-터키-16년',
    canonicalPathEn: '/en/spirits/231-wild-turkey-16yo',
  }
  assert.equal(
    getSpiritCanonicalPath(spirit, 'ko', { includeLocale: true }),
    '/ko/spirits/231-와일드-터키-16년',
  )
})
