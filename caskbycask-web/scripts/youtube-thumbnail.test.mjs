import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const {
  fallbackThumbnail,
  gridThumbnail,
  handleThumbnailError,
  handleThumbnailLoad,
} = await import('@/domain/youtube/utils/youtubeThumbnail')

const HERE = dirname(fileURLToPath(import.meta.url))
const COMPONENT_DIR = join(HERE, '..', 'src', 'domain', 'youtube', 'components')

const image = ({ src, naturalWidth, naturalHeight }) => ({
  src,
  naturalWidth,
  naturalHeight,
})

describe('YouTube 썸네일 폴백', () => {
  test('120×90 Not Found 이미지는 hqdefault 로 교체한다', () => {
    const videoKey = 'missing-maxres'
    const target = image({
      src: gridThumbnail(videoKey),
      naturalWidth: 120,
      naturalHeight: 90,
    })

    handleThumbnailLoad(target, videoKey)

    assert.equal(target.src, fallbackThumbnail(videoKey))
  })

  test('정상 maxresdefault 이미지는 유지한다', () => {
    const videoKey = 'has-maxres'
    const src = gridThumbnail(videoKey)
    const target = image({ src, naturalWidth: 1280, naturalHeight: 720 })

    handleThumbnailLoad(target, videoKey)

    assert.equal(target.src, src)
  })

  test('이미 hqdefault 로 폴백한 이미지는 다시 바꾸지 않는다', () => {
    const videoKey = 'already-fallback'
    const src = fallbackThumbnail(videoKey)
    const target = image({ src, naturalWidth: 120, naturalHeight: 90 })

    handleThumbnailLoad(target, videoKey)

    assert.equal(target.src, src)
  })

  test('네트워크·디코딩 오류도 hqdefault 로 교체한다', () => {
    const videoKey = 'load-error'
    const target = image({
      src: gridThumbnail(videoKey),
      naturalWidth: 0,
      naturalHeight: 0,
    })

    handleThumbnailError(target, videoKey)

    assert.equal(target.src, fallbackThumbnail(videoKey))
  })

  test('모든 maxresdefault 사용처가 error 와 load 폴백을 함께 연결한다', () => {
    for (const file of ['YoutubeGrid.tsx', 'YoutubeVideoRail.tsx', 'YoutubeEmbed.tsx']) {
      const source = readFileSync(join(COMPONENT_DIR, file), 'utf8')
      assert.match(source, /onError=\{\(event\) => handleThumbnailError\(/, `${file}: onError 누락`)
      assert.match(source, /onLoad=\{\(event\) => handleThumbnailLoad\(/, `${file}: onLoad 누락`)
    }
  })
})
