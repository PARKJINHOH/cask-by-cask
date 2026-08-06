import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useTranslation } from 'react-i18next'
import { spiritApi } from '@/domain/spirit/api/spiritApi'
import type { SpiritAutocompleteItem } from '@/domain/spirit/types/spirit.types'
import { getSpiritListDisplayNames } from '@/domain/spirit/utils/spiritDisplayName'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import type { PhotoCardSpiritInfo } from '../types/photoCard.types'

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (info: PhotoCardSpiritInfo) => void
}

/**
 * 포토카드에 얹을 주류를 고른다.
 *
 * 자동완성으로 후보를 좁히고, 고른 뒤에는 상세를 한 번 더 불러 도수·용량·증류소·로고까지 채운다
 * (자동완성 응답에는 증류소 정보가 없다). 채워진 값은 편집기에서 사용자가 고칠 수 있다.
 */
export default function PhotoCardSpiritPicker({ open, onClose, onSelect }: Props) {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState('')
  const debounced = useDebouncedValue(keyword)
  const [results, setResults] = useState<SpiritAutocompleteItem[]>([])
  const [loading, setLoading] = useState(false)
  const [picking, setPicking] = useState(false)
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
    if (query.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    let ignore = false
    setLoading(true)
    void (async () => {
      try {
        const res = await spiritApi.autocomplete(query, undefined, true)
        if (!ignore) setResults(res.data.data ?? [])
      } catch {
        if (!ignore) setResults([])
      } finally {
        if (!ignore) setLoading(false)
      }
    })()
    return () => { ignore = true }
  }, [debounced, open])

  const pick = async (item: SpiritAutocompleteItem) => {
    setPicking(true)
    const names = getSpiritListDisplayNames(item)
    // 상세 조회에 실패해도 이름만으로 카드를 만들 수 있어야 한다.
    let info: PhotoCardSpiritInfo = {
      spiritId: item.id,
      nameKo: names.nameKo,
      nameEn: names.nameEn || names.nameKo,
      category: item.category ?? null,
      abv: item.abv != null ? String(item.abv) : '',
      volumeMl: '',
      vintageYear: item.vintageYear != null ? String(item.vintageYear) : '',
      producerNameKo: '',
      producerNameEn: '',
      producerCountry: '',
      producerLogoUrl: null,
      spiritImageUrl: item.imageUrl ?? null,
    }
    try {
      const detail = (await spiritApi.getDetail(item.id)).data.data
      if (detail) {
        info = {
          ...info,
          abv: detail.abv != null ? String(detail.abv) : info.abv,
          volumeMl: detail.volumeMl != null ? String(detail.volumeMl) : '',
          vintageYear: detail.vintageYear != null ? String(detail.vintageYear) : info.vintageYear,
          producerNameKo: detail.producerNameKo ?? '',
          producerNameEn: detail.producerNameEn ?? '',
          producerCountry: (detail as { producerCountry?: string | null }).producerCountry ?? detail.country ?? '',
          producerLogoUrl: (detail as { producerLogoImageUrl?: string | null }).producerLogoImageUrl ?? null,
          spiritImageUrl: detail.primaryImageUrl ?? info.spiritImageUrl,
        }
      }
    } catch {
      // 상세 조회 실패 — 자동완성 값으로 진행한다.
    } finally {
      setPicking(false)
    }
    onSelect(info)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-[2px]" aria-hidden="true" />
      <div className="fixed inset-0 flex items-start justify-center overflow-y-auto p-4 pt-[10vh]">
        <DialogPanel className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
          <div className="border-b border-neutral-200 px-5 py-4">
            <DialogTitle className="text-base font-bold text-neutral-900">
              {t('photoCard.searchSpirit')}
            </DialogTitle>
          </div>
          <div className="p-5">
            <input
              ref={inputRef}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={t('photoCard.searchSpirit')}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
            />
            <div className="mt-3 max-h-[45vh] overflow-y-auto">
              {loading && <p className="py-6 text-center text-sm text-neutral-400">···</p>}
              {!loading && results.length === 0 && keyword.trim().length >= 2 && (
                <p className="py-6 text-center text-sm text-neutral-400">{t('common.noResults', '결과가 없습니다.')}</p>
              )}
              <ul className="space-y-1">
                {results.map((item) => {
                  const names = getSpiritListDisplayNames(item)
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        disabled={picking}
                        onClick={() => { void pick(item) }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-neutral-50 disabled:opacity-50"
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
          <div className="flex justify-end border-t border-neutral-200 px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              {t('common.cancel', '취소')}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
