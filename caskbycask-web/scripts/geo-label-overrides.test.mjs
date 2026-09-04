// 동해·독도 라벨 오버라이드 회귀 방지.
//
// 이 기능이 래스터 대신 벡터 타일을 쓰는 <b>유일한 이유</b>가 이것이다 — 래스터는 라벨이
// PNG 에 구워져 있어 어떤 방법으로도 못 고친다. 그래서 오버라이드가 조용히 빠지면
// 기술 선택의 근거 자체가 사라진다.
//
// 브라우저 없이 검사한다: 차단 목록·GeoJSON·로케일 전환은 전부 데이터이고,
// 실제 렌더 확인은 수동 시나리오(줌 4~6 육안 확인)가 맡는다.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8')

const overrides = read('src/domain/venue/map/geoLabelOverrides.ts')
const geojson = JSON.parse(read('public/map/geo-overrides.json'))

function feature(id) {
  return geojson.features.find((f) => f.properties.id === id)
}

describe('동해·독도 라벨 오버라이드', () => {
  test('basemap 차단 목록에 알려진 표기 변형이 모두 있다', () => {
    // 벤더·언어에 따라 표기가 갈린다. 하나라도 빠지면 그 조합에서만 원래 라벨이 남는다.
    for (const name of ['Sea of Japan', 'Japan Sea', '日本海', 'Liancourt Rocks', 'Takeshima', '竹島']) {
      assert.ok(overrides.includes(`'${name}'`), `차단 목록에 ${name} 이(가) 없다`)
    }
  })

  test('동해·독도 피처가 ko/en 이름을 모두 갖는다', () => {
    for (const id of ['east-sea', 'dokdo']) {
      const found = feature(id)
      assert.ok(found, `${id} 피처가 없다`)
      assert.equal(typeof found.properties.nameKo, 'string')
      assert.equal(typeof found.properties.nameEn, 'string')
      assert.ok(found.properties.nameKo.length > 0, `${id} 의 한국어 이름이 비었다`)
      assert.ok(found.properties.nameEn.length > 0, `${id} 의 영문 이름이 비었다`)
    }
  })

  test('한국어·영문 표기가 의도한 값이다', () => {
    assert.equal(feature('east-sea').properties.nameKo, '동해')
    assert.equal(feature('east-sea').properties.nameEn, 'East Sea')
    assert.equal(feature('dokdo').properties.nameKo, '독도')
    assert.equal(feature('dokdo').properties.nameEn, 'Dokdo')
  })

  test('좌표가 유효 범위 안이고 실제 위치에 가깝다', () => {
    for (const f of geojson.features) {
      const [lng, lat] = f.geometry.coordinates
      assert.ok(lat >= -90 && lat <= 90, `${f.properties.id} 위도가 범위 밖`)
      assert.ok(lng >= -180 && lng <= 180, `${f.properties.id} 경도가 범위 밖`)
    }
    // 독도는 실측 좌표에 붙어 있어야 한다 — 라벨만 맞고 위치가 엉뚱하면 더 나쁘다.
    const [dokdoLng, dokdoLat] = feature('dokdo').geometry.coordinates
    assert.ok(Math.abs(dokdoLat - 37.2416) < 0.05, '독도 위도가 실제와 다르다')
    assert.ok(Math.abs(dokdoLng - 131.8663) < 0.05, '독도 경도가 실제와 다르다')
  })

  test('로케일에 따라 라벨 필드를 바꾸는 경로가 있다', () => {
    assert.match(overrides, /nameEn.*:.*nameKo|lang === 'en' \? 'nameEn' : 'nameKo'/)
    assert.match(overrides, /export function updateGeoLabelLanguage/,
      '로케일 전환 시 지도를 다시 만들지 않고 텍스트만 갈아 끼우는 함수가 없다')
  })

  test('basemap 라벨도 로케일 우선 필드를 쓴다', () => {
    assert.match(overrides, /export function localizeBasemapLabels/)
    assert.match(overrides, /'name:ko'/, '한국어 지명 우선 처리가 없다')
  })

  test('매칭 실패가 지도를 깨뜨리지 않는다', () => {
    // 벤더를 바꾸면 source-layer 이름이 달라진다. 그때 예외를 던지면 지도가 통째로 안 뜬다.
    assert.match(overrides, /console\.warn/, '실패 시 경고만 남기는 경로가 없다')
    assert.match(overrides, /catch/, 'try/catch 방어가 없다')
  })

  test('타일 벤더를 바꿀 때 손봐야 한다는 사실이 주석에 남아 있다', () => {
    // 이 주석이 사라지면 Protomaps 로 스왑한 뒤 라벨이 조용히 원상복구된다.
    assert.match(overrides, /Protomaps/, '벤더 스왑 시 주의사항 주석이 없다')
  })
})
