'use client'

import { Suspense, lazy, useCallback, useMemo, useState } from 'react'
import { FALLBACK_CENTER, FALLBACK_ZOOM } from '@/domain/venue/config/mapTiles'
import type { LatLng } from '@/domain/venue/components/VenueMap'

// 지도를 안 쓰는 관리자 화면의 번들에 maplibre 가 섞이지 않도록 라우트가 아니라 여기서 자른다.
const VenueMap = lazy(() => import('@/domain/venue/components/VenueMap'))

interface Props {
  lat: number | null
  lng: number | null
  onChange: (point: { lat: number | null; lng: number | null }) => void
  /** 도시를 고르면 그 도시 중심에서 시작한다 — 세계 지도에서 찾아 들어가지 않도록. */
  cityCenter?: { lat: number; lng: number; zoom: number } | null
  className?: string
}

/** 소수점 7자리로 끊는다 — DECIMAL(9,7)/(10,7) 컬럼보다 정밀한 값은 저장할 때 어차피 잘린다. */
function round7(value: number): number {
  return Math.round(value * 1e7) / 1e7
}

function parseCoordinate(raw: string): number | null {
  const trimmed = raw.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * 관리자 좌표 지정 — 지도를 클릭하거나, 핀을 끌거나, 숫자를 직접 입력한다.
 *
 * <p>세 경로를 모두 남겨 둔 것은 의도적이다. 공유 링크 해석(증분 9)은 네이버 단축 URL 처럼
 * 원리상 좌표가 안 나오는 경우가 있고, 타일 서버나 WebGL 이 죽을 수도 있다.
 * 그 어느 경우에도 장소 등록 자체가 막히면 안 되므로 <b>숫자 입력은 언제나 살아 있다</b>.
 */
export default function VenueMapPicker({ lat, lng, onChange, cityCenter, className }: Props) {
  const [mapFailed, setMapFailed] = useState<'unsupported' | 'tiles' | null>(null)

  const picked = useMemo<LatLng | null>(
    () => (lat != null && lng != null ? { lat, lng } : null),
    [lat, lng],
  )

  // 이미 찍은 좌표 > 선택한 도시 중심 > 서울. 빈 세계 지도로 시작하지 않는다.
  const center = useMemo<[number, number]>(() => {
    if (picked) return [picked.lng, picked.lat]
    if (cityCenter) return [cityCenter.lng, cityCenter.lat]
    return FALLBACK_CENTER
  }, [picked, cityCenter])

  const zoom = picked ? 16 : cityCenter?.zoom ?? FALLBACK_ZOOM

  const handlePick = useCallback(
    (point: LatLng) => onChange({ lat: round7(point.lat), lng: round7(point.lng) }),
    [onChange],
  )

  const inputClass =
    'w-full border border-neutral-300 px-3 py-2 text-sm ' +
    'focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'

  return (
    <div className={className}>
      <div className="relative h-72 w-full overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
        {mapFailed ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center">
            <p className="text-sm font-medium text-neutral-700">
              {mapFailed === 'unsupported'
                ? '이 브라우저에서는 지도를 표시할 수 없습니다.'
                : '지도를 불러오지 못했습니다.'}
            </p>
            <p className="text-xs text-neutral-500">
              아래에 위도·경도를 직접 입력하면 그대로 저장됩니다.
            </p>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-sm text-neutral-400">
                지도를 불러오는 중…
              </div>
            }
          >
            <VenueMap
              className="h-full w-full"
              center={center}
              zoom={zoom}
              pickMode
              pickedPoint={picked}
              onPick={handlePick}
              onUnsupported={() => setMapFailed('unsupported')}
              onTileError={() => setMapFailed((prev) => prev ?? 'tiles')}
            />
          </Suspense>
        )}
      </div>

      <p className="mt-2 text-xs text-neutral-500">
        지도를 클릭해 위치를 지정하고, 핀을 끌어 미세 조정하세요. 좌표를 직접 입력해도 됩니다.
      </p>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-600">위도 (lat)</span>
          <input
            type="text"
            inputMode="decimal"
            className={inputClass}
            value={lat ?? ''}
            placeholder="37.4979"
            onChange={(e) => onChange({ lat: parseCoordinate(e.target.value), lng })}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-600">경도 (lng)</span>
          <input
            type="text"
            inputMode="decimal"
            className={inputClass}
            value={lng ?? ''}
            placeholder="127.0276"
            onChange={(e) => onChange({ lat, lng: parseCoordinate(e.target.value) })}
          />
        </label>
      </div>

      {picked && (
        <button
          type="button"
          className="mt-2 text-xs text-neutral-500 underline hover:text-neutral-700"
          onClick={() => onChange({ lat: null, lng: null })}
        >
          좌표 지우기
        </button>
      )}
    </div>
  )
}
