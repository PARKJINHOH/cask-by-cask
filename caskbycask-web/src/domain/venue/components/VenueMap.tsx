'use client'

import { useEffect, useRef, useState } from 'react'
import type { Map as MapLibreMap, Marker as MapLibreMarker, MapGeoJSONFeature } from 'maplibre-gl'
// 이 파일은 항상 lazy() 로만 진입하므로 스타일도 그 청크에 함께 실린다.
// maplibre-gl 본체는 window 를 만지므로 여기서 정적 import 하면 안 된다 — 아래에서 동적으로 받는다.
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  CLUSTER_OPTIONS,
  MAP_ATTRIBUTION,
  MAP_STYLE_URL,
  MAP_WORKER_URL,
} from '@/domain/venue/config/mapTiles'
import {
  applyGeoLabelOverrides,
  localizeBasemapLabels,
  updateGeoLabelLanguage,
} from '@/domain/venue/map/geoLabelOverrides'
import { registerPinIcons } from '@/domain/venue/map/pinIcons'

export interface LatLng {
  lat: number
  lng: number
}

export interface VenueMarker {
  id: number
  lat: number
  lng: number
  name: string
}

interface Props {
  center: [number, number]
  zoom: number
  /** 표시할 마커. 좌표가 없는 장소는 호출부에서 미리 걸러 보낸다. */
  markers?: VenueMarker[]
  selectedId?: number | null
  onSelectVenue?: (id: number) => void
  /**
   * 최대 줌에서도 안 풀리는 클러스터를 눌렀을 때. 같은 건물 2·3층에 여러 바가 있으면
   * 좌표가 사실상 같아 아무리 확대해도 분리되지 않는다 — 그때 목록으로 해소한다.
   */
  onClusterVenues?: (ids: number[]) => void
  /**
   * 핀 찍기 모드 — 지도를 클릭하면 그 자리에 드래그 가능한 핀이 서고 좌표를 올려보낸다.
   * 관리자 등록 폼에서 쓴다. 공유 링크 해석이 전부 실패해도 이 경로는 항상 살아 있어야 한다.
   */
  pickMode?: boolean
  pickedPoint?: LatLng | null
  onPick?: (point: LatLng) => void
  /**
   * 패널에 가리지 않게 하는 여백 — 지도의 "중심"을 실제로 보이는 영역 기준으로 옮긴다.
   * 이게 없으면 클릭한 마커가 패널 뒤로 숨어 "눌러도 반응이 없다"로 체감된다.
   */
  padding?: { left?: number; bottom?: number }
  /** 라벨 로케일. 바뀌면 지도를 다시 만들지 않고 텍스트만 갈아 끼운다. */
  lang?: string
  className?: string
  /** WebGL 을 못 쓰는 환경. 부모가 목록 전용 모드로 떨어뜨리라는 신호다. */
  onUnsupported?: () => void
  /** 타일을 못 받아옴. 지도만 죽고 나머지 화면은 살아 있어야 한다. */
  onTileError?: () => void
}

const SOURCE_ID = 'cbc-venues'
const CLUSTER_LAYER = 'cbc-venue-clusters'
const CLUSTER_COUNT_LAYER = 'cbc-venue-cluster-count'
const POINT_LAYER = 'cbc-venue-points'
const POINT_LABEL_LAYER = 'cbc-venue-point-labels'

/**
 * WebGL2 지원 여부.
 *
 * <p>MapLibre 5 부터 WebGL2 가 필수이고 {@code maplibregl.supported()} 는 제거됐다.
 * 구형 기기·GPU 블록리스트·{@code --disable-gpu} 환경이 실제로 있으므로 직접 확인한다 —
 * 확인 없이 생성하면 지도 자리가 아니라 페이지가 통째로 백지가 된다.
 */
export function isWebgl2Supported(): boolean {
  if (typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    return !!canvas.getContext('webgl2')
  } catch {
    return false
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function toFeatureCollection(markers: VenueMarker[]) {
  return {
    type: 'FeatureCollection' as const,
    features: markers.map((m) => ({
      type: 'Feature' as const,
      id: m.id,
      properties: { venueId: m.id, name: m.name },
      geometry: { type: 'Point' as const, coordinates: [m.lng, m.lat] },
    })),
  }
}

/** 선택된 핀만 크고 진한 아이콘으로 바꾼다. 색만으로 종류를 나누지는 않는다(색각 이상 대응). */
function selectedIconExpression(selectedId: number | null) {
  return ['case', ['==', ['get', 'venueId'], selectedId ?? -1], 'cbc-pin-selected', 'cbc-pin']
}

/**
 * MapLibre 캔버스.
 *
 * <p>maplibre-gl 은 import 시점에 {@code window} 를 만지고 번들이 200KB 를 넘으므로
 * <b>반드시 동적 import</b> 한다. 이 컴포넌트 자체도 호출부에서 {@code lazy()} 로 감싸
 * 지도를 안 쓰는 라우트의 번들에 새지 않게 한다.
 *
 * <p>마커는 DOM Marker 가 아니라 GeoJSON 소스 + circle/symbol 레이어로 그린다 —
 * 200 개를 넘어가면 DOM 마커는 모바일에서 눈에 띄게 끊긴다. 클러스터링도 소스 옵션이라
 * supercluster 를 따로 들일 필요가 없다.
 *
 * <p><b>마커는 종류를 색으로 구분하지 않는다.</b> 색만으로 정보를 인코딩하면 색각 이상에서
 * 읽히지 않고, 종류는 어차피 필터 칩·목록·패널이 글자로 전달한다. 지도는 "어디에 몇 개"만 맡는다.
 */
export default function VenueMap({
  center,
  zoom,
  markers,
  selectedId = null,
  onSelectVenue,
  onClusterVenues,
  pickMode = false,
  pickedPoint = null,
  onPick,
  padding,
  lang = 'ko',
  className,
  onUnsupported,
  onTileError,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markerRef = useRef<MapLibreMarker | null>(null)
  const [ready, setReady] = useState(false)

  // 콜백을 ref 에 담아 두는 이유: 부모가 인라인 함수를 넘기면 매 렌더마다 새 참조가 되어
  // 지도 생성 effect 가 다시 돌고, 그때마다 WebGL 컨텍스트가 하나씩 샌다.
  const cb = useRef({ onPick, onUnsupported, onTileError, onSelectVenue, onClusterVenues })
  useEffect(() => {
    cb.current = { onPick, onUnsupported, onTileError, onSelectVenue, onClusterVenues }
  })

  // ── 지도 생성 (마운트당 한 번) ──────────────────────────
  useEffect(() => {
    const node = containerRef.current
    if (!node) return

    if (!isWebgl2Supported()) {
      cb.current.onUnsupported?.()
      return
    }

    let alive = true
    let map: MapLibreMap | null = null

    import('maplibre-gl')
      .then((maplibre) => {
        if (!alive || !containerRef.current) return

        // Map 을 만들기 전에 지정해야 한다 — 워커 풀은 첫 지도 생성 시 한 번만 만들어진다.
        // 이게 없으면 번들러가 못 내보낸 워커 URL 로 요청이 나가 타일이 끝내 그려지지 않는다.
        maplibre.setWorkerUrl(MAP_WORKER_URL)

        map = new maplibre.Map({
          container: containerRef.current,
          style: MAP_STYLE_URL,
          center,
          zoom,
          attributionControl: { compact: true, customAttribution: MAP_ATTRIBUTION },
          // 키보드로는 지도를 다룰 수 없다 — 접근 가능한 등가물은 부모가 그리는 목록이다.
          keyboard: false,
        })
        mapRef.current = map

        map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right')

        map.on('load', () => {
          if (!alive || !mapRef.current) return
          registerPinIcons(mapRef.current)
          localizeBasemapLabels(mapRef.current, lang)
          void applyGeoLabelOverrides(mapRef.current, lang)
          setReady(true)
        })

        // 타일·스타일 실패를 삼킨다. 지도는 보조 정보이므로 화면 전체를 끌고 내려가면 안 된다.
        map.on('error', (event) => {
          if (!alive) return
          // eslint-disable-next-line no-console
          console.warn('[VenueMap] 지도 로드 실패 — 목록은 그대로 동작합니다.', event?.error)
          cb.current.onTileError?.()
        })
      })
      .catch(() => {
        if (alive) cb.current.onTileError?.()
      })

    return () => {
      alive = false
      markerRef.current?.remove()
      markerRef.current = null
      // remove() 를 빠뜨리면 라우트를 몇 번 오갈 때마다 WebGL 컨텍스트가 쌓여 탭이 죽는다.
      map?.remove()
      mapRef.current = null
    }
    // center/zoom/lang 은 아래 별도 effect 가 반영한다. 여기 넣으면 지도를 통째로 다시 만든다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 컨테이너 크기 변화 ──────────────────────────────────
  // 패널이 접히거나 탭이 바뀌면 캔버스 크기가 어긋난 채 남는다.
  useEffect(() => {
    const node = containerRef.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => mapRef.current?.resize())
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // ── 로케일 ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    localizeBasemapLabels(map, lang)
    updateGeoLabelLanguage(map, lang)
  }, [ready, lang])

  // ── 시야 이동 ──────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const options = {
      center,
      zoom,
      padding: { left: padding?.left ?? 0, bottom: padding?.bottom ?? 0, top: 0, right: 0 },
    }
    if (prefersReducedMotion()) map.jumpTo(options)
    else map.easeTo({ ...options, duration: 500 })
  }, [ready, center, zoom, padding?.left, padding?.bottom])

  // ── 마커 레이어 ────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !markers) return

    const data = toFeatureCollection(markers)
    const existing = map.getSource(SOURCE_ID)
    if (existing) {
      ;(existing as unknown as { setData: (d: unknown) => void }).setData(data)
      return
    }

    map.addSource(SOURCE_ID, { type: 'geojson', data, ...CLUSTER_OPTIONS })

    map.addLayer({
      id: CLUSTER_LAYER,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#b45309',
        'circle-opacity': 0.9,
        'circle-radius': ['step', ['get', 'point_count'], 16, 10, 21, 30, 27],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
      },
    })

    map.addLayer({
      id: CLUSTER_COUNT_LAYER,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-size': 12,
        'text-allow-overlap': true,
      },
      paint: { 'text-color': '#ffffff' },
    })

    map.addLayer({
      id: POINT_LAYER,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      layout: {
        // 원이 아니라 물방울 핀 — 뾰족한 끝이 곧 좌표라 "여기"가 어디인지 어긋나지 않는다.
        'icon-image': selectedIconExpression(selectedId) as never,
        'icon-anchor': 'bottom',
        // 아이콘은 pixelRatio 2 로 등록했으므로 1.0 이 곧 CSS 28×36px — 지도 앱 핀의 보통 크기다.
        // 줌이 낮을 때 살짝 줄여 마커가 서로 붙어 보이지 않게 한다.
        'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.75, 13, 1] as never,
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
    })

    map.addLayer({
      id: POINT_LABEL_LAYER,
      type: 'symbol',
      source: SOURCE_ID,
      filter: ['!', ['has', 'point_count']],
      minzoom: 14,
      layout: {
        'text-field': ['get', 'name'],
        'text-size': 11,
        // 핀은 아래가 앵커라 라벨을 그 위에 두면 겹친다. 핀 아래로 내린다.
        'text-offset': [0, 0.6],
        'text-anchor': 'top',
        'text-max-width': 9,
      },
      paint: {
        'text-color': '#3d4450',
        'text-halo-color': 'rgba(255,255,255,0.92)',
        'text-halo-width': 1.4,
      },
    })

    const handlePointClick = (event: { features?: MapGeoJSONFeature[] }) => {
      const id = event.features?.[0]?.properties?.venueId
      if (typeof id === 'number') cb.current.onSelectVenue?.(id)
    }

    const handleClusterClick = async (event: {
      features?: MapGeoJSONFeature[]
      lngLat: { lat: number; lng: number }
    }) => {
      const feature = event.features?.[0]
      const clusterId = feature?.properties?.cluster_id
      const current = mapRef.current
      if (clusterId == null || !current) return
      const source = current.getSource(SOURCE_ID) as unknown as {
        getClusterExpansionZoom: (id: number) => Promise<number>
        getClusterLeaves: (id: number, limit: number, offset: number) => Promise<MapGeoJSONFeature[]>
      }
      try {
        const nextZoom = await source.getClusterExpansionZoom(clusterId)
        const currentZoom = current.getZoom()
        // 최대 줌에 닿았는데도 더 못 풀면(= 좌표가 사실상 같으면) 목록으로 해소한다.
        // 이 분기가 없으면 사용자는 아무 반응 없는 클러스터를 계속 누르게 된다.
        if (nextZoom <= currentZoom + 0.01 || nextZoom > current.getMaxZoom()) {
          const leaves = await source.getClusterLeaves(clusterId, 100, 0)
          const ids = leaves
            .map((leaf) => leaf.properties?.venueId)
            .filter((id): id is number => typeof id === 'number')
          if (ids.length) cb.current.onClusterVenues?.(ids)
          return
        }
        current.easeTo({ center: [event.lngLat.lng, event.lngLat.lat], zoom: nextZoom })
      } catch {
        // 클러스터 확장 정보를 못 얻으면 그냥 두 단계 확대한다.
        current.easeTo({
          center: [event.lngLat.lng, event.lngLat.lat],
          zoom: current.getZoom() + 2,
        })
      }
    }

    const setPointer = () => {
      if (mapRef.current) mapRef.current.getCanvas().style.cursor = 'pointer'
    }
    const clearPointer = () => {
      if (mapRef.current) mapRef.current.getCanvas().style.cursor = pickMode ? 'crosshair' : ''
    }

    map.on('click', POINT_LAYER, handlePointClick)
    map.on('click', CLUSTER_LAYER, handleClusterClick)
    for (const layer of [POINT_LAYER, CLUSTER_LAYER]) {
      map.on('mouseenter', layer, setPointer)
      map.on('mouseleave', layer, clearPointer)
    }

    return () => {
      const current = mapRef.current
      if (!current) return
      current.off('click', POINT_LAYER, handlePointClick)
      current.off('click', CLUSTER_LAYER, handleClusterClick)
      for (const layer of [POINT_LAYER, CLUSTER_LAYER]) {
        current.off('mouseenter', layer, setPointer)
        current.off('mouseleave', layer, clearPointer)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, markers])

  // 선택 강조는 레이어를 다시 만들지 않고 아이콘만 바꾼다.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !map.getLayer(POINT_LAYER)) return
    try {
      map.setLayoutProperty(POINT_LAYER, 'icon-image', selectedIconExpression(selectedId) as never)
    } catch {
      /* 스타일 전환 중이면 다음 렌더에서 반영된다 */
    }
  }, [ready, selectedId])

  // ── 핀 찍기 ────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !pickMode) return

    const canvas = map.getCanvas()
    canvas.style.cursor = 'crosshair'

    const handleClick = (event: { lngLat: { lat: number; lng: number } }) => {
      cb.current.onPick?.({ lat: event.lngLat.lat, lng: event.lngLat.lng })
    }
    map.on('click', handleClick)
    return () => {
      map.off('click', handleClick)
      canvas.style.cursor = ''
    }
  }, [ready, pickMode])

  // 찍힌 핀을 그린다. 드래그로 미세 조정할 수 있게 두는 편이 좌표를 손으로 고치는 것보다 빠르다.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    if (!pickedPoint) {
      markerRef.current?.remove()
      markerRef.current = null
      return
    }

    let alive = true
    import('maplibre-gl').then((maplibre) => {
      if (!alive || !mapRef.current) return
      if (markerRef.current) {
        markerRef.current.setLngLat([pickedPoint.lng, pickedPoint.lat])
        return
      }
      const marker = new maplibre.Marker({ draggable: pickMode, color: '#d97706' })
        .setLngLat([pickedPoint.lng, pickedPoint.lat])
        .addTo(mapRef.current)
      marker.on('dragend', () => {
        const { lat, lng } = marker.getLngLat()
        cb.current.onPick?.({ lat, lng })
      })
      markerRef.current = marker
    })
    return () => {
      alive = false
    }
  }, [ready, pickedPoint, pickMode])

  return (
    <div
      ref={containerRef}
      className={className}
      role="application"
      aria-label={pickMode ? '위치 선택 지도' : '장소 지도'}
    />
  )
}
