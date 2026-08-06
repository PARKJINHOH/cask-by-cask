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
 * 고른 로고는 편집기의 주류 정보에 실어 둔다. 카드의 로고 요소(source=PRODUCER_LOGO)가
 * 그 값을 보고 그리기 때문에, 주류를 따로 고르지 않아도 로고만 얹을 수 있다.
 */
export default function ProducerLogoPicker({ editor, onUploadInstead }: Props) {
  const { t } = useTranslation()
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<Producer[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)

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

  const place = (producer: Producer) => {
    if (!producer.logoImageUrl) return
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
      producerLogoUrl: producer.logoImageUrl,
    }))
    editor.addLayer('IMAGE', { source: 'PRODUCER_LOGO', widthRatio: 0.16 })
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
          className="di-photo-card-scroll max-h-64 space-y-1 overflow-y-auto">
          {results.map((producer) => (
            <li key={producer.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => place(producer)}
                className="flex w-full items-center gap-2 rounded-lg border border-neutral-200 px-2 py-1.5 text-left transition-colors hover:border-primary-400 hover:bg-primary-50/40"
              >
                <img
                  src={producer.logoImageUrl ?? ''}
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
              </button>
            </li>
          ))}
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
