import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useByobDetail, useByobActions } from '@/domain/byob/hooks/useByob'
import PostEditor from '@/domain/community/components/PostEditor'
import SeoMeta from '@/shared/components/SeoMeta'
import FormFieldLabel, { RequiredFieldsNotice, RequiredMark } from '@/shared/components/FormFieldLabel'
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog'
import { useUnsavedChangesGuard } from '@/shared/hooks/useUnsavedChangesGuard'

function toLocalDatetimeValue(iso: string) {
  if (!iso) return ''
  return iso.slice(0, 16)
}

// yyyy가 6자리로 중복 입력되는 브라우저 버그 방지
function fixDatetimeYear(val: string) {
  if (!val) return val
  const dashIdx = val.indexOf('-')
  if (dashIdx > 4) return val.slice(dashIdx - 4)
  return val
}

function openPicker(e: React.MouseEvent<HTMLInputElement>) {
  try { (e.currentTarget as HTMLInputElement).showPicker() } catch { /* fallback: native focus */ }
}

// ── 주최자 바틀 목록 입력 컴포넌트 ────────────────────────────
interface HostBottlesInputProps {
  bottles: string[]
  onChange: (bottles: string[]) => void
}

function HostBottlesInput({ bottles, onChange }: HostBottlesInputProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const add = () => {
    const val = input.trim()
    if (!val) return
    onChange([...bottles, val])
    setInput('')
    inputRef.current?.focus()
  }

  const remove = (idx: number) => onChange(bottles.filter((_, i) => i !== idx))

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); add() }
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-5 h-fit">
      <h3 className="text-sm font-semibold text-neutral-900 mb-1">{t('byob.hostBottleList')}</h3>
      <p className="text-xs text-neutral-400 mb-4">{t('byob.hostBottleListDesc')}</p>

      <div className="flex gap-2 mb-3">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('byob.bottleInputPlaceholder')}
          maxLength={100}
          className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm
            focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
        />
        <button
          type="button"
          onClick={add}
          disabled={!input.trim()}
          className="px-3 py-2 text-sm font-medium rounded-lg bg-primary-800 text-white
            hover:bg-primary-900 disabled:opacity-40 transition-colors whitespace-nowrap"
        >
          {t('byob.addBottle')}
        </button>
      </div>

      {bottles.length === 0 ? (
        <p className="text-xs text-neutral-400 text-center py-4">{t('byob.hostBottlesEmpty')}</p>
      ) : (
        <ul className="space-y-1.5">
          {bottles.map((b, idx) => (
            <li
              key={idx}
              className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg text-sm"
            >
              <span className="text-amber-600 flex-shrink-0">🍾</span>
              <span className="flex-1 text-neutral-800 truncate">{b}</span>
              <button
                type="button"
                onClick={() => remove(idx)}
                className="flex-shrink-0 text-neutral-400 hover:text-red-500 transition-colors"
                aria-label="제거"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── 메인 폼 페이지 ─────────────────────────────────────────────
export default function ByobFormPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const byobId = isEdit ? Number(id) : 0

  const { data: existing } = useByobDetail(byobId)
  const { createMutation, updateMutation } = useByobActions(byobId)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [location, setLocation] = useState('')
  const [address, setAddress] = useState('')
  const [eventAt, setEventAt] = useState('')
  const [recruitStartAt, setRecruitStartAt] = useState(() => {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
  })
  const [recruitEndAt, setRecruitEndAt] = useState('')
  const [maxParticipants, setMaxParticipants] = useState(10)
  const [hostBottles, setHostBottles] = useState<string[]>([])
  const [exposeToFreeBoard, setExposeToFreeBoard] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (existing && isEdit) {
      setTitle(existing.title)
      setContent(existing.content)
      setLocation(existing.location)
      setAddress(existing.address)
      setEventAt(toLocalDatetimeValue(existing.eventAt))
      setRecruitStartAt(toLocalDatetimeValue(existing.recruitStartAt))
      setRecruitEndAt(toLocalDatetimeValue(existing.recruitEndAt))
      setMaxParticipants(existing.maxParticipants)
      setHostBottles(existing.hostBottles ?? [])
    }
  }, [existing, isEdit])

  const isPending = createMutation.isPending || updateMutation.isPending

  // ── 이탈 방지 ──
  // 수정 모드는 기존 값이 실린 뒤부터 비교해야 "열자마자 수정됨"이 되지 않는다.
  const baselineRef = useRef({ title: '', content: '' })
  const [baselineReady, setBaselineReady] = useState(!isEdit)
  useEffect(() => {
    if (baselineReady || !existing) return
    const timer = window.setTimeout(() => {
      baselineRef.current = { title, content }
      setBaselineReady(true)
    }, 400)
    return () => window.clearTimeout(timer)
  }, [baselineReady, existing, title, content])

  const [submitted, setSubmitted] = useState(false)
  const isDirty = !submitted && (isEdit
    ? baselineReady && (title !== baselineRef.current.title || content !== baselineRef.current.content)
    : title.trim().length > 0 || content.replace(/<[^>]*>/g, '').trim().length > 0)

  const { leaveDialogOpen, guard, cancelLeave, confirmLeave } = useUnsavedChangesGuard({
    dirty: isDirty,
    onLeave: () => navigate('/community/byob'),
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim() || !content.trim() || !location.trim() || !address.trim()
      || !eventAt || !recruitStartAt || !recruitEndAt) {
      setError('모든 필수 항목을 입력해주세요.')
      return
    }
    if (new Date(recruitEndAt) <= new Date(recruitStartAt)) {
      setError('모집 종료일은 시작일보다 이후여야 합니다.')
      return
    }

    const base = {
      title: title.trim(),
      content: content.trim(),
      location: location.trim(),
      address: address.trim(),
      eventAt: new Date(eventAt).toISOString(),
      recruitStartAt: new Date(recruitStartAt).toISOString(),
      recruitEndAt: new Date(recruitEndAt).toISOString(),
      maxParticipants,
      hostBottles,
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync(base)
        // 저장이 끝났으면 지킬 내용이 없다 — 이탈 확인창이 뜨지 않게 먼저 내린다.
        setSubmitted(true)
        navigate(`/community/byob/${byobId}`)
      } else {
        const res = await createMutation.mutateAsync({ ...base, exposeToFreeBoard })
        const newId = res.data.data?.id
        setSubmitted(true)
        navigate(newId ? `/community/byob/${newId}` : '/community/byob')
      }
    } catch {
      setError('저장 중 오류가 발생했습니다.')
    }
  }

  const inputCls = `w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm
    focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400`

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <SeoMeta title={isEdit ? t('byob.edit') : t('byob.write')} noindex />
      <UnsavedChangesDialog
        open={leaveDialogOpen}
        onStay={cancelLeave}
        onDiscard={() => { void confirmLeave() }}
      />

      <div className="mb-6 flex items-end justify-between gap-4">
        <h1 className="text-2xl font-bold text-neutral-900">{isEdit ? t('byob.edit') : t('byob.write')}</h1>
        <RequiredFieldsNotice />
      </div>

      <form onSubmit={handleSubmit}>
        {/* PC: 2컬럼 (좌: 메인 폼, 우: 바틀 목록) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">

          {/* ── 왼쪽: 메인 폼 ── */}
          <div className="space-y-5">

            {/* 제목 */}
            <div>
              <FormFieldLabel required className="mb-1">{t('byob.formTitle')}</FormFieldLabel>
              <input required value={title} onChange={(e) => setTitle(e.target.value)}
                maxLength={100} className={inputCls} />
            </div>

            {/* 모임 소개 */}
            <div>
              <p className="mb-1.5 text-sm font-medium text-neutral-700">{t('byob.formContent')}<RequiredMark /></p>
              <PostEditor
                value={content}
                onChange={setContent}
                placeholder={t('byob.formContentPlaceholder')}
              />
            </div>

            {/* 장소명 + 상세 주소 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FormFieldLabel required className="mb-1">{t('byob.formLocation')}</FormFieldLabel>
                <input required value={location} onChange={(e) => setLocation(e.target.value)}
                  maxLength={100} placeholder="서울특별시 용산구 원효로64길" className={inputCls} />
              </div>
              <div>
                <FormFieldLabel required className="mb-1">{t('byob.formAddress')}</FormFieldLabel>
                <input required value={address} onChange={(e) => setAddress(e.target.value)}
                  maxLength={200} placeholder="123동 4567호" className={inputCls} />
                <p className="mt-1 text-xs text-amber-600 flex items-start gap-1">
                  <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  {t('byob.formAddressHint')}
                </p>
              </div>
            </div>

            {/* 모임 날짜 */}
            <div>
              <FormFieldLabel required className="mb-1">{t('byob.formEventAt')}</FormFieldLabel>
              <input required type="datetime-local" value={eventAt}
                onChange={(e) => setEventAt(fixDatetimeYear(e.target.value))}
                onClick={openPicker}
                lang={i18n.language}
                max="9999-12-31T23:59"
                className={`${inputCls} w-full sm:w-64 cursor-pointer`} />
            </div>

            {/* 모집 기간 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FormFieldLabel required className="mb-1">{t('byob.formRecruitStart')}</FormFieldLabel>
                <input required type="datetime-local" value={recruitStartAt}
                  onChange={(e) => setRecruitStartAt(fixDatetimeYear(e.target.value))}
                  onClick={openPicker}
                  lang={i18n.language}
                  max="9999-12-31T23:59"
                  className={`${inputCls} cursor-pointer`} />
              </div>
              <div>
                <FormFieldLabel required className="mb-1">{t('byob.formRecruitEnd')}</FormFieldLabel>
                <input required type="datetime-local" value={recruitEndAt}
                  onChange={(e) => setRecruitEndAt(fixDatetimeYear(e.target.value))}
                  onClick={openPicker}
                  lang={i18n.language}
                  max="9999-12-31T23:59"
                  className={`${inputCls} cursor-pointer`} />
              </div>
            </div>

            {/* 최대 인원 */}
            <div>
              <FormFieldLabel required className="mb-1">{t('byob.formMaxParticipants')}</FormFieldLabel>
              <input required type="number" value={maxParticipants}
                onChange={(e) => setMaxParticipants(Math.max(2, Math.min(100, Number(e.target.value))))}
                min={2} max={100} className="w-32 px-3 py-2 border border-neutral-300 rounded-lg text-sm
                  focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400" />
            </div>

            {/* 자유게시판 노출 (신규만) */}
            {!isEdit && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={exposeToFreeBoard}
                    onChange={(e) => setExposeToFreeBoard(e.target.checked)}
                    className="w-4 h-4 accent-primary-800" />
                  <span className="text-sm font-medium text-neutral-800">{t('byob.exposeToFreeBoard')}</span>
                </label>
                <p className="text-xs text-neutral-500 mt-1 ml-7">{t('byob.exposeFreeboardHelp')}</p>
              </div>
            )}

            {/* 모바일: 바틀 목록 (lg 미만에서 여기 위치) */}
            <div className="lg:hidden">
              <HostBottlesInput bottles={hostBottles} onChange={setHostBottles} />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {/* 액션 */}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => guard(() => navigate(-1))}
                className="flex-1 min-h-11 py-2.5 text-sm font-medium border border-neutral-200 rounded-lg
                  text-neutral-600 hover:bg-neutral-50 transition-colors">
                {t('common.cancel')}
              </button>
              <button type="submit" disabled={isPending}
                className="flex-1 min-h-11 py-2.5 text-sm font-semibold rounded-lg bg-primary-800 text-white
                  hover:bg-primary-900 disabled:opacity-50 transition-colors">
                {isPending ? t('common.saving') : (isEdit ? t('common.save') : t('byob.write'))}
              </button>
            </div>
          </div>

          {/* ── 오른쪽: 주최자 바틀 목록 (PC only) ── */}
          <div className="hidden lg:block sticky top-32">
            <HostBottlesInput bottles={hostBottles} onChange={setHostBottles} />
          </div>

        </div>
      </form>
    </div>
  )
}
