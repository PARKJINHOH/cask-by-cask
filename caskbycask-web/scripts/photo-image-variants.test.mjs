import { describe, test } from 'node:test'
import assert from 'node:assert/strict'

const {
  VARIANT_WIDTHS, BASE_VARIANT_WIDTH, photoVariantUrl, photoSrcSet, photoSrc,
} = await import('../src/domain/photo-gallery/utils/photoImageVariants.ts')
const { toReturnPath } =
  await import('../src/domain/auth/hooks/useRequireLogin.ts')

const BASE = '/api/posts/images/2f1c9d3a-7b41-4a55-9c2e-0d7f6b5a1e88.webp'

describe('갤러리 반응형 이미지 소스', () => {
  test('백엔드가 만드는 폭과 같아야 한다 (PostImageService.VARIANT_WIDTHS)', () => {
    // 여기를 바꾸면 서버도 같이 바꿔야 한다 — 없는 파일을 요청하게 된다.
    assert.deepEqual([...VARIANT_WIDTHS], [640, 1280])
  })

  test('변형본 주소는 확장자 앞에 _w{폭} 을 붙인다', () => {
    assert.equal(
      photoVariantUrl(BASE, 640),
      '/api/posts/images/2f1c9d3a-7b41-4a55-9c2e-0d7f6b5a1e88_w640.webp',
    )
    assert.equal(
      photoVariantUrl(BASE, 1280),
      '/api/posts/images/2f1c9d3a-7b41-4a55-9c2e-0d7f6b5a1e88_w1280.webp',
    )
  })

  test('srcset 은 축소본 + 본 이미지를 폭 기술자와 함께 늘어놓는다', () => {
    assert.equal(
      photoSrcSet(BASE),
      `${photoVariantUrl(BASE, 640)} 640w, ${photoVariantUrl(BASE, 1280)} 1280w, ${BASE} ${BASE_VARIANT_WIDTH}w`,
    )
  })

  test('WebP 가 아니면 srcset 을 만들지 않는다 (변형본이 존재하지 않는다)', () => {
    // WebP 변환이 실패해 원본이 서빙되는 이미지 — 없는 _w640.jpg 를 요청하면 안 된다.
    assert.equal(photoSrcSet('/api/posts/images/abc.jpg'), undefined)
    assert.equal(photoSrcSet('/api/posts/images/abc.png'), undefined)
    assert.equal(photoSrcSet('/api/posts/images/abc.gif'), undefined)
  })

  test('주소가 없으면 undefined 다', () => {
    assert.equal(photoSrcSet(null), undefined)
    assert.equal(photoSrcSet(undefined), undefined)
    assert.equal(photoSrcSet(''), undefined)
  })

  test('photoSrc 는 변형본이 가능할 때만 폭을 붙인다', () => {
    assert.equal(photoSrc(BASE, 640), photoVariantUrl(BASE, 640))
    assert.equal(photoSrc('/api/posts/images/abc.jpg', 640), '/api/posts/images/abc.jpg')
  })

  test('확장자 대문자도 WebP 로 본다', () => {
    assert.equal(photoSrc('/api/posts/images/abc.WEBP', 640), '/api/posts/images/abc_w640.webp')
  })
})

describe('로그인 복귀 경로 정규화', () => {
  test('search·hash 까지 살린다 (갤러리 ?post= 모달이 그대로 열려야 한다)', () => {
    assert.equal(
      toReturnPath({ pathname: '/community/photo', search: '?post=123', hash: '' }),
      '/community/photo?post=123',
    )
    assert.equal(
      toReturnPath({ pathname: '/spirits/1', search: '', hash: '#reviews' }),
      '/spirits/1#reviews',
    )
    assert.equal(toReturnPath({ pathname: '/community/photo' }), '/community/photo')
  })

  test('전체 경로가 pathname 하나에 담겨 와도 그대로 통과한다 (SignupPage 릴레이)', () => {
    assert.equal(
      toReturnPath({ pathname: '/community/photo?post=123' }),
      '/community/photo?post=123',
    )
  })

  test('외부 주소로는 절대 보내지 않는다', () => {
    assert.equal(toReturnPath({ pathname: '//evil.example.com' }), '/')
    assert.equal(toReturnPath({ pathname: '/\\evil.example.com' }), '/')
    assert.equal(toReturnPath({ pathname: 'https://evil.example.com' }), '/')
    assert.equal(toReturnPath({ pathname: 'community/photo' }), '/')
  })

  test('로그인·가입·OAuth 로는 되돌리지 않는다 (무한 루프 방지)', () => {
    assert.equal(toReturnPath({ pathname: '/login' }), '/')
    assert.equal(toReturnPath({ pathname: '/signup' }), '/')
    assert.equal(toReturnPath({ pathname: '/oauth/callback' }), '/')
    assert.equal(toReturnPath({ pathname: '/login', search: '?next=1' }), '/')
    // 접두사만 같은 다른 경로는 막지 않는다.
    assert.equal(toReturnPath({ pathname: '/loginhelp' }), '/loginhelp')
  })

  test('값이 없거나 형태가 어긋나면 홈으로 떨어진다', () => {
    assert.equal(toReturnPath(null), '/')
    assert.equal(toReturnPath(undefined), '/')
    assert.equal(toReturnPath('/community/photo'), '/')
    assert.equal(toReturnPath({}), '/')
    assert.equal(toReturnPath({ pathname: 123 }), '/')
  })
})
