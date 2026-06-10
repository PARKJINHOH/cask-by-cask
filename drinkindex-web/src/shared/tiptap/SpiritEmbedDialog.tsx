import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { spiritApi } from '@/domain/spirit/api/spiritApi'
import type { SpiritListItem } from '@/domain/spirit/types/spirit.types'
import { SPIRIT_CATEGORY_EMOJI, type SpiritEmbedAttrs } from './SpiritEmbed'

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (attrs: SpiritEmbedAttrs) => void
}

// 본문에 삽입할 술을 검색·선택하는 모달.
export default function SpiritEmbedDialog({ open, onClose, onSelect }: Props) {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<SpiritListItem[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // 모달 열릴 때 초기화 + 포커스
  useEffect(() => {
    if (open) {
      setKeyword('')
      setResults([])
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // 디바운스 검색
  useEffect(() => {
    if (!open) return
    const q = keyword.trim()
    if (q.length < 1) {
      setResults([])
      return
    }
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await spiritApi.search({ keyword: q, page: 0, size: 12 })
        setResults(res.data.data?.content ?? [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [keyword, open])

  // ESC 닫기
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const pick = (s: SpiritListItem) => {
    onSelect({
      id: String(s.id),
      name: s.nameKo,
      nameEn: s.nameEn || s.nameKo,
      category: s.category,
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-4 pt-[12vh]"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* 검색 입력 */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-100">
          <svg className="w-4 h-4 text-neutral-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t('editor.spiritSearchPlaceholder')}
            className="flex-1 text-sm outline-none bg-transparent"
          />
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 text-lg leading-none px-1"
          >
            ×
          </button>
        </div>

        {/* 결과 목록 */}
        <div className="max-h-[50vh] overflow-y-auto">
          {loading && (
            <div className="py-10 text-center text-sm text-neutral-400">{t('common.loading')}</div>
          )}
          {!loading && keyword.trim() && results.length === 0 && (
            <div className="py-10 text-center text-sm text-neutral-400">{t('editor.spiritNoResult')}</div>
          )}
          {!loading && !keyword.trim() && (
            <div className="py-10 text-center text-sm text-neutral-400">{t('editor.spiritSearchHint')}</div>
          )}
          {results.map((s) => {
            const main = isEn ? (s.nameEn || s.nameKo) : s.nameKo
            const sub = isEn ? s.nameKo : (s.nameEn || '')
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => pick(s)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-neutral-50 transition-colors border-b border-neutral-50 last:border-0"
              >
                {s.primaryImageUrl ? (
                  <img
                    src={s.primaryImageUrl}
                    alt=""
                    className="w-9 h-9 rounded object-cover bg-neutral-100 shrink-0"
                  />
                ) : (
                  <span className="w-9 h-9 rounded bg-neutral-100 flex items-center justify-center text-base shrink-0">
                    {SPIRIT_CATEGORY_EMOJI[s.category] ?? '🍶'}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-neutral-800 truncate">{main}</span>
                  {sub && <span className="block text-xs text-neutral-400 truncate">{sub}</span>}
                </span>
                {s.avgScore != null && (
                  <span className="text-xs text-amber-600 font-semibold tabular-nums shrink-0">
                    ★ {s.avgScore.toFixed(1)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
