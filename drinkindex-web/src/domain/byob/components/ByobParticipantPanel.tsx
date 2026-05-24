import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useByobParticipants, useByobActions } from '../hooks/useByob'
import type { ByobParticipant, ParticipantStatus } from '../types/byob.types'

const STATUS_LABEL: Record<ParticipantStatus, string> = {
  PENDING:  '대기',
  APPROVED: '승인',
  REJECTED: '거절',
  REMOVED:  '제외',
}

const STATUS_CLS: Record<ParticipantStatus, string> = {
  PENDING:  'text-yellow-600 bg-yellow-50',
  APPROVED: 'text-green-700 bg-green-50',
  REJECTED: 'text-red-600 bg-red-50',
  REMOVED:  'text-neutral-400 bg-neutral-50',
}

interface Props {
  byobId: number
}

export default function ByobParticipantPanel({ byobId }: Props) {
  const { t } = useTranslation()
  const { data: participants = [] } = useByobParticipants(byobId, true)
  const { approveMutation, rejectMutation, removeMutation } = useByobActions(byobId)
  const [removeTarget, setRemoveTarget] = useState<ByobParticipant | null>(null)
  const [removedReason, setRemovedReason] = useState('')
  const [rejectTarget, setRejectTarget] = useState<ByobParticipant | null>(null)
  const [rejectedReason, setRejectedReason] = useState('')

  const handleRemove = async () => {
    if (!removeTarget || !removedReason.trim()) return
    await removeMutation.mutateAsync({ pid: removeTarget.id, payload: { removedReason: removedReason.trim() } })
    setRemoveTarget(null)
    setRemovedReason('')
  }

  const handleReject = async () => {
    if (!rejectTarget || !rejectedReason.trim()) return
    await rejectMutation.mutateAsync({ pid: rejectTarget.id, payload: { rejectedReason: rejectedReason.trim() } })
    setRejectTarget(null)
    setRejectedReason('')
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-5">
      <h3 className="text-base font-semibold text-neutral-900 mb-4">{t('byob.hostPanel')}</h3>

      {participants.length === 0 ? (
        <p className="text-sm text-neutral-400">{t('byob.hostPanelEmpty')}</p>
      ) : (
        <div className="space-y-3">
          {participants.map((p) => (
            <div key={p.id} className="flex items-start gap-3 p-3 bg-neutral-50 rounded-xl">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-neutral-800">{p.nickname}</span>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${STATUS_CLS[p.status]}`}>
                    {STATUS_LABEL[p.status]}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mb-0.5">
                  {p.bottleNames.map((b, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 bg-amber-50 text-amber-800 rounded-full">
                      🍾 {b}
                    </span>
                  ))}
                </div>
                {p.memo && <p className="text-xs text-neutral-500 line-clamp-2">{p.memo}</p>}
                <p className="text-xs text-neutral-400 mt-1">
                  {t('byob.appliedAt')}: {new Date(p.appliedAt).toLocaleDateString('ko-KR')}
                </p>
              </div>

              {p.status === 'PENDING' && (
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => approveMutation.mutate(p.id)}
                    disabled={approveMutation.isPending}
                    className="px-3 py-1 text-xs font-medium rounded-lg bg-green-600 text-white
                      hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {t('byob.approve')}
                  </button>
                  <button
                    onClick={() => setRejectTarget(p)}
                    className="px-3 py-1 text-xs font-medium rounded-lg bg-red-500 text-white
                      hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    {t('byob.reject')}
                  </button>
                </div>
              )}

              {p.status === 'APPROVED' && (
                <button
                  onClick={() => setRemoveTarget(p)}
                  className="px-3 py-1 text-xs font-medium rounded-lg border border-neutral-300
                    text-neutral-600 hover:bg-neutral-100 transition-colors flex-shrink-0"
                >
                  {t('byob.remove')}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h4 className="text-base font-semibold text-neutral-900 mb-1">
              {rejectTarget.nickname}{t('byob.rejectModalTitle')}
            </h4>
            <textarea
              value={rejectedReason}
              onChange={(e) => setRejectedReason(e.target.value)}
              rows={3}
              placeholder={t('byob.rejectReasonPlaceholder')}
              className="w-full mt-3 px-3 py-2 border border-neutral-200 rounded-lg text-sm resize-none
                focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setRejectTarget(null); setRejectedReason('') }}
                className="flex-1 py-2 text-sm font-medium border border-neutral-200 rounded-lg
                  text-neutral-600 hover:bg-neutral-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectedReason.trim() || rejectMutation.isPending}
                className="flex-1 py-2 text-sm font-semibold rounded-lg bg-red-500 text-white
                  hover:bg-red-600 disabled:opacity-50"
              >
                {t('byob.reject')}
              </button>
            </div>
          </div>
        </div>
      )}

      {removeTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h4 className="text-base font-semibold text-neutral-900 mb-1">
              {removeTarget.nickname}님 제외
            </h4>
            <textarea
              value={removedReason}
              onChange={(e) => setRemovedReason(e.target.value)}
              rows={3}
              placeholder={t('byob.removeReasonPlaceholder')}
              className="w-full mt-3 px-3 py-2 border border-neutral-200 rounded-lg text-sm resize-none
                focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setRemoveTarget(null); setRemovedReason('') }}
                className="flex-1 py-2 text-sm font-medium border border-neutral-200 rounded-lg
                  text-neutral-600 hover:bg-neutral-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleRemove}
                disabled={!removedReason.trim() || removeMutation.isPending}
                className="flex-1 py-2 text-sm font-semibold rounded-lg bg-red-500 text-white
                  hover:bg-red-600 disabled:opacity-50"
              >
                {t('byob.remove')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
