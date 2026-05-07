import { useState, useRef, useEffect } from 'react'
import { useDistilleries } from '../hooks/useDistillery'
import type { Distillery } from '../types/distillery.types'

interface Props {
  value: number | null
  defaultName?: string
  onChange: (id: number | null) => void
  placeholder?: string
}

const DEBOUNCE_MS = 400

export default function DistillerySelector({ value, defaultName, onChange, placeholder = '증류소 검색...' }: Props) {
  const [query, setQuery] = useState(defaultName ?? '')
  const [searchQuery, setSearchQuery] = useState(defaultName ?? '')
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Distillery | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const { data: results = [] } = useDistilleries(searchQuery)

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // value가 null로 초기화되면 selected 초기화
  useEffect(() => {
    if (value === null && !defaultName) {
      setSelected(null)
      setQuery('')
      setSearchQuery('')
    }
  }, [value, defaultName])

  // 디바운스: 마지막 입력 후 400ms 뒤에 검색 실행 (영어 및 한글 공통)
  useEffect(() => {
    if (!query.trim()) {
      setSearchQuery('')
      return
    }
    const timer = setTimeout(() => setSearchQuery(query), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (d: Distillery) => {
    setSelected(d)
    setQuery(d.nameKo)
    setSearchQuery(d.nameKo)
    setOpen(false)
    onChange(d.id)
  }

  const handleClear = () => {
    setSelected(null)
    setQuery('')
    setSearchQuery('')
    onChange(null)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
    setOpen(true)
    if (selected) {
      setSelected(null)
      onChange(null)
    }
  }

  // 한글 조합 완료 시 디바운스를 기다리지 않고 즉시 검색
  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    const val = e.currentTarget.value
    setQuery(val)
    setSearchQuery(val)
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onCompositionEnd={handleCompositionEnd}
          onFocus={() => query.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-8 text-sm border border-neutral-200 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors"
        />
        {(selected || value) && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400
              hover:text-neutral-600 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg
          border border-neutral-100 max-h-48 overflow-y-auto">
          {results.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => handleSelect(d)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-50 transition-colors"
              >
                <span className="font-medium text-neutral-800">{d.nameKo}</span>
                <span className="ml-2 text-xs text-neutral-400">{d.nameEn} · {d.country}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && query.length > 0 && results.length === 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg
          border border-neutral-100 px-4 py-3 text-sm text-neutral-400">
          검색 결과가 없습니다.
        </div>
      )}
    </div>
  )
}
