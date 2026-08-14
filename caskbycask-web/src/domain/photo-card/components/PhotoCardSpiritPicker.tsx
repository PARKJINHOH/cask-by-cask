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

/** 하나의 후보 로고 — 선택 단계에서만 쓰는 최소 정보. */
interface LogoOption {
  imageUrl: string
}

/**
 * 포토카드에 얹을 주류를 고른다.
 *
 * 자동완성으로 후보를 좁히고, 고른 뒤에는 상세를 한 번 더 불러 도수·용량·증류소·로고까지 채운다
 * (자동완성 응답에는 증류소 정보가 없다). 채워진 값은 편집기에서 사용자가 고칠 수 있다.
 *
 * 증류소에 로고가 여러 장(최대 5장) 등록돼 있으면, 대표를 조용히 자동 채우는 대신
 * 그 자리에서 어떤 버전을 쓸지 바로 고르게 한다 — 여러 버전을 등록해 둔 이유가 상황에 맞게
 * 고르기 위해서인데, 항상 대표만 쓰이면 나머지 버전이 있으나 마나가 된다.
 */
export default function PhotoCardSpiritPicker({ open, onClose, onSelect }: Props) {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState('')
  const debounced = useDebouncedValue(keyword)
  const [results, setResults] = useState<SpiritAutocompleteItem[]>([])
  const [loading, setLoading] = useState(false)
  const [picking, setPicking] = useState(false)
  /** 로고를 여러 장 중 하나로 고를 차례가 되면 채워진다 — 채워진 동안 검색 화면 대신 이 단계를 보여 준다. */
  const [logoStep, setLogoStep] = useState<{ info: PhotoCardSpiritInfo; options: LogoOption[] } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setKeyword('')
    setResults([])
    setLogoStep(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  useEffect(() => {
    if (!open || logoStep) return
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
  }, [debounced, open, logoStep])

  const finish = (info: PhotoCardSpiritInfo) => {
    onSelect(info)
    onClose()
  }

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
    let logoOptions: LogoOption[] = []
    try {
      const detail = (await spiritApi.getDetail(item.id)).data.data
      if (detail) {
        const logoImages = (detail as { producerLogoImages?: LogoOption[] | null }).producerLogoImages ?? []
        logoOptions = logoImages
        info = {
          ...info,
          abv: detail.abv != null ? String(detail.abv) : info.abv,
          volumeMl: detail.volumeMl != null ? String(detail.volumeMl) : '',
          vintageYear: detail.vintageYear != null ? String(detail.vintageYear) : info.vintageYear,
          producerNameKo: detail.producerNameKo ?? '',
          producerNameEn: detail.producerNameEn ?? '',
          producerCountry: (detail as { producerCountry?: string | null }).producerCountry ?? detail.country ?? '',
          // 로고가 한 장뿐이면(또는 없으면) 바로 확정 — 고민할 것이 없다.
          producerLogoUrl: logoImages.length <= 1 ? (logoImages[0]?.imageUrl ?? null) : null,
          spiritImageUrl: detail.primaryImageUrl ?? info.spiritImageUrl,
        }
      }
    } catch {
      // 상세 조회 실패 — 자동완성 값으로 진행한다.
    } finally {
      setPicking(false)
    }

    // 로고가 여러 장이면 여기서 멈추고 고르게 한다 — 대표만 조용히 쓰면 나머지 버전은
    // 등록해 둔 의미가 없어진다.
    if (logoOptions.length > 1) {
      setLogoStep({ info, options: logoOptions })
      return
    }
    finish(info)
  }

  const query = keyword.trim()

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-[2px]" aria-hidden="true" />
      <div className="fixed inset-0 flex items-start justify-center overflow-y-auto p-4 pt-[10vh]">
        <DialogPanel className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
          <div className="border-b border-neutral-200 px-5 py-4">
            <DialogTitle className="text-base font-bold text-neutral-900">
              {logoStep ? t('photoCard.logoVariantChoose') : t('photoCard.searchSpirit')}
            </DialogTitle>
          </div>

          {logoStep ? (
            <div className="p-5">
              <p className="mb-3 text-xs text-neutral-500">{t('photoCard.logoVariantChooseHint')}</p>
              <div className="grid grid-cols-3 gap-2">
                {logoStep.options.map((logo, index) => (
                  <button
                    key={logo.imageUrl}
                    type="button"
                    onClick={() => finish({ ...logoStep.info, producerLogoUrl: logo.imageUrl })}
                    className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 hover:border-primary-400"
                  >
                    <img src={logo.imageUrl} alt={`${t('photoCard.logoSection')} ${index + 1}`} className="h-full w-full object-contain p-2" />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => finish({ ...logoStep.info, producerLogoUrl: null })}
                className="mt-4 text-xs font-semibold text-neutral-500 hover:text-neutral-700 hover:underline"
              >
                {t('photoCard.logoVariantSkip')}
              </button>
            </div>
          ) : (
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
                {!loading && results.length === 0 && query.length >= 2 && (
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
          )}

          <div className="flex justify-end border-t border-neutral-200 px-5 py-3">
            <button
              type="button"
              onClick={logoStep ? () => setLogoStep(null) : onClose}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              {logoStep ? t('common.back', '뒤로') : t('common.cancel', '취소')}
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
