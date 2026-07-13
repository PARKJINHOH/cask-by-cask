import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { spiritApi } from '@/domain/spirit/api/spiritApi'
import type { SpiritAutocompleteItem } from '@/domain/spirit/types/spirit.types'
import { getLocalizedSpiritListNames, getSpiritListDisplayNames } from '@/domain/spirit/utils/spiritDisplayName'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { SPIRIT_CATEGORY_EMOJI, type SpiritEmbedAttrs } from './SpiritEmbed'

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (attrs: SpiritEmbedAttrs) => void
}

// 본문에 삽입할 술을 검색·선택하는 모달.
export default function SpiritEmbedDialog({ open, onClose, onSelect }: Props) {
  const { t, i18n } = useTranslation()
  const [keyword, setKeyword] = useState('')
  const debouncedKeyword = useDebouncedValue(keyword)
  const [results, setResults] = useState<SpiritAutocompleteItem[]>([])
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
    const q = debouncedKeyword.trim()
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    let ignore = false
    setLoading(true)
    ;(async () => {
      try {
        const res = await spiritApi.autocomplete(q, undefined, true)
        if (!ignore) setResults(res.data.data ?? [])
      } catch {
        if (!ignore) setResults([])
      } finally {
        if (!ignore) setLoading(false)
      }
    })()
    return () => {
      ignore = true
    }
  }, [debouncedKeyword, open])

  // ESC 닫기
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const pick = (s: SpiritAutocompleteItem) => {
    const displayName = getSpiritListDisplayNames(s)
    onSelect({
      id: String(s.id),
      name: displayName.nameKo,
      nameEn: displayName.nameEn || displayName.nameKo,
      category: s.category,
      thumbnailUrl: s.imageUrl ?? null,
      abv: s.abv ?? null,
      reviewCount: s.reviewCount ?? 0,
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
            const { primaryName, secondaryName } = getLocalizedSpiritListNames(s, i18n.language)
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => pick(s)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-neutral-50 transition-colors border-b border-neutral-50 last:border-0"
              >
                {s.imageUrl ? (
                  <img
                    src={s.imageUrl}
                    alt=""
                    className="w-9 h-9 rounded object-cover bg-neutral-100 shrink-0"
                  />
                ) : (
                  <span className="w-9 h-9 rounded bg-neutral-100 flex items-center justify-center text-base shrink-0">
                    {SPIRIT_CATEGORY_EMOJI[s.category] ?? '🍶'}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-neutral-800 truncate">{primaryName}</span>
                  {secondaryName && <span className="block text-xs text-neutral-400 truncate">{secondaryName}</span>}
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
