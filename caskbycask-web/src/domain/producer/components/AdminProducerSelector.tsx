import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAllProducers } from '../hooks/useProducer'
import type { Producer, ProducerSelectorProps as Props } from '../types/producer.types'
import { RequiredFieldsNotice } from '@/shared/components/FormFieldLabel'

export type { NewProducerInput } from '../types/producer.types'

interface DropdownPos {
  top: number
  left: number
  width: number
}

export default function AdminProducerSelector({
  value,
  defaultName,
  onChange,
  placeholder = '생산자 선택...',
  type,
  onCreateNew,
  defaultCountry,
}: Props) {
  const [open, setOpen]       = useState(false)
  const [search, setSearch]   = useState('')
  const [pos, setPos]         = useState<DropdownPos | null>(null)
  const triggerRef            = useRef<HTMLButtonElement>(null)
  const searchRef             = useRef<HTMLInputElement>(null)

  // ── 신규 생산자 직접 등록 (기타 카테고리) ─────────────────────
  const allowCreate = !!onCreateNew && type === 'OTHER'
  const [creating, setCreating]     = useState(false)
  const [newKo, setNewKo]           = useState('')
  const [newEn, setNewEn]           = useState('')
  const [newCountry, setNewCountry] = useState('')
  const [createErr, setCreateErr]   = useState('')
  const [saving, setSaving]         = useState(false)
  const [createdName, setCreatedName] = useState('')

  const { data: all = [], isLoading } = useAllProducers(type)

  const selected    = value ? (all.find((d) => d.id === value) ?? null) : null
  const displayName = selected?.nameKo || createdName || defaultName || ''

  const filtered = search.trim()
    ? all.filter(
        (d) =>
          d.nameKo.toLowerCase().includes(search.toLowerCase()) ||
          d.nameEn.toLowerCase().includes(search.toLowerCase()) ||
          (d.searchKeywords?.toLowerCase().includes(search.toLowerCase()) ?? false),
      )
    : all

  // 드롭다운 열릴 때 트리거 위치 계산 (fixed 포지셔닝용)
  const openDropdown = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setPos({
      top:   rect.bottom + window.scrollY + 4,
      left:  rect.left   + window.scrollX,
      width: rect.width,
    })
    setOpen(true)
  }

  // 스크롤/리사이즈 시 위치 재계산
  useEffect(() => {
    if (!open) return
    const recalc = () => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      setPos({
        top:   rect.bottom + window.scrollY + 4,
        left:  rect.left   + window.scrollX,
        width: rect.width,
      })
    }
    window.addEventListener('scroll', recalc, true)
    window.addEventListener('resize', recalc)
    return () => {
      window.removeEventListener('scroll', recalc, true)
      window.removeEventListener('resize', recalc)
    }
  }, [open])

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      // 드롭다운 포털 내부 클릭은 무시 (data-adsel 속성으로 식별)
      const portal = document.getElementById('admin-producer-selector-portal')
      if (portal?.contains(target)) return
      setOpen(false)
      setSearch('')
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

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
    setCreatedName('')
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
      setCreateErr('한글명·영문명·국가를 모두 입력해주세요.')
      return
    }
    setSaving(true)
    setCreateErr('')
    try {
      const newId = await onCreateNew({ nameKo: ko, nameEn: en, country })
      if (newId != null) {
        onChange(newId)
        setCreatedName(ko)
      }
      setCreating(false)
      setOpen(false)
      setSearch('')
    } catch {
      setCreateErr('생산자 등록에 실패했습니다. 입력값을 확인해주세요.')
    } finally {
      setSaving(false)
    }
  }

  const NEW_INPUT = 'w-full px-2.5 py-1.5 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400'

  const dropdown = open && pos ? (
    <div
      id="admin-producer-selector-portal"
      style={{
        position: 'fixed',
        top:      pos.top  - window.scrollY,
        left:     pos.left - window.scrollX,
        width:    pos.width,
        zIndex:   9999,
      }}
      className="bg-white rounded-xl shadow-lg border border-neutral-100 flex flex-col max-h-64"
    >
      {/* 검색 */}
      <div className="p-2 border-b border-neutral-100 shrink-0">
        <input
          ref={searchRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름으로 검색..."
          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
      </div>
      {/* 목록 */}
      <ul className="overflow-y-auto flex-1">
        {filtered.length === 0 ? (
          <li className="px-4 py-3 text-sm text-neutral-400 text-center">
            검색 결과 없음
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
                <span className="ml-2 text-xs text-neutral-400">
                  {d.nameEn} · {d.country}
                </span>
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
              className="w-full text-left px-4 py-2.5 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors"
            >
              + 목록에 없는 생산자 직접 등록
            </button>
          ) : (
            <div className="p-2 space-y-2">
              <RequiredFieldsNotice admin />
              <input value={newKo} onChange={(e) => setNewKo(e.target.value)} maxLength={200} required aria-required="true" aria-label="한글 이름"
                placeholder="한글 이름 · 예) 산토리" className={NEW_INPUT} />
              <input value={newEn} onChange={(e) => setNewEn(e.target.value)} maxLength={200} required aria-required="true" aria-label="영문 이름"
                placeholder="영문 이름 · 예) Suntory" className={NEW_INPUT} />
              <input value={newCountry} onChange={(e) => setNewCountry(e.target.value)} maxLength={100} required aria-required="true" aria-label="국가"
                placeholder="국가 · 예) 일본" className={NEW_INPUT} />
              {createErr && <p className="text-xs text-red-500">{createErr}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={submitCreate} disabled={saving}
                  className="flex-1 py-1.5 text-sm font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60 transition-colors">
                  {saving ? '등록 중...' : '등록'}
                </button>
                <button type="button" onClick={() => setCreating(false)} disabled={saving}
                  className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors">
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  ) : null

  return (
    <div className="relative">
      {/* 트리거 버튼 */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? (setOpen(false), setSearch('')) : openDropdown())}
        className="w-full flex items-center justify-between px-3 py-2 text-sm border border-neutral-200 rounded-lg
          bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors text-left"
      >
        <span className={displayName ? 'text-neutral-900' : 'text-neutral-400'}>
          {isLoading ? '불러오는 중...' : (displayName || placeholder)}
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

      {/* 드롭다운을 document.body에 포털로 렌더링 (modal overflow-hidden 우회) */}
      {createPortal(dropdown, document.body)}
    </div>
  )
}
