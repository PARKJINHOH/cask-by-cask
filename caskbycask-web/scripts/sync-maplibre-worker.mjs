#!/usr/bin/env node
/**
 * MapLibre 워커 자체 호스팅 동기화.
 *
 * 왜 필요한가 — maplibre-gl 6 은 ESM 전용이고, 워커를
 * `new Worker(new URL('./maplibre-gl-worker.mjs', import.meta.url), { type: 'module' })`
 * 로 만든다. Next 번들러는 그 워커 파일을 산출물에 내보내지 않아서 URL 이 dev 서버의
 * HTML 404 로 떨어지고, 브라우저가 "non-JavaScript MIME type text/html" 로 거부한다.
 * 그러면 지도 캔버스는 만들어지고 스타일·스프라이트까지 받아 놓고도
 * <b>타일만 영원히 안 그려진다</b>(실제로 이 증상을 겪고 이 스크립트를 만들었다).
 *
 * 해결 — 워커를 public/ 에 두고 maplibregl.setWorkerUrl() 로 가리킨다.
 * 워커는 같은 폴더의 maplibre-gl-shared.mjs 를 상대 경로로 import 하므로 둘을 함께 복사한다.
 *
 * 경로에 버전을 넣는 이유는 Pretendard 자체 호스팅과 같다 — 버전 교체 = URL 교체라
 * 장기 캐시를 걸어도 안전하고, 아래 테스트가 설치 버전과 커밋된 사본의 어긋남을 잡는다.
 *
 * 사용법: npm run map:sync-worker  (maplibre-gl 을 올린 뒤 반드시 실행)
 */
import { createRequire } from 'node:module'
import { copyFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

/** 워커가 상대 경로로 import 하므로 두 파일이 같은 폴더에 있어야 한다. */
const WORKER_FILES = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']

export const MAPLIBRE_PUBLIC_DIR = join(projectRoot, 'public', 'maplibre')

export function installedMaplibreVersion() {
  return require('maplibre-gl/package.json').version
}

export function syncedMaplibreVersions() {
  if (!existsSync(MAPLIBRE_PUBLIC_DIR)) return []
  return readdirSync(MAPLIBRE_PUBLIC_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
}

function main() {
  const version = installedMaplibreVersion()
  const distDir = dirname(require.resolve('maplibre-gl/package.json')) + '/dist'
  const targetDir = join(MAPLIBRE_PUBLIC_DIR, version)

  // 예전 버전 사본은 지운다 — 남겨 두면 어느 것이 실제로 쓰이는지 알 수 없다.
  if (existsSync(MAPLIBRE_PUBLIC_DIR)) {
    for (const stale of syncedMaplibreVersions()) {
      if (stale !== version) rmSync(join(MAPLIBRE_PUBLIC_DIR, stale), { recursive: true, force: true })
    }
  }

  mkdirSync(targetDir, { recursive: true })
  for (const file of WORKER_FILES) {
    copyFileSync(join(distDir, file), join(targetDir, file))
  }

  console.log(`maplibre-gl ${version} 워커를 public/maplibre/${version}/ 로 복사했습니다.`)
  console.log(`  ${WORKER_FILES.join(', ')}`)
  console.log(`  → src/domain/venue/config/mapTiles.ts 의 MAPLIBRE_VERSION 이 ${version} 인지 확인하세요.`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
