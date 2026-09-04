import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  MAPLIBRE_PUBLIC_DIR,
  installedMaplibreVersion,
  syncedMaplibreVersions,
} from './sync-maplibre-worker.mjs'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const mapTilesSource = readFileSync(
  join(projectRoot, 'src/domain/venue/config/mapTiles.ts'),
  'utf8',
)

function declaredVersion() {
  const match = mapTilesSource.match(/MAPLIBRE_VERSION\s*=\s*'([^']+)'/)
  return match?.[1] ?? null
}

/**
 * MapLibre 워커 자체 호스팅이 설치 버전과 어긋나지 않는지 지킨다.
 *
 * 어긋나면 조용히 망가진다 — 지도 캔버스도 뜨고 스타일·스프라이트도 받아지는데
 * 타일만 안 그려진다. 콘솔에는 "non-JavaScript MIME type" 한 줄뿐이라
 * 원인을 찾는 데 오래 걸린다. 그래서 사람이 알아채기 전에 여기서 막는다.
 */
describe('MapLibre 워커 자체 호스팅', () => {
  test('설치된 maplibre-gl 버전의 워커가 public/ 에 복사되어 있다', () => {
    const installed = installedMaplibreVersion()
    const synced = syncedMaplibreVersions()

    assert.ok(
      synced.includes(installed),
      `maplibre-gl ${installed} 의 워커 사본이 없습니다 (현재: ${synced.join(', ') || '없음'}).\n` +
        '  → npm run map:sync-worker 를 실행하세요.',
    )
  })

  test('mapTiles.ts 의 MAPLIBRE_VERSION 이 설치 버전과 같다', () => {
    const installed = installedMaplibreVersion()
    assert.equal(
      declaredVersion(),
      installed,
      `mapTiles.ts 의 MAPLIBRE_VERSION 을 ${installed} 로 맞추세요.`,
    )
  })

  test('워커와 공유 청크가 같은 폴더에 함께 있다', () => {
    // 워커는 ./maplibre-gl-shared.mjs 를 상대 경로로 import 한다 —
    // 하나만 복사하면 워커가 뜨자마자 죽는다.
    const dir = join(MAPLIBRE_PUBLIC_DIR, installedMaplibreVersion())
    for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
      assert.ok(existsSync(join(dir, file)), `${file} 이(가) 없습니다: ${dir}`)
    }
  })

  test('오래된 버전 사본이 남아 있지 않다', () => {
    const synced = syncedMaplibreVersions()
    assert.deepEqual(
      synced,
      [installedMaplibreVersion()],
      '이전 버전 사본이 남아 있습니다. npm run map:sync-worker 가 정리합니다.',
    )
  })

  test('워커 URL 이 버전 경로를 쓴다 — 버전 교체가 곧 URL 교체가 되도록', () => {
    assert.match(
      mapTilesSource,
      /MAP_WORKER_URL\s*=\s*`\/maplibre\/\$\{MAPLIBRE_VERSION\}\/maplibre-gl-worker\.mjs`/,
    )
  })
})
