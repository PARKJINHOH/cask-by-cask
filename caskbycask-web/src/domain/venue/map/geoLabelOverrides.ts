import type { Map as MapLibreMap } from 'maplibre-gl'

/**
 * 지도 라벨 오버라이드 — 동해·독도.
 *
 * <p>이 기능이 벡터 타일을 쓰는 이유가 여기에 있다. 래스터 타일은 라벨이 PNG 에 구워져 있어
 * 어떤 방법으로도 덮어쓸 수 없다. 벡터 타일이라야 basemap 의 라벨 레이어에 필터를 걸어
 * 특정 이름을 지우고, 그 자리에 우리 라벨을 얹을 수 있다.
 *
 * <p><b>한계를 분명히 해 둔다</b> — 이것은 <i>라벨</i> 오버라이드다. 벤더 스타일이 경계선을
 * 다르게 그리면 라벨로는 고칠 수 없다. 경계까지 통제하려면 우리가 추출한 데이터로 만든
 * 자체 호스팅 타일(Protomaps .pmtiles)이 필요하고, 그래서 타일 소스를 스왑 가능하게 뒀다.
 */

/** basemap 에서 지울 이름들. 표기가 벤더·언어별로 갈려서 알려진 변형을 모두 적는다. */
export const BLOCKED_LABEL_NAMES = [
  'Sea of Japan',
  'Japan Sea',
  '日本海',
  'Mar del Japón',
  'Mer du Japon',
  'Liancourt Rocks',
  'Takeshima',
  '竹島',
  'Dokdo/Takeshima',
] as const

/** 라벨이 사는 source-layer. OpenMapTiles 스키마 기준(OpenFreeMap Liberty 가 이 스키마다). */
const LABEL_SOURCE_LAYERS = ['water_name', 'place']

/**
 * 스키마가 달라 매칭이 안 될 때를 대비한 레이어 id 폴백.
 * Protomaps 자체 basemap 으로 스왑하면 source-layer 이름이 달라지므로 이 목록도 손봐야 한다.
 */
const FALLBACK_LAYER_IDS = [
  'water_name_line',
  'water_name_point',
  'place_other',
  'place_island',
]

const SOURCE_ID = 'cbc-geo-labels'
const SEA_LAYER_ID = 'cbc-geo-label-sea'
const ISLAND_LAYER_ID = 'cbc-geo-label-island'
const ISLAND_DOT_LAYER_ID = 'cbc-geo-label-island-dot'

/** 로케일에 맞는 라벨 필드를 고르는 표현식. */
function textField(lang: string) {
  return ['get', lang === 'en' ? 'nameEn' : 'nameKo'] as unknown as never
}

/**
 * basemap 의 충돌 라벨을 숨긴다.
 *
 * <p>레이어 id 를 하드코딩하지 않고 source-layer + 속성으로 찾는다 — 스타일이 바뀌어도
 * 웬만하면 계속 동작하고, 못 찾으면 조용히 넘어간다. <b>지도를 깨뜨리지 않는 것이 우선</b>이다.
 */
function suppressConflictingLabels(map: MapLibreMap) {
  let matched = 0
  const blocked = [...BLOCKED_LABEL_NAMES]

  for (const layer of map.getStyle().layers ?? []) {
    if (layer.type !== 'symbol') continue
    const sourceLayer = (layer as { 'source-layer'?: string })['source-layer']
    const isTarget =
      (sourceLayer && LABEL_SOURCE_LAYERS.includes(sourceLayer)) ||
      FALLBACK_LAYER_IDS.includes(layer.id)
    if (!isTarget) continue

    try {
      const existing = map.getFilter(layer.id)
      // 영문·기본 이름 어느 쪽으로 들어와도 걸리도록 coalesce 로 본다.
      const exclusion = [
        '!',
        ['in', ['coalesce', ['get', 'name:en'], ['get', 'name'], ''], ['literal', blocked]],
      ]
      map.setFilter(layer.id, (existing ? ['all', existing, exclusion] : exclusion) as never)
      matched += 1
    } catch {
      // 표현식을 못 받는 레이어가 섞일 수 있다. 한 레이어 실패로 전체를 포기하지 않는다.
    }
  }

  if (matched === 0) {
    // eslint-disable-next-line no-console
    console.warn(
      '[geoLabelOverrides] basemap 라벨 레이어를 찾지 못했습니다. ' +
        '타일 벤더를 바꿨다면 LABEL_SOURCE_LAYERS 를 갱신하세요.',
    )
  }
}

/**
 * 동해·독도 라벨을 얹는다. 지도 style 로드 이후에 한 번 호출한다.
 *
 * <p>실패해도 예외를 밖으로 던지지 않는다 — 라벨이 없는 지도는 아쉬운 정도지만,
 * 여기서 던지면 지도 자체가 안 뜬다.
 */
export async function applyGeoLabelOverrides(map: MapLibreMap, lang: string): Promise<void> {
  try {
    if (map.getSource(SOURCE_ID)) {
      updateGeoLabelLanguage(map, lang)
      return
    }

    suppressConflictingLabels(map)

    const data = await fetch('/map/geo-overrides.json').then((r) => r.json())
    // fetch 를 기다리는 사이에 지도가 사라졌을 수 있다.
    if (!map.getStyle()) return

    map.addSource(SOURCE_ID, { type: 'geojson', data })

    // 섬은 저줌에서 점 하나로도 보이게 — 라벨만 뜨고 실체가 없으면 이상해 보인다.
    map.addLayer({
      id: ISLAND_DOT_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['==', ['get', 'kind'], 'island'],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, 2, 10, 4],
        'circle-color': '#8a8f98',
        'circle-stroke-width': 0.5,
        'circle-stroke-color': '#ffffff',
      },
    })

    map.addLayer({
      id: SEA_LAYER_ID,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['==', ['get', 'kind'], 'sea'],
      minzoom: 3,
      maxzoom: 7.5,
      layout: {
        'text-field': textField(lang),
        'text-size': ['interpolate', ['linear'], ['zoom'], 3, 11, 7, 15],
        'text-letter-spacing': 0.25,
        'text-transform': 'none',
        'text-allow-overlap': false,
      },
      paint: {
        'text-color': '#4a6f8a',
        'text-halo-color': 'rgba(255,255,255,0.85)',
        'text-halo-width': 1.2,
      },
    })

    map.addLayer({
      id: ISLAND_LAYER_ID,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['==', ['get', 'kind'], 'island'],
      minzoom: 5,
      layout: {
        'text-field': textField(lang),
        'text-size': ['interpolate', ['linear'], ['zoom'], 5, 10, 12, 14],
        'text-offset': [0, 0.9],
        'text-anchor': 'top',
      },
      paint: {
        'text-color': '#3d4450',
        'text-halo-color': 'rgba(255,255,255,0.9)',
        'text-halo-width': 1.4,
      },
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[geoLabelOverrides] 라벨 오버라이드를 적용하지 못했습니다.', error)
  }
}

/** 로케일이 바뀌면 라벨 텍스트만 갈아 끼운다 — 지도를 다시 만들지 않는다. */
export function updateGeoLabelLanguage(map: MapLibreMap, lang: string): void {
  for (const layerId of [SEA_LAYER_ID, ISLAND_LAYER_ID]) {
    if (map.getLayer(layerId)) {
      try {
        map.setLayoutProperty(layerId, 'text-field', textField(lang))
      } catch {
        // 스타일 전환 중이면 무시한다.
      }
    }
  }
}

/**
 * basemap 라벨도 한국어를 우선하게 만든다.
 *
 * <p>동해·독도 처리의 덤이다 — 같은 순회에서 name:ko 우선으로 돌려두면
 * 한국어 화면에서 지명이 현지어·영어로만 나오는 어색함이 함께 사라진다.
 */
export function localizeBasemapLabels(map: MapLibreMap, lang: string): void {
  const preferred = lang === 'en' ? 'name:en' : 'name:ko'
  for (const layer of map.getStyle()?.layers ?? []) {
    if (layer.type !== 'symbol') continue
    if (layer.id.startsWith('cbc-')) continue
    const layout = (layer as { layout?: { 'text-field'?: unknown } }).layout
    if (!layout || layout['text-field'] === undefined) continue
    try {
      map.setLayoutProperty(layer.id, 'text-field', [
        'coalesce',
        ['get', preferred],
        ['get', 'name:latin'],
        ['get', 'name'],
      ] as never)
    } catch {
      // 라벨이 없는 심볼 레이어(아이콘 전용)는 건너뛴다.
    }
  }
}
