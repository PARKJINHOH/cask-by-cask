import { useState, useRef } from 'react'
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useByobDetail, useByobActions } from '@/domain/byob/hooks/useByob'
import ByobStatusBadge from '@/domain/byob/components/ByobStatusBadge'
import ByobParticipantPanel from '@/domain/byob/components/ByobParticipantPanel'
import ByobCommentSection from '@/domain/byob/components/ByobCommentSection'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import RichContent from '@/shared/components/RichContent'
import { useAuthStore } from '@/domain/auth/store/authStore'
import type { ByobStatus, ApplyByobPayload } from '@/domain/byob/types/byob.types'

const STATUS_OPTIONS: ByobStatus[] = ['OPEN', 'CLOSED', 'CANCELLED']

const STATUS_LABEL_KO: Record<ByobStatus, string> = {
  OPEN: '모집중',
  CLOSED: '모집마감',
  CANCELLED: '취소',
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── 바틀 입력 컴포넌트 (참여 신청용) ─────────────────────────────
interface BottlesInputProps {
  bottles: string[]
  onChange: (b: string[]) => void
}

function BottlesInput({ bottles, onChange }: BottlesInputProps) {
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const add = () => {
    const val = input.trim()
    if (!val || bottles.length >= 10) return
    onChange([...bottles, val])
    setInput('')
    inputRef.current?.focus()
  }

  const remove = (idx: number) => onChange(bottles.filter((_, i) => i !== idx))

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={t('byob.bottlePlaceholder')}
          maxLength={80}
          disabled={bottles.length >= 10}
          className="flex-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm
            focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400
            disabled:bg-neutral-50 disabled:text-neutral-400"
        />
        <button
          type="button"
          onClick={add}
          disabled={!input.trim() || bottles.length >= 10}
          className="px-3 py-2 text-sm font-medium rounded-lg bg-primary-800 text-white
            hover:bg-primary-900 disabled:opacity-40 transition-colors whitespace-nowrap"
        >
          {t('byob.addBottle')}
        </button>
      </div>
      {bottles.length === 0 ? (
        <p className="text-xs text-neutral-400 py-1">{t('byob.hostBottlesEmpty')}</p>
      ) : (
        <ul className="space-y-1">
          {bottles.map((b, idx) => (
            <li key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg text-sm">
              <span className="text-amber-600 flex-shrink-0">🍾</span>
              <span className="flex-1 text-neutral-800 truncate">{b}</span>
              <button type="button" onClick={() => remove(idx)}
                className="flex-shrink-0 text-neutral-400 hover:text-red-500 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
      {bottles.length >= 10 && (
        <p className="text-xs text-amber-600 mt-1">{t('byob.bottleMaxReached')}</p>
      )}
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
export default function ByobDetailPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const byobId = Number(id)
  const listReturnTo =
    typeof location.state === 'object' &&
    location.state !== null &&
    'returnTo' in location.state &&
    typeof location.state.returnTo === 'string'
      ? location.state.returnTo
      : '/community/byob'
  const { user, isLoggedIn } = useAuthStore()

  const { data: byob, isLoading } = useByobDetail(byobId)
  const { applyMutation, cancelApplyMutation, updateStatusMutation, updatePinMutation, deleteMutation } = useByobActions(byobId)

  const [applyStep, setApplyStep] = useState<'idle' | 'form'>('idle')
  const [bottleList, setBottleList] = useState<string[]>([])
  const [memo, setMemo] = useState('')
  const [applyError, setApplyError] = useState('')
  const [showStatusMenu, setShowStatusMenu] = useState(false)

  if (isLoading) {
    return <div className="py-20 text-center text-neutral-400">{t('common.loading')}</div>
  }
  if (!byob) {
    return <div className="py-20 text-center text-neutral-400">{t('common.notFound')}</div>
  }

  const isHost = isLoggedIn && user?.id === byob.hostUserId
  const myParticipant = byob.myParticipant
  const hasApplied = !!myParticipant
  const canApply = isLoggedIn && !isHost && !hasApplied
    && byob.status === 'OPEN'
    && byob.approvedCount < byob.maxParticipants
  const canCancelApply = hasApplied && myParticipant?.status === 'PENDING'
  const canEdit = isHost && byob.approvedCount === 0
  // 공지(고정글) 토글: 주최자 본인이면서 최고관리자/관리자/파트너. 승인자 존재와 무관.
  const canPin = isHost && ['SUPER_ADMIN', 'ADMIN', 'PARTNER'].includes(user?.role ?? '')

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    setApplyError('')
    if (bottleList.length === 0) {
      setApplyError(t('byob.bottleRequired'))
      return
    }
    const payload: ApplyByobPayload = { bottleNames: bottleList }
    if (memo.trim()) payload.memo = memo.trim()
    try {
      await applyMutation.mutateAsync(payload)
      setApplyStep('idle')
      setBottleList([])
      setMemo('')
    } catch {
      setApplyError(t('common.errorOccurred'))
    }
  }

  const handleDelete = async () => {
    const confirmKey = byob.linkedFreePostId ? 'byob.confirmDeleteWithLinked' : 'byob.confirmDelete'
    if (!window.confirm(t(confirmKey))) return
    await deleteMutation.mutateAsync()
    navigate(listReturnTo)
  }

  const handleStatusChange = async (newStatus: ByobStatus) => {
    if (!window.confirm(t('byob.confirmStatusChange', { status: STATUS_LABEL_KO[newStatus] }))) return
    await updateStatusMutation.mutateAsync({ status: newStatus })
    setShowStatusMenu(false)
  }

  const handlePinToggle = async () => {
    await updatePinMutation.mutateAsync({ isPinned: !byob.isPinned })
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <SeoMeta
        title={byob.title}
        description={byob.content.replace(/<[^>]*>/g, '').slice(0, 120)}
        canonical={buildCanonical(`/ko/community/byob/${byobId}`)}
        locale={i18n.language === 'en' ? 'en_US' : 'ko_KR'}
        noindex={byob.status === 'CANCELLED'}
      />

      <Link to={listReturnTo} className="inline-flex items-center gap-1.5 text-sm text-neutral-500
        hover:text-neutral-700 mb-5">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <polyline points="15 18 9 12 15 6" />
        </svg>
        {t('byob.title')}
      </Link>

      {/* 2컬럼 레이아웃: 좌=메인, 우=참여+댓글 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">

        {/* ── 왼쪽: 메인 카드 + 참여자 패널(주최자) ── */}
        <div className="space-y-5">

          {/* 메인 카드 */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <ByobStatusBadge status={byob.status} />
              {isHost && (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setShowStatusMenu((v) => !v)}
                      className="px-3 py-1.5 text-xs font-medium border border-neutral-200 rounded-lg
                        text-neutral-600 hover:bg-neutral-50 transition-colors"
                    >
                      {t('byob.changeStatus')}
                    </button>
                    {showStatusMenu && (
                      <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl
                        shadow-lg border border-neutral-100 py-1 z-10">
                        {STATUS_OPTIONS.filter((s) => s !== byob.status).map((s) => (
                          <div key={s}>
                            <button onClick={() => handleStatusChange(s)}
                              className="w-full text-left px-4 py-2 text-sm text-neutral-700
                                hover:bg-neutral-50 transition-colors">
                              {STATUS_LABEL_KO[s]}
                            </button>
                            {s === 'CLOSED' && (
                              <p className="px-4 pb-2 text-xs text-amber-600 leading-tight flex items-center gap-1">
                                <span>✉</span>
                                <span>{t('byob.closedMsgNote')}</span>
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {canPin && (
                    <button onClick={handlePinToggle} disabled={updatePinMutation.isPending}
                      className={[
                        'px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors disabled:opacity-50',
                        byob.isPinned
                          ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50',
                      ].join(' ')}>
                      {byob.isPinned ? t('board.unpinNotice') : t('board.pinAsNotice')}
                    </button>
                  )}
                  {canEdit && (
                    <>
                      <Link to={`/community/byob/${byobId}/edit`}
                        className="px-3 py-1.5 text-xs font-medium border border-neutral-200 rounded-lg
                          text-neutral-600 hover:bg-neutral-50 transition-colors">
                        {t('byob.edit')}
                      </Link>
                      <button onClick={handleDelete}
                        className="px-3 py-1.5 text-xs font-medium border border-red-200 rounded-lg
                          text-red-500 hover:bg-red-50 transition-colors">
                        {t('byob.deletePost')}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <h1 className="text-2xl font-extrabold text-neutral-950 mb-4 leading-tight">{byob.title}</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 text-sm">
              {/* 모임 날짜 강조 */}
              <div className="sm:col-span-2 flex items-center gap-2.5 bg-primary-50 rounded-xl px-3 py-2.5">
                <svg className="w-4 h-4 text-primary-700 flex-shrink-0" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <div>
                  <span className="text-xs text-primary-600 font-medium block">{t('byob.eventAt')}</span>
                  <span className="text-primary-900 font-semibold">{formatDateTime(byob.eventAt)}</span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="text-neutral-400 flex-shrink-0 min-w-[48px]">{t('byob.location')}</span>
                <span className="text-neutral-800 font-medium">{byob.location}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-neutral-400 flex-shrink-0 min-w-[60px]">{t('byob.address')}</span>
                {isHost ? (
                  <div>
                    <span className="text-neutral-700 font-medium">{byob.address}</span>
                    <p className="text-xs text-amber-700 mt-0.5 flex items-center gap-1">
                      <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                      {t('byob.addressMasked')}
                    </p>
                  </div>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 flex-shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    <span className="tracking-widest text-neutral-300 font-mono">*****</span>
                    <span className="text-xs text-amber-700 font-medium ml-1">{t('byob.addressMasked')}</span>
                  </span>
                )}
              </div>
              <div className="flex items-start gap-2 sm:col-span-2">
                <span className="text-neutral-400 flex-shrink-0 min-w-[48px]">{t('byob.period')}</span>
                <span className="text-neutral-700">
                  {formatDateTime(byob.recruitStartAt)} ~ {formatDateTime(byob.recruitEndAt)}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-neutral-400 flex-shrink-0 min-w-[48px]">{t('byob.participants')}</span>
                <span className={`font-semibold ${byob.approvedCount >= byob.maxParticipants ? 'text-red-500' : 'text-neutral-800'}`}>
                  {t('byob.participantsCount', { count: byob.approvedCount, max: byob.maxParticipants })}
                  {byob.pendingCount > 0 && (
                    <span className="ml-1 text-xs text-yellow-600">(대기 {byob.pendingCount}명)</span>
                  )}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-neutral-400 flex-shrink-0 min-w-[48px]">{t('byob.hostNickname')}</span>
                <span className="text-neutral-800 font-medium">{byob.hostNickname}</span>
              </div>
            </div>

            {/* 모임 소개 */}
            {byob.content?.trim().startsWith('<') ? (
              <RichContent
                className="prose prose-base max-w-none text-neutral-800 leading-relaxed border-t border-neutral-100 pt-4 notice-content"
                html={byob.content}
              />
            ) : (
              <div className="text-base text-neutral-800 whitespace-pre-wrap leading-relaxed border-t border-neutral-100 pt-4">
                {byob.content}
              </div>
            )}

            {/* 주최자 바틀 목록 */}
            {byob.hostBottles && byob.hostBottles.length > 0 && (
              <div className="mt-5 pt-5 border-t border-neutral-100">
                <p className="text-sm font-bold text-neutral-700 mb-3">{t('byob.hostBottleList')}</p>
                <div className="flex flex-wrap gap-2">
                  {byob.hostBottles.map((b, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 text-sm px-3.5 py-1.5
                      bg-amber-50 text-amber-900 rounded-full border border-amber-200 font-medium">
                      🍾 {b}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 주최자 전용: 모집마감 안내 배너 */}
          {isHost && byob.status === 'OPEN' && (
            <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200
              rounded-xl px-4 py-3">
              <span className="text-base flex-shrink-0">✉</span>
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong className="font-semibold">{t('byob.closedMsgNoteTitle')}</strong>
                {' '}{t('byob.closedMsgNote')}
              </p>
            </div>
          )}

          {/* 주최자 전용: 참여자 패널 */}
          {isHost && <ByobParticipantPanel byobId={byobId} />}
        </div>

        {/* ── 오른쪽: 참여 신청 + 댓글 ── */}
        <div className="space-y-5 lg:sticky lg:top-24">

          {/* 참여 신청 카드 */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-5">

            {/* 내 신청 상태 */}
            {isLoggedIn && hasApplied && myParticipant && (
              <div className="mb-4 pb-4 border-b border-neutral-100">
                <p className="text-sm font-medium text-neutral-700 mb-1">{t('byob.myStatus')}</p>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-semibold ${
                    myParticipant.status === 'APPROVED' ? 'text-green-700' :
                    myParticipant.status === 'PENDING'  ? 'text-yellow-600' :
                    'text-red-500'
                  }`}>
                    {myParticipant.status === 'APPROVED' && t('byob.applyApproved')}
                    {myParticipant.status === 'PENDING'  && t('byob.applyPending')}
                    {myParticipant.status === 'REJECTED' && t('byob.applyRejected')}
                    {myParticipant.status === 'REMOVED'  && t('byob.applyRemoved')}
                  </span>
                  {myParticipant.removedReason && (
                    <span className="text-xs text-neutral-500">
                      ({t('byob.removedReason')}: {myParticipant.removedReason})
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 신청 폼 */}
            {isLoggedIn && !isHost && applyStep === 'form' ? (
              <form onSubmit={handleApply} className="space-y-4">
                {/* 가져올 술 (복수) */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    {t('byob.bottle')} <span className="text-red-500">*</span>
                    <span className="ml-1 text-xs text-neutral-400 font-normal">(최대 10병)</span>
                  </label>
                  <BottlesInput bottles={bottleList} onChange={setBottleList} />
                </div>

                {/* 주최자에게 한마디 */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    {t('byob.memo')}
                  </label>
                  <textarea
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    rows={2}
                    placeholder={t('byob.memoPlaceholder')}
                    maxLength={200}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm resize-none
                      focus:outline-none focus:ring-2 focus:ring-primary-300"
                  />
                  <p className="mt-0.5 text-xs text-neutral-400 flex items-center gap-1">
                    <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    {t('byob.memoHostOnly')}
                  </p>
                </div>

                {applyError && <p className="text-xs text-red-600">{applyError}</p>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setApplyStep('idle'); setBottleList([]); setMemo('') }}
                    className="flex-1 py-2 text-sm font-medium border border-neutral-200 rounded-lg
                      text-neutral-600 hover:bg-neutral-50">
                    {t('common.cancel')}
                  </button>
                  <button type="submit" disabled={applyMutation.isPending}
                    className="flex-1 py-2 text-sm font-semibold rounded-lg bg-primary-800 text-white
                      hover:bg-primary-900 disabled:opacity-50">
                    {t('byob.applyBtn')}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-2">
                {canApply && (
                  <button onClick={() => setApplyStep('form')}
                    className="w-full py-2.5 text-sm font-semibold rounded-lg bg-primary-800 text-white
                      hover:bg-primary-900 transition-colors">
                    {t('byob.applyBtn')}
                  </button>
                )}
                {canCancelApply && (
                  <button onClick={() => cancelApplyMutation.mutate()} disabled={cancelApplyMutation.isPending}
                    className="w-full py-2.5 text-sm font-medium rounded-lg border border-neutral-200
                      text-neutral-600 hover:bg-neutral-50 disabled:opacity-50">
                    {t('byob.cancelApply')}
                  </button>
                )}
                {!isLoggedIn && byob.status === 'OPEN' && (
                  <div className="text-center">
                    <p className="text-sm text-neutral-500 mb-1">{t('byob.loginRequired')}</p>
                    <Link to="/login" className="text-sm text-primary-800 font-medium hover:underline">
                      {t('nav.login')}
                    </Link>
                  </div>
                )}
                {isLoggedIn && !isHost && !canApply && !hasApplied && byob.status === 'OPEN'
                  && byob.approvedCount >= byob.maxParticipants && (
                  <p className="text-sm text-red-500 font-medium text-center">{t('byob.cannotApplyFull')}</p>
                )}
                {isLoggedIn && !isHost && !hasApplied && byob.status !== 'OPEN' && (
                  <p className="text-sm text-neutral-400 text-center">{t('byob.cannotApplyNotOpen')}</p>
                )}
              </div>
            )}
          </div>

          {/* 댓글 섹션 (로그인한 모든 사용자) */}
          {isLoggedIn && user && (
            <ByobCommentSection
              byobId={byobId}
              myUserId={user.id}
              hostUserId={byob.hostUserId}
              isHost={isHost}
              hasAccess={true}
            />
          )}
          {!isLoggedIn && (
            <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 text-center">
              <p className="text-sm text-neutral-500">{t('byob.commentLoginRequired')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
