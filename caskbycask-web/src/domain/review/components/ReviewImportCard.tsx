import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { parseReviewText, type ImportField, type ReviewImportPlan } from '../utils/reviewImportParser'
import { reviewImportApi } from '../api/reviewImportApi'

/**
 * 다른 커뮤니티에 써 둔 자기 리뷰를 붙여넣거나 공개 게시글 링크로 불러와 폼을 채우는 패널.
 *
 * <b>저장하지 않는다.</b> 입력칸만 채우고 확인·수정·저장은 사람이 한다 —
 * 관리자 주류 등록의 `SpiritJsonImportCard` 와 같은 규칙이다.
 * 무엇이 들어갔고 무엇이 걸렸는지 반드시 보여준다. 조용히 일부만 들어가면 틀린 리뷰가 그대로 저장된다.
 *
 * <b>실험 기능이다.</b> 리뷰 서식은 사람마다 제각각이라 규칙 파서가 늘 맞히지는 못한다.
 * 그래서 화면 한복판이 아니라 헤더의 작은 아이콘 뒤에 두고, 실패해도 폼을 건드리지 않는다.
 */

interface Props {
  open: boolean
  onClose: () => void
  /** 지금 리뷰를 쓰는 주류 이름 — 본문에 없으면 알린다(막지는 않는다) */
  spiritName?: string
  /** 폼에 이미 입력된 값이 있는지 — 덮어쓰기 확인을 띄울지 정한다 */
  hasValues: boolean
  onApply: (plan: ReviewImportPlan, sourceUrl: string | null) => void
  /** 직접 입력하기 — 패널을 닫고 향 노트 칸으로 보낸다 */
  onManualInput: () => void
}

type Tab = 'paste' | 'link'

/** 파싱하기 전 원문을 잃지 않도록 남겨 둔다. 저장에 성공하면 폼 쪽에서 지운다. */
export const REVIEW_IMPORT_DRAFT_KEY = 'di_review_import_draft'

function readDraft(): string {
  try {
    return window.localStorage.getItem(REVIEW_IMPORT_DRAFT_KEY) ?? ''
  } catch {
    return ''
  }
}

function writeDraft(value: string) {
  try {
    if (value.trim()) window.localStorage.setItem(REVIEW_IMPORT_DRAFT_KEY, value)
    else window.localStorage.removeItem(REVIEW_IMPORT_DRAFT_KEY)
  } catch {
    /* 사생활 보호 모드 등에서 저장이 막혀도 기능 자체는 그대로 쓸 수 있어야 한다 */
  }
}

/** 헤더 우측에 두는 작은 열기 버튼. 실험 기능이라 제목 옆에 크게 두지 않는다. */
export function ReviewImportButton({ onClick, active }: { onClick: () => void; active: boolean }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      title={t('review.import.openLabel')}
      aria-label={t('review.import.openLabel')}
      className={`flex flex-shrink-0 items-center gap-1 rounded-lg border px-2 py-1.5 transition-colors ${
        active
          ? 'border-amber-300 bg-amber-50 text-amber-700'
          : 'border-neutral-200 text-neutral-400 hover:border-neutral-300 hover:text-neutral-600'
      }`}
    >
      {/* 문서 안으로 내려받는 모양 — 밖에서 가져와 칸을 채운다는 뜻 */}
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 3v8m0 0 3-3m-3 3-3-3" stroke="currentColor" strokeWidth="1.6"
          strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 13v2a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.6"
          strokeLinecap="round" />
      </svg>
      <span className="text-[10px] font-bold leading-none">{t('review.import.experimental')}</span>
    </button>
  )
}

export default function ReviewImportCard({
  open, onClose, spiritName, hasValues, onApply, onManualInput,
}: Props) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('paste')
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [keepSource, setKeepSource] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [plan, setPlan] = useState<ReviewImportPlan | null>(null)
  /** 링크로 가져온 경우에만 채워진다 — 총평 끝에 남길 원문 주소 */
  const [fetchedUrl, setFetchedUrl] = useState<string | null>(null)

  // 열 때마다 지난번 원문을 되살린다. 파싱에 실패해 패널을 닫아도 붙여넣은 글이 사라지지 않는다.
  useEffect(() => {
    if (!open) return
    setText((current) => current || readDraft())
  }, [open])

  if (!open) return null

  const reset = () => {
    setError('')
    setPlan(null)
  }

  const runParse = (body: string, sourceUrl: string | null, title?: string) => {
    const parsed = parseReviewText(body, { spiritName, title })
    setPlan(parsed)
    if (parsed.outcome !== 'ok') return

    if (hasValues && !window.confirm(t('review.import.confirmOverwrite'))) return
    onApply(parsed, keepSource ? sourceUrl : null)
  }

  const handlePaste = () => {
    reset()
    writeDraft(text)
    setFetchedUrl(null)
    runParse(text, null)
  }

  const handleLink = async () => {
    reset()
    if (!url.trim()) return
    setBusy(true)
    try {
      const response = await reviewImportApi.fetch(url.trim())
      const data = response.data.data
      if (!data?.content?.trim()) {
        setError(t('review.import.error.empty'))
        return
      }
      setText(data.content)
      writeDraft(data.content)
      setFetchedUrl(data.canonicalUrl)
      runParse(data.content, data.canonicalUrl, data.title)
    } catch {
      // 원문 사이트가 막거나 형식을 바꾸면 여기로 온다 — 붙여넣기가 원래의 주 경로다.
      setError(t('review.import.error.fetchFailed'))
      setTab('paste')
    } finally {
      setBusy(false)
    }
  }

  const clearAll = () => {
    setText('')
    setUrl('')
    setFetchedUrl(null)
    writeDraft('')
    reset()
  }

  return (
    <div className="space-y-3 rounded-2xl border border-amber-200/70 bg-amber-50/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-bold text-neutral-900">{t('review.import.title')}</span>
            <span className="rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {t('review.import.experimental')}
            </span>
            <span className="rounded-md bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
              {t('review.import.noSaveBadge')}
            </span>
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-600">
            {t('review.import.description')}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-700">
            {t('review.import.experimentalNote')}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('review.import.close')}
          className="flex-shrink-0 rounded-md p-1 text-neutral-400 transition-colors hover:bg-white hover:text-neutral-700"
        >
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="flex gap-1 rounded-lg bg-white p-1 ring-1 ring-neutral-200">
        {(['paste', 'link'] as Tab[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => { setTab(value); reset() }}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === value ? 'bg-amber-500 text-white' : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {t(value === 'paste' ? 'review.import.tabPaste' : 'review.import.tabLink')}
          </button>
        ))}
      </div>

      {tab === 'paste' ? (
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={8}
          spellCheck={false}
          placeholder={t('review.import.pastePlaceholder')}
          className="w-full resize-y overflow-y-auto rounded-lg border border-neutral-200 bg-white px-3 py-2
            text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      ) : (
        <div className="space-y-2">
          <input
            type="url"
            inputMode="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            // 이 패널은 리뷰 폼 <form> 안에 있다. 막지 않으면 주소를 넣고 Enter 를 누른 순간
            // 리뷰가 제출돼 검증 오류 토스트가 뜬다 — 사용자가 기대하는 것은 '가져오기'다.
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              if (!busy && url.trim()) void handleLink()
            }}
            placeholder={t('review.import.linkPlaceholder')}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs
              focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <p className="text-[11px] leading-relaxed text-neutral-500">
            {t('review.import.linkSupported')}
          </p>
        </div>
      )}

      <label className="flex items-center gap-2 text-[11px] text-neutral-600">
        <input
          type="checkbox"
          checked={keepSource}
          onChange={(event) => setKeepSource(event.target.checked)}
          className="h-3.5 w-3.5 accent-amber-500"
        />
        {t('review.import.keepSourceLink')}
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={tab === 'paste' ? handlePaste : () => void handleLink()}
          disabled={busy || (tab === 'paste' ? !text.trim() : !url.trim())}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition-colors
            hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? t('review.import.loading') : t('review.import.submit')}
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-500
            transition-colors hover:border-neutral-300 hover:text-neutral-700"
        >
          {t('review.import.clear')}
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}

      {plan && plan.outcome !== 'ok' && (
        <BlockedNotice plan={plan} onManualInput={() => { onClose(); onManualInput() }} />
      )}

      {plan?.outcome === 'ok' && (
        <ImportReport plan={plan} sourceUrl={keepSource ? fetchedUrl : null} />
      )}
    </div>
  )
}

/**
 * 비교 리뷰거나 향·맛·피니시 구분이 없는 글 — 폼을 건드리지 않고 왜 그런지만 알린다.
 * 잘못 나눠 채우는 것보다 직접 쓰게 하는 편이 낫다.
 */
function BlockedNotice({ plan, onManualInput }: { plan: ReviewImportPlan; onManualInput: () => void }) {
  const { t } = useTranslation()
  const isComparison = plan.outcome === 'comparison'

  return (
    <div className={`space-y-2 rounded-xl px-3 py-3 ring-1 ${
      isComparison ? 'bg-amber-100/60 ring-amber-300' : 'bg-white ring-neutral-200'
    }`}>
      <p className="text-xs font-bold text-neutral-800">
        {t(isComparison ? 'review.import.blocked.comparisonTitle' : 'review.import.blocked.unlabeledTitle')}
      </p>
      <p className="text-[11px] leading-relaxed text-neutral-600">
        {t(isComparison ? 'review.import.blocked.comparisonBody' : 'review.import.blocked.unlabeledBody')}
      </p>
      <button
        type="button"
        onClick={onManualInput}
        className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-[11px] font-semibold
          text-neutral-700 transition-colors hover:border-neutral-400"
      >
        {t('review.import.blocked.manualAction')}
      </button>
    </div>
  )
}

const FIELD_LABEL_KEY: Record<ImportField, string> = {
  nose: 'review.nose',
  taste: 'review.taste',
  finish: 'review.finish',
  comment: 'review.comment',
  score: 'review.import.field.score',
  general: 'review.import.field.general',
}

function ImportReport({ plan, sourceUrl }: { plan: ReviewImportPlan; sourceUrl: string | null }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-3 rounded-xl bg-white p-3 ring-1 ring-neutral-200">
      <p className="text-xs font-semibold text-neutral-700">
        {t('review.import.appliedCount', { count: plan.applied.length })}
      </p>

      {plan.applied.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {plan.applied.map((field) => (
            <span
              key={field}
              className="rounded-md bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-600 ring-1 ring-neutral-200"
            >
              {t(FIELD_LABEL_KEY[field])}
            </span>
          ))}
        </div>
      )}

      {sourceUrl && (
        <p className="truncate text-[11px] text-neutral-500">
          {t('review.import.sourceAppended', { url: sourceUrl })}
        </p>
      )}

      {plan.warnings.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-amber-700">
            {t('review.import.warningCount', { count: plan.warnings.length })}
          </p>
          <ul className="space-y-1">
            {plan.warnings.map((warning, index) => (
              <li key={`${warning.code}-${index}`} className="text-[11px] leading-relaxed text-amber-700">
                <b>{t(FIELD_LABEL_KEY[warning.field])}</b>
                {' — '}
                {t(`review.import.warn.${warning.code}`, warning.params)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
