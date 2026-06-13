import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePoll, usePostActions } from '../hooks/usePostDetail'
import type { PollDetail } from '../types/community.types'
import { useAuthStore } from '@/domain/auth/store/authStore'

interface Props {
  postId: number
  pollSummary: PollDetail
}

export default function PostPollWidget({ postId, pollSummary }: Props) {
  const { t } = useTranslation()
  const { isLoggedIn } = useAuthStore()
  const { data: poll } = usePoll(postId, isLoggedIn)
  const { voteMutation } = usePostActions(postId)

  // 투표 데이터: 로그인 시 full poll (myVotedOptionIds), 비로그인 시 summary
  const pollData = poll ?? pollSummary
  const myVoted = poll?.myVotedOptionIds ?? null
  const hasVoted = myVoted !== null && myVoted.length > 0
  const isEnded = pollData.isExpired

  const [selected, setSelected] = useState<number[]>([])
  const showResults = isEnded || hasVoted

  const handleVote = () => {
    if (selected.length === 0) return
    voteMutation.mutate(selected)
  }

  const totalVotes = pollData.totalVotes

  return (
    <div className="my-6 border border-neutral-200 rounded-xl p-5 bg-neutral-50">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-primary-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span className="text-sm font-semibold text-neutral-700">
          {isEnded ? t('post.pollEnded') : hasVoted ? t('post.pollVoted') : t('post.pollVote')}
        </span>
      </div>

      <p className="text-base font-medium text-neutral-800 mb-4">{pollData.question}</p>

      <div className="space-y-2">
        {pollData.options.map((opt) => {
          const pct = totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0
          const isMyVote = myVoted?.includes(opt.id)

          if (showResults) {
            return (
              <div key={opt.id} className="relative">
                <div
                  className={[
                    'absolute inset-0 rounded-lg transition-all',
                    isMyVote ? 'bg-primary-100' : 'bg-neutral-200',
                  ].join(' ')}
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center justify-between px-3 py-2.5 text-sm">
                  <span className={['font-medium', isMyVote ? 'text-primary-900' : 'text-neutral-700'].join(' ')}>
                    {isMyVote && <span className="mr-1">✓</span>}
                    {opt.optionText}
                  </span>
                  <span className="text-neutral-500 ml-2 whitespace-nowrap">{pct}% ({opt.voteCount})</span>
                </div>
              </div>
            )
          }

          // 투표 전 UI
          const isChecked = selected.includes(opt.id)
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                if (!isLoggedIn) return
                if (pollData.isMultipleChoice) {
                  setSelected((prev) => isChecked ? prev.filter((x) => x !== opt.id) : [...prev, opt.id])
                } else {
                  setSelected([opt.id])
                  // 단일 선택: 즉시 투표
                  voteMutation.mutate([opt.id])
                }
              }}
              disabled={!isLoggedIn || voteMutation.isPending}
              className={[
                'w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors',
                isChecked
                  ? 'border-primary-500 bg-primary-50 text-primary-900'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50',
                !isLoggedIn && 'cursor-not-allowed opacity-60',
              ].join(' ')}
            >
              {pollData.isMultipleChoice && (
                <span className={['inline-block w-4 h-4 border rounded mr-2 text-center leading-4 text-xs flex-shrink-0',
                  isChecked ? 'bg-primary-600 border-primary-600 text-white' : 'border-neutral-300'
                ].join(' ')}>
                  {isChecked ? '✓' : ''}
                </span>
              )}
              {opt.optionText}
            </button>
          )
        })}
      </div>

      {/* 복수선택 투표 버튼 */}
      {!showResults && pollData.isMultipleChoice && isLoggedIn && (
        <button
          onClick={handleVote}
          disabled={selected.length === 0 || voteMutation.isPending}
          className="mt-4 w-full py-2 text-sm font-medium rounded-lg bg-primary-800 text-white hover:bg-primary-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {voteMutation.isPending ? '...' : t('post.pollVote')}
        </button>
      )}

      <p className="mt-3 text-xs text-neutral-400 text-right">
        {t('post.pollTotal', { count: totalVotes })}
        {isEnded && <span className="ml-2 text-red-500">{t('post.pollEnded')}</span>}
      </p>
    </div>
  )
}
