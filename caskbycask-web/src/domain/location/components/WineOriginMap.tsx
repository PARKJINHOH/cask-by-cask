'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { WINE_REGION_MAP_LOADERS, hasWineRegionMap } from '@/domain/location/data/wineRegionMap'
import type { CountryMap, RegionShape } from '@/domain/location/data/wineRegionMap'
import type { SpiritWineRegion } from '@/domain/spirit/types/spirit.types'

interface Props {
  /** 백엔드 상세 응답의 wineRegion — 없으면 이 컴포넌트를 렌더하지 않는다 */
  wineRegion: SpiritWineRegion
  /** 지역화된 국가명 (예: '프랑스' / 'France') */
  countryLabel: string
  className?: string
}

type MapView = 'country' | 'region' | 'subregion'

/**
 * 산지 지도 — 국가 → 산지 → 세부 산지 3단 탐색.
 *
 * <p><b>정밀도 우선</b>: 기하 데이터는 공개 산지·행정 경계를 거의 원해상도로 베이킹한
 * SVG path 문자열이다. 그만큼 용량이 있어 국가별로 동적 import 되며, 카드가 화면에
 * 들어올 때 해당 국가 것만 내려받는다(핵심 정보 렌더를 막지 않는다).
 *
 * <p>런타임에 지리 라이브러리를 쓰지 않는다 — 받아온 문자열을 그대로 SVG 로 그린다.
 * 기하 데이터가 없는 국가·산지는 아무것도 렌더하지 않고, 상세 페이지의 기존
 * 텍스트 표기(국가 · 지역)가 그대로 정보 역할을 한다.
 */
export default function WineOriginMap({ wineRegion, countryLabel, className }: Props) {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  const rootRef = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  const [map, setMap] = useState<CountryMap | null>(null)
  const [animate, setAnimate] = useState(false)
  /** 상세 페이지에 들어올 때는 항상 국가 지도에서 시작한다. */
  const [view, setView] = useState<MapView>('country')

  const supported = hasWineRegionMap(wineRegion.countryCode)

  // 카드가 화면에 들어올 때 비로소 해당 국가 기하 데이터를 내려받는다
  useEffect(() => {
    if (!supported) return
    const node = rootRef.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') { setInView(true); return }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setInView(true)
        observer.disconnect()
      }
    }, { rootMargin: '200px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [supported])

  useEffect(() => {
    if (!inView || !supported) return
    let alive = true
    WINE_REGION_MAP_LOADERS[wineRegion.countryCode]()
      .then((loaded) => {
        if (!alive) return
        setMap(loaded)
        // 도형이 붙은 다음 프레임에 연출 시작 (초기 상태가 반영된 뒤 애니메이션)
        requestAnimationFrame(() => { if (alive) setAnimate(true) })
      })
      .catch(() => { /* 지도는 보조 정보 — 실패 시 조용히 생략한다 */ })
    return () => { alive = false }
  }, [inView, supported, wineRegion.countryCode])

  if (!supported) return null

  // 국가 지도에서 칠할 L1 / 확대 지도에서 칠할 L2
  const l1Code = wineRegion.parentCode ?? wineRegion.code
  const l2Code = wineRegion.parentCode ? wineRegion.code : null
  const l1Name = wineRegion.parentCode
    ? (isEn ? wineRegion.parentNameEn : wineRegion.parentNameKo) ?? ''
    : (isEn ? wineRegion.nameEn : wineRegion.nameKo)
  const l2Name = l2Code ? (isEn ? wineRegion.nameEn : wineRegion.nameKo) : null

  const l1Shape = map?.regions[l1Code]
  const zoom = map && l1Shape ? map.zooms[l1Code] : undefined
  // L1 은 국가 도형 안에서 언제나 확대할 수 있고, L2 는 실제 확대 도형이 있을 때만 진입한다.
  const zoomShape = l2Code && zoom ? zoom.regions[l2Code] : undefined
  const canShowRegion = !!l1Shape
  const canShowSubregion = !!(zoom && zoomShape && l2Name)
  const currentView: MapView = view === 'subregion' && !canShowSubregion
    ? (canShowRegion ? 'region' : 'country')
    : view === 'region' && !canShowRegion
      ? 'country'
      : view

  // 데이터를 받았지만 이 산지의 도형이 없으면 카드를 통째로 접는다
  if (map && !l1Shape) return null

  /** 전체 계층은 항상 노출하고, 각 인디케이터로 해당 지도 단계에 이동한다. */
  const originParts = [
    { label: countryLabel, targetView: 'country' as const },
    { label: l1Name, targetView: canShowRegion ? 'region' as const : null },
    ...(l2Name ? [{ label: l2Name, targetView: canShowSubregion ? 'subregion' as const : null }] : []),
  ].filter((part) => !!part.label)

  return (
    <div
      ref={rootRef}
      className={`rounded-2xl ring-1 ring-neutral-100 bg-white p-4 sm:p-5 ${className ?? ''}`}
    >
      <h3 className="text-sm font-bold text-neutral-900 mb-2">
        {t('spirit.detail.originMap.title')}
      </h3>

      {/* ── 지도 단계 인디케이터 (국가 › 산지 › 세부 산지) ──────── */}
      <nav
        aria-label={t('spirit.detail.originMap.indicatorLabel')}
        className="flex flex-wrap items-center gap-x-1.5 gap-y-1 mb-3"
      >
        {originParts.map((part, i) => {
          const isCurrent = part.targetView === currentView
          return (
            <span key={`${part.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true" className="text-neutral-300">›</span>}
              {part.targetView ? (
                <button
                  type="button"
                  onClick={() => setView(part.targetView!)}
                  aria-current={isCurrent ? 'location' : undefined}
                  className={`rounded px-0.5 text-[13px] transition-colors
                    outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-1
                    ${isCurrent
                      ? 'font-bold text-amber-700'
                      : 'font-medium text-neutral-500 hover:text-amber-700'}`}
                >
                  {part.label}
                </button>
              ) : (
                <span className={isCurrent
                  ? 'text-[13px] font-bold text-amber-700'
                  : 'text-[13px] font-medium text-neutral-400'}>
                  {part.label}
                </span>
              )}
            </span>
          )
        })}
      </nav>

      {/* ── 지도 (국가 → 산지 → 세부 산지 전환) ─────────────────── */}
      {map && l1Shape ? (
        <div className="relative">
          {currentView === 'subregion' ? (
            <MapPanel
              caption={l2Name!}
              viewBox={map.viewBox}
              outlinePath={zoom!.outlinePath}
              shapes={zoom!.regions}
              targetCode={l2Code!}
              targetLabel={l2Name!}
              ariaLabel={t('spirit.detail.originMap.zoomAlt', { parent: l1Name, region: l2Name })}
              animate={animate}
              focusOnTarget
            />
          ) : currentView === 'region' ? (
            <MapPanel
              caption={l1Name}
              viewBox={map.viewBox}
              outlinePath={map.outlinePath}
              shapes={map.regions}
              targetCode={l1Code}
              targetLabel={l1Name}
              ariaLabel={t('spirit.detail.originMap.regionAlt', { country: countryLabel, region: l1Name })}
              animate={animate}
              focusOnTarget
              onTargetClick={canShowSubregion ? () => setView('subregion') : undefined}
              targetClickLabel={canShowSubregion
                ? t('spirit.detail.originMap.subregionHint', { region: l2Name })
                : undefined}
            />
          ) : (
            <MapPanel
              caption={countryLabel}
              viewBox={map.viewBox}
              outlinePath={map.outlinePath}
              shapes={map.regions}
              targetCode={l1Code}
              targetLabel={l1Name}
              ariaLabel={t('spirit.detail.originMap.countryAlt', { country: countryLabel, region: l1Name })}
              animate={animate}
              /* 모든 L1 산지는 대상 도형을 눌러 산지 단계로 확대한다. */
              onTargetClick={() => setView('region')}
              targetClickLabel={canShowRegion
                ? t('spirit.detail.originMap.zoomHint', { region: l1Name })
                : undefined}
            />
          )}

          {/* 산지·세부 산지 상태에서 좌측 상단 국가 복귀 */}
          {currentView !== 'country' && (
            <button
              type="button"
              onClick={() => setView('country')}
              className="absolute top-7 left-2 inline-flex items-center gap-1 rounded-full
                bg-white/95 backdrop-blur px-2.5 py-1 text-[11px] font-semibold text-neutral-700
                ring-1 ring-neutral-200 shadow-sm hover:bg-white
                focus:outline-none focus:ring-2 focus:ring-primary-400"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5"
                aria-hidden="true">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t('spirit.detail.originMap.back')}
            </button>
          )}
        </div>
      ) : (
        /* 로딩 자리 — 레이아웃 이동을 막기 위해 지도와 같은 비율의 자리를 잡아둔다 */
        <div>
          <div className="text-[11px] font-semibold text-neutral-400 mb-1">{countryLabel}</div>
          <div
            className="rounded-xl bg-neutral-100 animate-pulse"
            style={{ aspectRatio: '460 / 400' }}
            role="status"
            aria-label={t('spirit.detail.originMap.loading')}
          />
        </div>
      )}

      {/* 경계 데이터 출처 — 라이선스(Licence Ouverte / CC-BY 등) 요구사항 */}
      {map && (
        <p className="mt-2.5 text-[10.5px] leading-snug text-neutral-400">
          {t('spirit.detail.originMap.source', { source: map.attribution })}
        </p>
      )}
    </div>
  )
}

/**
 * 대상 구역을 중심으로 viewBox 를 다시 계산한다.
 *
 * 대상의 경계 상자를 최소 배율만큼 넓혀 주변 문맥을 남기고, 원본 viewBox 밖으로
 * 나가지 않게 잘라낸다. 대상이 이미 충분히 큰 경우에는 원본 viewBox 를 그대로 쓴다.
 */
function focusViewBox(baseViewBox: string, bbox: [number, number, number, number]): string {
  const [, , w, h] = baseViewBox.split(' ').map(Number)
  const [x0, y0, x1, y1] = bbox
  const tw = Math.max(x1 - x0, 1)
  const th = Math.max(y1 - y0, 1)

  // 대상이 화면의 45% 이상을 차지하면 확대할 필요가 없다
  if (tw / w > 0.45 || th / h > 0.45) return baseViewBox

  // 원본과 같은 종횡비를 유지하면서 대상이 약 55% 를 채우도록 잡는다
  const aspect = w / h
  let vw = Math.max(tw / 0.55, (th / 0.55) * aspect)
  let vh = vw / aspect
  vw = Math.min(vw, w)
  vh = Math.min(vh, h)

  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const vx = Math.min(Math.max(cx - vw / 2, 0), w - vw)
  const vy = Math.min(Math.max(cy - vh / 2, 0), h - vh)
  return `${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}`
}

function MapPanel({
  caption, viewBox, outlinePath, shapes, targetCode, targetLabel, ariaLabel, animate,
  focusOnTarget = false, onTargetClick, targetClickLabel,
}: {
  caption: string
  viewBox: string
  outlinePath: string
  shapes: Record<string, RegionShape>
  targetCode?: string
  targetLabel?: string
  ariaLabel: string
  animate: boolean
  focusOnTarget?: boolean
  /** 있으면 대상 구역이 눌러서 확대할 수 있는 버튼이 된다 */
  onTargetClick?: () => void
  targetClickLabel?: string
}) {
  const target = targetCode ? shapes[targetCode] : undefined
  const [mx, my] = target?.marker ?? [0, 0]
  const dx = target?.labelDx ?? 0
  const dy = target?.labelDy ?? 0
  const effectiveViewBox = focusOnTarget && target ? focusViewBox(viewBox, target.bbox) : viewBox
  // 확대 시 선·글자가 같이 커지지 않도록 축척에 맞춰 보정한다
  const baseWidth = Number(viewBox.split(' ')[2])
  const scale = Number(effectiveViewBox.split(' ')[2]) / baseWidth
  const clickable = !!(onTargetClick && target)

  return (
    <figure className="m-0">
      <figcaption className="text-[11px] font-semibold text-neutral-500 mb-1">
        <span>{caption}</span>
      </figcaption>
      <div className="rounded-xl overflow-hidden bg-sky-50/60 ring-1 ring-neutral-100">
        <svg
          viewBox={effectiveViewBox}
          role="img"
          aria-label={ariaLabel}
          className={`block w-full h-auto ${animate ? 'wom-animate' : ''}`}
        >
          <title>{ariaLabel}</title>
          {/* 국토·상위 산지 실루엣 */}
          <path d={outlinePath} fill="#ffffff" stroke="#e5e5e5" strokeWidth={0.8 * scale} />
          {/* 비대상 구역 — 색상 외 정보 전달을 위해 핀·라벨은 대상만 표시 */}
          {Object.entries(shapes).map(([code, shape]) =>
            code === targetCode ? null : (
              <path key={code} d={shape.path} fill="#e7e5e4" stroke="#d6d3d1" strokeWidth={0.5 * scale} />
            ))}
          {/* 대상 구역 — 확대 가능하면 클릭 대상이 된다 */}
          {target && targetLabel && <g
            className={clickable ? 'wom-region-trigger' : undefined}
            {...(clickable
              ? {
                role: 'button',
                tabIndex: 0,
                'aria-label': targetClickLabel,
                onClick: onTargetClick,
                // PC 마우스 클릭은 SVG 그룹에 브라우저 기본 검은 외곽선을 만들 수 있다.
                // 마우스 포커스만 막고 Tab 키보드 포커스는 그대로 유지한다.
                onPointerDown: (e: React.PointerEvent<SVGGElement>) => {
                  if (e.pointerType === 'mouse') e.preventDefault()
                },
                onKeyDown: (e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTargetClick?.() }
                },
                style: {
                  cursor: 'pointer',
                  outline: 'none',
                  WebkitTapHighlightColor: 'transparent',
                },
              }
              : {})}
          >
            <path
              className="wom-zone--target"
              d={target.path}
              fill="var(--color-amber-500)"
              stroke="var(--color-amber-700)"
              strokeWidth={(clickable ? 1.6 : 1) * scale}
            />
            {/* 둥근 핀 + 펄스 링 */}
            <g className="wom-pin" style={{ transformOrigin: `${mx}px ${my}px` }}>
              <line
                x1={mx} y1={my} x2={mx} y2={my - 13 * scale}
                stroke="var(--color-amber-800)" strokeWidth={1.6 * scale}
              />
              <circle
                cx={mx} cy={my - 16 * scale} r={4.5 * scale}
                fill="var(--color-amber-600)" stroke="#fff" strokeWidth={2 * scale}
              />
            </g>
            <circle
              className="wom-ring"
              cx={mx} cy={my} r={5 * scale}
              fill="none" stroke="var(--color-amber-500)" strokeWidth={2 * scale}
            />
            {/* 지역명 — 색상만으로 정보를 전달하지 않도록 항상 함께 표시 */}
            <text
              className="wom-label"
              x={mx + dx * scale}
              y={my + (19 + dy) * scale}
              textAnchor={target.labelAlign ?? 'middle'}
              fontSize={12 * scale}
              fontWeight={700}
              fill="#171717"
              paintOrder="stroke"
              stroke="#ffffff"
              strokeWidth={3.5 * scale}
              strokeLinejoin="round"
            >
              {targetLabel}
            </text>
          </g>}
        </svg>
      </div>
    </figure>
  )
}
