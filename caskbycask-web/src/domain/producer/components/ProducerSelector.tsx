import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAllProducers } from '../hooks/useProducer'
import type { Producer, ProducerSelectorProps as Props } from '../types/producer.types'

export type { NewProducerInput } from '../types/producer.types'

export default function ProducerSelector({ value, defaultName, onChange, placeholder, type, onCreateNew, defaultCountry }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // ── 신규 생산자 직접 등록 (기타 카테고리) ─────────────────────
  const allowCreate = !!onCreateNew && type === 'OTHER'
  const [creating, setCreating] = useState(false)
  const [newKo, setNewKo] = useState('')
  const [newEn, setNewEn] = useState('')
  const [newCountry, setNewCountry] = useState('')
  const [createErr, setCreateErr] = useState('')
  const [saving, setSaving] = useState(false)

  // 관리자 선택기와 동일: 해당 타입 생산자를 전부 미리 불러와 클릭 시 목록 노출
  const { data: all = [], isLoading } = useAllProducers(type)

  const selected = value ? (all.find((d) => d.id === value) ?? null) : null
  const displayName = selected?.nameKo ?? defaultName ?? ''

  const filtered = search.trim()
    ? all.filter(
        (d) =>
          d.nameKo.toLowerCase().includes(search.toLowerCase()) ||
          d.nameEn.toLowerCase().includes(search.toLowerCase()),
      )
    : all

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // 열릴 때 검색 input 포커스
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
  }, [open])

  const handleSelect = (d: Producer) => {
    onChange(d.id, d)
    setOpen(false)
    setSearch('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    setOpen(false)
    setSearch('')
  }

  // 드롭다운이 닫히면 직접 등록 폼 상태 초기화
  useEffect(() => {
    if (!open) {
      setCreating(false)
      setCreateErr('')
    }
  }, [open])

  const startCreate = () => {
    setNewKo(search.trim())
    setNewEn('')
    setNewCountry(defaultCountry ?? '')
    setCreateErr('')
    setCreating(true)
  }

  const submitCreate = async () => {
    if (!onCreateNew) return
    const ko = newKo.trim(), en = newEn.trim(), country = newCountry.trim()
    if (!ko || !en || !country) {
      setCreateErr(t('producerSelector.createRequired'))
      return
    }
    setSaving(true)
    setCreateErr('')
    try {
      const newId = await onCreateNew({ nameKo: ko, nameEn: en, country })
      if (newId != null) onChange(newId)
      setCreating(false)
      setOpen(false)
      setSearch('')
    } finally {
      setSaving(false)
    }
  }

  const NEW_INPUT = 'w-full px-2.5 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400'

  return (
    <div ref={ref} className="relative">
      {/* 트리거 (select box 모양 + 아래 화살표) */}
      <button
        type="button"
        onClick={() => (open ? (setOpen(false), setSearch('')) : setOpen(true))}
        className="w-full flex items-center justify-between px-3 py-2 text-sm border border-neutral-200 rounded-lg
          bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors text-left"
      >
        <span className={displayName ? 'text-neutral-900 truncate' : 'text-neutral-400 truncate'}>
          {isLoading && !displayName ? t('common.loading') : (displayName || placeholder || t('producerSelector.placeholder'))}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {value !== null && (
            <span
              role="button"
              onClick={handleClear}
              className="text-neutral-400 hover:text-neutral-600 transition-colors p-0.5"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </span>
          )}
          <svg
            className={`w-4 h-4 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* 드롭다운 (검색 + 결과) */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg
          border border-neutral-100 flex flex-col max-h-64">
          <div className="p-2 border-b border-neutral-100 shrink-0">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('producerSelector.searchPlaceholder')}
              className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>
          <ul className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-neutral-400 text-center">
                {isLoading ? t('common.loading') : t('producerSelector.noResult')}
              </li>
            ) : (
              filtered.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(d)}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-50 transition-colors ${
                      d.id === value ? 'bg-amber-50 text-amber-700 font-medium' : ''
                    }`}
                  >
                    <span className="font-medium">{d.nameKo}</span>
                    <span className="ml-2 text-xs text-neutral-400">{d.nameEn} · {d.country}</span>
                  </button>
                </li>
              ))
            )}
          </ul>

          {/* 목록에 없는 생산자 직접 등록 (기타 카테고리) */}
          {allowCreate && (
            <div className="border-t border-neutral-100 shrink-0">
              {!creating ? (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={startCreate}
                  className="w-full text-left px-4 py-2.5 text-sm font-medium text-primary-700 hover:bg-primary-50 transition-colors"
                >
                  {t('producerSelector.createNew')}
                </button>
              ) : (
                <div className="p-2 space-y-2">
                  <input value={newKo} onChange={(e) => setNewKo(e.target.value)} maxLength={200}
                    placeholder={`${t('producerSelector.newNameKo')} · ${t('producerSelector.newNameKoPh')}`} className={NEW_INPUT} />
                  <input value={newEn} onChange={(e) => setNewEn(e.target.value)} maxLength={200}
                    placeholder={`${t('producerSelector.newNameEn')} · ${t('producerSelector.newNameEnPh')}`} className={NEW_INPUT} />
                  <input value={newCountry} onChange={(e) => setNewCountry(e.target.value)} maxLength={100}
                    placeholder={`${t('producerSelector.newCountry')} · ${t('producerSelector.newCountryPh')}`} className={NEW_INPUT} />
                  {createErr && <p className="text-xs text-red-500">{createErr}</p>}
                  <div className="flex gap-2">
                    <button type="button" onClick={submitCreate} disabled={saving}
                      className="flex-1 py-1.5 text-sm font-semibold rounded-lg bg-primary-800 text-white hover:bg-primary-900 disabled:opacity-60 transition-colors">
                      {saving ? t('common.loading') : t('producerSelector.createSubmit')}
                    </button>
                    <button type="button" onClick={() => setCreating(false)} disabled={saving}
                      className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors">
                      {t('producerSelector.createCancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
