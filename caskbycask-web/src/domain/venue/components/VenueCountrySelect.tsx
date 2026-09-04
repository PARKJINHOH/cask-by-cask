'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { venueCountryLabelKey } from '@/domain/venue/utils/venueLabels'
import type { VenueCountry } from '@/domain/venue/types/venue.types'

interface Props {
  countries: VenueCountry[]
  value: string | null
  onChange: (countryCode: string) => void
  className?: string
}

/**
 * 국가 선택 — 검색 가능한 드롭다운.
 *
 * <p>네이티브 {@code <select>} 를 쓰지 않는 이유는 둘이다. 국가가 늘어나면 스크롤로만 찾아야 하고,
 * 브라우저마다 모양이 달라 옆의 도시 칩과 높이가 안 맞는다. 관리자 생산자 선택기가
 * 같은 이유로 포털 드롭다운을 쓰고 있어 그 방식을 따랐다.
 *
 * <p>드롭다운을 {@code position: fixed} 포털로 띄우는 것은 상단 바가
 * {@code overflow-x: auto} 스크롤러라 그 안에 두면 잘리기 때문이다.
 */
export default function VenueCountrySelect({ countries, value, onChange, className }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const label = (code: string) => t(venueCountryLabelKey(code), code.toUpperCase())
  const selected = countries.find((c) => c.countryCode === value) ?? null

  const filtered = search.trim()
    ? countries.filter((c) => {
        const needle = search.trim().toLowerCase()
        return label(c.countryCode).toLowerCase().includes(needle)
          || c.countryCode.includes(needle)
          // 도시명으로도 국가를 찾을 수 있게 한다 — "오사카"를 치면 일본이 나와야 자연스럽다.
          || c.cities.some((city) =>
            city.nameKo.toLowerCase().includes(needle) || city.nameEn.toLowerCase().includes(needle))
      })
    : countries

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setPos({ top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 200) })
  }, [open])

  useEffect(() => {
    if (!open) return
    searchRef.current?.focus()
    const close = (event: PointerEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target)) return
      if ((target as HTMLElement).closest?.('[data-venue-country-dropdown]')) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', onKey)
    // 스크롤·리사이즈로 트리거가 움직이면 드롭다운만 남아 떠 있게 된다.
    window.addEventListener('scroll', () => setOpen(false), { once: true, capture: true })
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => { setSearch(''); setOpen((prev) => !prev) }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-neutral-300
          bg-white px-3 text-sm font-medium text-neutral-800 transition-colors
          hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-400
          ${className ?? ''}`}
      >
        <span className="max-w-[120px] truncate">
          {selected ? label(selected.countryCode) : t('venue.map.selectCountry', '국가 선택')}
        </span>
        <span className="text-[10px] text-neutral-400" aria-hidden="true">▼</span>
      </button>

      {open && pos && createPortal(
        <div
          data-venue-country-dropdown
          style={{ top: pos.top, left: pos.left, width: pos.width }}
          className="fixed z-50 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg"
        >
          <div className="border-b border-neutral-100 p-2">
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('venue.map.searchCountry', '국가·도시 검색')}
              className="h-8 w-full rounded-md border border-neutral-200 px-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2.5 text-sm text-neutral-400">
                {t('venue.picker.noResult', '검색 결과가 없어요.')}
              </li>
            )}
            {filtered.map((country) => (
              <li key={country.countryCode} role="option" aria-selected={country.countryCode === value}>
                <button
                  type="button"
                  onClick={() => { onChange(country.countryCode); setOpen(false) }}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm
                    hover:bg-neutral-50 ${
                      country.countryCode === value ? 'font-semibold text-primary-800' : 'text-neutral-700'
                    }`}
                >
                  <span className="truncate">{label(country.countryCode)}</span>
                  <span className="shrink-0 text-xs text-neutral-400">{country.venueCount}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>,
        document.body,
      )}
    </>
  )
}
