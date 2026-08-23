import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useTranslation } from 'react-i18next'
import { spiritApi } from '@/domain/spirit/api/spiritApi'
import type { SpiritAutocompleteItem, SpiritCategory } from '@/domain/spirit/types/spirit.types'
import { getSpiritListDisplayNames } from '@/domain/spirit/utils/spiritDisplayName'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'

export interface PickedSpiritMaster {
  id: number
  nameKo: string
  nameEn: string
  category: SpiritCategory | null
}

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (master: PickedSpiritMaster) => void
  /** 이 카테고리 주류만 고르게 한다 (미지정 시 전체) */
  category?: SpiritCategory | null
  /** 관리자 화면은 한국어 고정 — 번역키 대신 고정 문구를 쓴다 */
  admin?: boolean
}

const MIN_QUERY = 2

/**
 * 이미 등록된 **마스터 주류**를 검색해 고른다.
 *
 * <p>자동완성을 `includeVariants=false` 로 부르므로 하위 에디션은 결과에 나오지 않는다 —
 * 에디션을 붙일 대상은 언제나 마스터이기 때문이다.
 *
 * <p>사용자 등록 요청 화면과 관리자 검토 화면이 **이것 하나**를 같이 쓴다.
 * 앱에는 자동완성 위에 각자 짠 드롭다운이 여럿 있는데, 두 화면이 같은 판단(어느 주류에
 * 에디션을 붙일지)을 하므로 목록 모양까지 같아야 한다.
 */
export default function SpiritMasterPicker({ open, onClose, onSelect, category, admin = false }: Props) {
  const { t } = useTranslation(undefined, admin ? { lng: 'ko' } : undefined)
  const [keyword, setKeyword] = useState('')
  const debounced = useDebouncedValue(keyword)
  const [results, setResults] = useState<SpiritAutocompleteItem[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setKeyword('')
    setResults([])
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  useEffect(() => {
    if (!open) return
    const query = debounced.trim()
    if (query.length < MIN_QUERY) {
      setResults([])
      setLoading(false)
      return
    }
    let ignore = false
    setLoading(true)
    void (async () => {
      try {
        const res = await spiritApi.autocomplete(query, undefined, false)
        const hits = res.data.data ?? []
        // 카테고리가 다르면 에디션을 붙일 수 없다 — 목록에서 미리 걸러 헛걸음을 막는다.
        if (!ignore) setResults(category ? hits.filter((h) => h.category === category) : hits)
      } catch {
        if (!ignore) setResults([])
      } finally {
        if (!ignore) setLoading(false)
      }
    })()
    return () => { ignore = true }
  }, [debounced, open, category])

  const pick = (item: SpiritAutocompleteItem) => {
    const names = getSpiritListDisplayNames(item)
    onSelect({
      id: item.id,
      nameKo: names.nameKo,
      nameEn: names.nameEn || names.nameKo,
      category: item.category ?? null,
    })
    onClose()
  }

  const query = keyword.trim()
  const title = admin ? '주류 검색' : t('spiritRequest.form.existingSpirit.searchTitle')
  const placeholder = admin ? '주류 이름을 입력하세요' : t('spiritRequest.form.existingSpirit.searchPlaceholder')
  const hint = admin ? '두 글자 이상 입력하면 검색됩니다.' : t('spiritRequest.form.existingSpirit.searchHint')

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-[2px]" aria-hidden="true" />
      <div className="fixed inset-0 flex items-start justify-center overflow-y-auto p-4 pt-[10vh]">
        <DialogPanel className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
          <div className="border-b border-neutral-200 px-5 py-4">
            <DialogTitle className="text-base font-bold text-neutral-900">{title}</DialogTitle>
          </div>
          <div className="p-5">
            <input
              ref={inputRef}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={placeholder}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm
                focus:border-primary-500 focus:outline-none"
            />
            <div className="mt-3 max-h-[45vh] overflow-y-auto">
              {query.length < MIN_QUERY && (
                <p className="py-6 text-center text-sm text-neutral-400">{hint}</p>
              )}
              {loading && query.length >= MIN_QUERY && (
                <p className="py-6 text-center text-sm text-neutral-400">···</p>
              )}
              {!loading && results.length === 0 && query.length >= MIN_QUERY && (
                <p className="py-6 text-center text-sm text-neutral-400">
                  {admin ? '결과가 없습니다.' : t('common.noResults', '결과가 없습니다.')}
                </p>
              )}
              <ul className="space-y-1">
                {results.map((item) => {
                  const names = getSpiritListDisplayNames(item)
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => pick(item)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-neutral-50"
                      >
                        <span className="h-10 w-8 shrink-0 overflow-hidden rounded bg-neutral-100">
                          {item.imageUrl && (
                            <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-neutral-900">{names.nameKo}</span>
                          <span className="block truncate text-xs text-neutral-500">{names.nameEn}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
