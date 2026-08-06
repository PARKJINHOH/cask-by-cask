import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 실제 휴대폰 사진으로 EXIF 파서를 검증한다.
 *
 * 회귀 배경: `exifr` 의 lite 빌드에 `pick` 옵션을 넘기면 태그 사전이 없어
 * "undefined is not iterable" 로 파싱 전체가 조용히 실패했다(모든 값이 빈 칸으로 보였다).
 * 합성 파일로는 재현되지 않아 실물 사진을 표본으로 둔다.
 */
const SAMPLE_DIR = 'D:/workspace/easymediaProject/cask-by-cask/image'
const SAMPLES = [
  { file: '20260804_160542.jpg', label: '갤럭시', hasGps: false },
  { file: 'IMG_1164_1.JPG', label: '아이폰', hasGps: true },
]

const available = SAMPLES.filter((sample) => existsSync(join(SAMPLE_DIR, sample.file)))

const {
  formatAperture, formatCamera, formatFocalLength35, formatGps,
  formatIso, formatShutter, readPhotoExif,
} = await import('../src/domain/photo-card/utils/exifReader.ts')

const toFile = (name) => {
  const bytes = readFileSync(join(SAMPLE_DIR, name))
  return new File([bytes], name, { type: 'image/jpeg' })
}

describe('EXIF 표기 포맷', () => {
  test('조리개·셔터·ISO·35mm 환산', () => {
    assert.equal(formatAperture(1.7799999713880652), 'ƒ/1.8')
    assert.equal(formatAperture(1.4), 'ƒ/1.4')
    assert.equal(formatAperture(2), 'ƒ/2')
    assert.equal(formatShutter(0.0083337), '1/120s')
    assert.equal(formatIso(320), 'ISO 320')
    assert.equal(formatFocalLength35(23), '23mm')
  })

  test('GPS 는 방위 기호를 붙여 표기한다', () => {
    assert.equal(formatGps(37.40058055555556, 126.94312222222223), '37.4006°N 126.9431°E')
    assert.equal(formatGps(-33.8688, -151.2093), '33.8688°S 151.2093°W')
    assert.equal(formatGps(null, 126.9), '')
    assert.equal(formatGps(37.4, null), '')
  })

  test('좌표 0 도 유효한 값이다', () => {
    assert.equal(formatGps(0, 0), '0.0000°N 0.0000°E')
  })

  test('제조사가 모델명에 이미 들어 있으면 중복을 뺀다', () => {
    assert.equal(formatCamera({ cameraMake: 'Apple', cameraModel: 'iPhone 16 Pro' }),
      'Apple iPhone 16 Pro')
    assert.equal(formatCamera({ cameraMake: 'SONY', cameraModel: 'SONY α7C II' }), 'SONY α7C II')
  })
})

describe('실물 사진 EXIF 읽기', { skip: available.length === 0 ? '표본 사진 없음' : false }, () => {
  for (const sample of available) {
    test(`${sample.label} — 카메라·노출·촬영일을 읽는다`, async () => {
      const exif = await readPhotoExif(toFile(sample.file))
      assert.ok(exif.cameraMake, '제조사를 못 읽었다')
      assert.ok(exif.cameraModel, '모델명을 못 읽었다')
      assert.ok(exif.aperture && exif.aperture > 0, '조리개를 못 읽었다')
      assert.ok(exif.shutterSpeed && exif.shutterSpeed > 0, '셔터를 못 읽었다')
      assert.ok(exif.iso && exif.iso > 0, 'ISO 를 못 읽었다')
      assert.ok(exif.focalLength35 && exif.focalLength35 > 0, '35mm 환산을 못 읽었다')
      assert.ok(exif.shotAt instanceof Date, '촬영일을 못 읽었다')
    })

    test(`${sample.label} — GPS ${sample.hasGps ? '있음' : '없음'}`, async () => {
      const exif = await readPhotoExif(toFile(sample.file))
      if (sample.hasGps) {
        assert.equal(typeof exif.latitude, 'number')
        assert.equal(typeof exif.longitude, 'number')
        assert.ok(formatGps(exif.latitude, exif.longitude).length > 0)
      } else {
        assert.equal(exif.latitude, null)
        assert.equal(exif.longitude, null)
      }
    })
  }

  test('EXIF 가 없는 이미지도 빈 값으로 돌아온다 (편집은 계속돼야 한다)', async () => {
    const blank = new File([Uint8Array.from([0xff, 0xd8, 0xff, 0xd9])], 'x.jpg', { type: 'image/jpeg' })
    const exif = await readPhotoExif(blank)
    assert.equal(exif.cameraModel, null)
    assert.equal(exif.latitude, null)
    assert.equal(exif.shotAt, null)
  })
})
