'use client'

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { venueApi } from '@/domain/venue/api/venueApi'
import { venueDisplayName, type VenueSummary } from '@/domain/venue/types/venue.types'
import { venueTypeLabelKey } from '@/domain/venue/utils/venueLabels'

/**
 * 선택된 장소의 최소 형태.
 *
 * 검색 결과({@link VenueSummary})와 리뷰에 이미 붙어 있던 태그(ReviewVenueInfo)를
 * 모두 담을 수 있어야 해서 공통 부분만 뽑았다 — 두 타입을 각각 받으면 호출부가 분기를 진다.
 */
export interface VenuePickerValue {
  id: number
  nameKo: string
  nameEn: string | null
  cityNameKo: string
  cityNameEn: string
}

interface Props {
  value: VenuePickerValue | null
  onChange: (venue: VenuePickerValue | null) => void
  className?: string
}

/**
 * 리뷰의 "마신 곳" 선택기.
 *
 * <p>이 한 칸이 이 기능 전체의 입력구다 — 사장님에게 판매 목록을 갱신시키지 않고도
 * 술↔장소 연결이 쌓이는 유일한 경로다. 그래서 <b>선택 사항</b>으로 두고 부담을 주지 않는다.
 *
 * <p>빈 키워드로는 검색하지 않는다. 콤보박스가 열리자마자 전국 목록을 받아오면
 * 고르는 데 도움도 안 되고 요청만 나간다.
 */
export default function VenuePicker({ value, onChange, className }: Props) {
  const { t, i18n } = useTranslation()
  const [keyword, setKeyword] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounced = useDebouncedValue(keyword, 300)

  const { data: results, isFetching } = useQuery({
    queryKey: ['venues', 'search', debounced],
    queryFn: () => venueApi.search(debounced, undefined, 10).then((r) => r.data.data ?? []),
    enabled: debounced.trim().length > 0,
    staleTime: 60 * 1000,
  })

  // 바깥을 누르면 닫는다 — 모바일에서 목록이 화면을 계속 덮고 있으면 폼을 못 쓴다.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const select = (venue: VenueSummary) => {
    onChange(venue)
    setKeyword('')
    setOpen(false)
  }

  return (
    <div className={className} ref={containerRef}>
      <label className="block text-sm font-medium text-neutral-700" htmlFor="venue-picker">
        {t('venue.picker.label', '마신 곳')}
        <span className="ml-1 font-normal text-neutral-400">({t('common.optional', '선택')})</span>
      </label>

      {value ? (
        <div className="mt-1 flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-sm text-neutral-800">
            🍸 {venueDisplayName(value, i18n.language)}
            <span className="ml-1.5 text-xs text-neutral-400">
              {i18n.language === 'en' ? value.cityNameEn : value.cityNameKo}
            </span>
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="min-h-[36px] shrink-0 px-2 text-xs text-neutral-500 hover:text-neutral-800"
          >
            {t('venue.picker.clear', '선택 해제')}
          </button>
        </div>
      ) : (
        <div className="relative mt-1">
          <input
            id="venue-picker"
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            placeholder={t('venue.picker.placeholder', '바·보틀샵 이름을 검색하세요 (선택)')}
            className="w-full border border-neutral-300 px-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-primary-400"
          />

          {open && debounced.trim().length > 0 && (
            <ul
              role="listbox"
              className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border
                border-neutral-200 bg-white shadow-lg"
            >
              {isFetching && (
                <li className="px-3 py-2.5 text-sm text-neutral-400">…</li>
              )}
              {!isFetching && (results ?? []).length === 0 && (
                <li className="px-3 py-2.5 text-sm text-neutral-400">
                  {t('venue.picker.noResult', '검색 결과가 없어요.')}
                </li>
              )}
              {(results ?? []).map((venue) => (
                <li key={venue.id} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onClick={() => select(venue)}
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left
                      hover:bg-neutral-50"
                  >
                    <span className="text-sm font-medium text-neutral-900">
                      {venueDisplayName(venue, i18n.language)}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-neutral-500">
                      <span className="rounded bg-neutral-100 px-1.5">
                        {t(venueTypeLabelKey(venue.venueType), venue.venueType)}
                      </span>
                      <span className="truncate">{venue.address}</span>
                    </span>
                  </button>
                </li>
              ))}
              <li className="border-t border-neutral-100">
                <Link
                  to="/request/venue"
                  className="block px-3 py-2.5 text-xs text-primary-700 hover:bg-neutral-50"
                >
                  {t('venue.picker.suggest', '찾는 곳이 없나요? 제보하기')}
                </Link>
              </li>
            </ul>
          )}
        </div>
      )}

      <p className="mt-1 text-xs text-neutral-400">
        {t('venue.picker.hint', '여기에 남긴 장소가 술 상세의 "마실 수 있는 곳"에 쌓입니다.')}
      </p>
    </div>
  )
}
