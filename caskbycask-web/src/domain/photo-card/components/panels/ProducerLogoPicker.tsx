import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { producerApi } from '@/domain/producer/api/producerApi'
import type { Producer } from '@/domain/producer/types/producer.types'
import type { PhotoCardEditor } from '../../hooks/usePhotoCardEditor'

interface Props {
  editor: PhotoCardEditor
  /** 찾는 로고가 없을 때 직접 그림을 올리도록 안내한다 */
  onUploadInstead: () => void
}

/** 홈 검색과 같은 규칙 — 두 글자부터 찾는다. 한 글자로는 후보가 너무 많아 쓸모가 없다. */
const MIN_KEYWORD = 2
const DEBOUNCE_MS = 250

/**
 * 생산자 로고 고르기.
 *
 * 이름을 검색해야 목록이 나온다. 처음부터 전체를 늘어놓으면 고르는 화면이 아니라
 * 훑는 화면이 되고, 정작 찾는 곳은 스크롤 아래에 묻힌다.
 * 로고가 등록된 곳만 서버에서 걸러 받는다(`hasLogo`) — 얹을 수 없는 항목을 보여 줄 이유가 없다.
 *
 * 생산자가 로고를 여러 장(최대 5장) 등록해 뒀을 수 있다 — 한 장뿐이면 바로 얹고,
 * 여러 장이면 그 자리에서 펼쳐 어떤 버전을 쓸지 고르게 한다.
 *
 * 고른 로고는 편집기의 주류 정보에 실어 둔다. 카드의 로고 요소(source=PRODUCER_LOGO)가
 * 그 값을 보고 그리기 때문에, 주류를 따로 고르지 않아도 로고만 얹을 수 있다.
 */
export default function ProducerLogoPicker({ editor, onUploadInstead }: Props) {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<Producer[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  /** 로고가 여러 장인 생산자를 눌렀을 때, 그 자리에서 펼쳐 보여 주는 대상 */
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // 같은 말을 다시 치면 서버에 또 묻지 않는다(홈 검색과 같은 방식).
  const cacheRef = useRef(new Map<string, Producer[]>())
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    abortRef.current?.abort()
  }, [])

  const runSearch = (value: string) => {
    setKeyword(value)
    setExpandedId(null)
    if (timerRef.current) clearTimeout(timerRef.current)

    const query = value.trim()
    if (query.length < MIN_KEYWORD) {
      abortRef.current?.abort()
      setResults([])
      setSearched(false)
      setLoading(false)
      return
    }

    timerRef.current = setTimeout(async () => {
      const cached = cacheRef.current.get(query)
      if (cached) {
        setResults(cached)
        setSearched(true)
        return
      }
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      try {
        const page = await producerApi.search(
          { keyword: query, hasLogo: true, size: 20 },
          controller.signal,
        )
        const found = page.data.data?.content ?? []
        cacheRef.current.set(query, found)
        setResults(found)
        setSearched(true)
      } catch {
        // 취소되었거나 실패 — 이전 결과를 지우고 조용히 넘어간다.
        if (!controller.signal.aborted) {
          setResults([])
          setSearched(true)
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, DEBOUNCE_MS)
  }

  const place = (producer: Producer, imageUrl: string) => {
    // 주류를 고르지 않았어도 로고만 얹을 수 있어야 한다 — 최소한의 정보만 채운다.
    editor.setSpirit((current) => ({
      spiritId: null,
      nameKo: '',
      nameEn: '',
      category: null,
      abv: '',
      volumeMl: '',
      vintageYear: '',
      producerNameKo: producer.nameKo,
      producerNameEn: producer.nameEn ?? '',
      producerCountry: '',
      spiritImageUrl: null,
      ...(current ?? {}),
      producerLogoUrl: imageUrl,
    }))
    editor.addLayer('IMAGE', { source: 'PRODUCER_LOGO', widthRatio: 0.16 })
  }

  const handlePick = (producer: Producer) => {
    if (producer.logoImages.length === 0) return
    // 한 장뿐이면 고민할 것 없이 바로 얹는다. 여러 장이면 그 자리에서 펼친다.
    if (producer.logoImages.length === 1) {
      place(producer, producer.logoImages[0].imageUrl)
      return
    }
    setExpandedId((current) => (current === producer.id ? null : producer.id))
  }

  const query = keyword.trim()
  const tooShort = query.length > 0 && query.length < MIN_KEYWORD

  return (
    <div className="space-y-2">
      <input
        value={keyword}
        onChange={(event) => runSearch(event.target.value)}
        placeholder={t('photoCard.logoSearchPlaceholder')}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-xs"
      />

      {results.length > 0 && (
        <ul role="listbox" aria-label={t('photoCard.logoSection')}
          className="di-photo-card-scroll max-h-72 space-y-1 overflow-y-auto">
          {results.map((producer) => {
            const expanded = expandedId === producer.id
            return (
              <li key={producer.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={expanded}
                  onClick={() => handlePick(producer)}
                  className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors ${
                    expanded
                      ? 'border-primary-400 bg-primary-50/60'
                      : 'border-neutral-200 hover:border-primary-400 hover:bg-primary-50/40'
                  }`}
                >
                  <img
                    src={producer.logoImages[0]?.imageUrl ?? ''}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded border border-neutral-100 object-contain"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-semibold text-neutral-700">
                      {producer.nameKo}
                    </span>
                    {producer.nameEn && (
                      <span className="block truncate text-[11px] font-medium text-neutral-500">
                        {producer.nameEn}
                      </span>
                    )}
                  </span>
                  {producer.logoImages.length > 1 && (
                    <span className="shrink-0 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-500">
                      {producer.logoImages.length}
                    </span>
                  )}
                </button>

                {/* 로고가 여러 장인 생산자 — 어떤 버전을 쓸지 그 자리에서 고른다 */}
                {expanded && (
                  <div className="mt-1 grid grid-cols-4 gap-1.5 rounded-lg bg-neutral-50 p-2">
                    {producer.logoImages.map((logo) => (
                      <button
                        key={logo.id}
                        type="button"
                        onClick={() => place(producer, logo.imageUrl)}
                        title={t('photoCard.logoVariantUse')}
                        className="flex aspect-square items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-white hover:border-primary-400"
                      >
                        <img src={logo.imageUrl} alt="" className="h-full w-full object-contain p-1" />
                      </button>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* 검색 전 · 두 글자 미만 · 결과 없음 — 각각 다른 이야기를 해 준다 */}
      {results.length === 0 && !loading && (
        <div className="rounded-lg bg-neutral-50 px-3 py-3">
          <p className="text-[11px] font-medium leading-relaxed text-neutral-500">
            {searched ? t('photoCard.logoSearchEmpty')
              : tooShort ? t('photoCard.logoSearchTooShort')
                : t('photoCard.logoSearchHint')}
          </p>
          <button
            type="button"
            onClick={onUploadInstead}
            className="mt-1.5 text-[11px] font-semibold text-primary-700 hover:underline"
          >
            {t('photoCard.logoUploadInstead')}
          </button>
        </div>
      )}
    </div>
  )
}
