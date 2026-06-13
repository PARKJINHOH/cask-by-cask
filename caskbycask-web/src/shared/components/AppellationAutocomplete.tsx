import { useState, useEffect, useRef } from 'react'
import { appellationApi } from '@/shared/api/appellationApi'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function AppellationAutocomplete({ value, onChange, placeholder }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 300ms debounce
  useEffect(() => {
    if (!value.trim()) { setSuggestions([]); setOpen(false); return }
    const timer = setTimeout(async () => {
      const results = await appellationApi.search(value, 8)
      setSuggestions(results)
      setOpen(results.length > 0)
    }, 300)
    return () => clearTimeout(timer)
  }, [value])

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder ?? '예: AOC Bordeaux'}
        maxLength={200}
        className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg
          focus:outline-none focus:ring-2 focus:ring-primary-400"
      />
      {open && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-lg
          shadow-lg max-h-52 overflow-y-auto">
          {suggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-neutral-700
                  hover:bg-amber-50 hover:text-amber-800 transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault()
                  onChange(s)
                  setOpen(false)
                }}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
