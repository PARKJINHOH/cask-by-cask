import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (...parts) => readFileSync(join(ROOT, ...parts), 'utf8')

describe('기존 생산자 산지 → 주류 폼 연결', () => {
  test('생산자 응답 타입과 선택 핸들러가 regionCode 를 전달하고 미매핑 시 null 로 덮어쓴다', () => {
    const types = read('src', 'domain', 'producer', 'types', 'producer.types.ts')
    const form = read('src', 'domain', 'admin', 'components', 'SpiritFormFields.tsx')

    assert.match(types, /regionCode:\s*string\s*\|\s*null/)
    assert.match(form, /setRegionCode\(producer\.regionCode\s*\?\?\s*null\)/)
  })

  test('국가는 전체 폭 첫 줄, 산지는 다음 줄이며 L1/L2 만 PC 2열을 사용한다', () => {
    const countryRegion = read('src', 'domain', 'location', 'components', 'CountryRegionSelector.tsx')
    const wineRegion = read('src', 'domain', 'location', 'components', 'WineRegionSelector.tsx')

    assert.match(countryRegion, /grid grid-cols-1 gap-3 w-full min-w-0/)
    assert.match(wineRegion, /subRegions\.length > 0 \? 'md:grid-cols-2'/)
    assert.doesNotMatch(countryRegion, /<div className="flex gap-2">/)
  })

  test('미매핑 안내 문구는 ko/en 양쪽 번역에 존재한다', () => {
    const ko = JSON.parse(read('src', 'locales', 'ko.json'))
    const en = JSON.parse(read('src', 'locales', 'en.json'))

    assert.ok(ko.location.wineRegion.legacyUnmapped)
    assert.ok(en.location.wineRegion.legacyUnmapped)
  })
})
