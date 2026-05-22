import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminScoreApi, type ScoreConfigAdmin, type UpdateScoreConfigRequest } from '@/domain/admin/api/adminScoreApi'
import { ACTION_ICONS } from '@/domain/score/types/score.types'

const ACTION_LABELS: Record<string, string> = {
  POST_WRITE_GENERAL:         '자유 - 일반 글쓰기',
  POST_WRITE_QUESTION:        '자유 - 질문 글쓰기',
  POST_WRITE_REVIEW:          '자유 - 리뷰 글쓰기',
  POST_WRITE_SHARING:         '자유 - 나눔 글쓰기',
  POST_WRITE_DISTILLERY_TOUR: '자유 - 증류소투어 글쓰기',
  POST_WRITE_NOTICE:          '소식 게시판 글쓰기',
  POST_DELETE:                '게시글 삭제 (차감)',
  POST_LOCKED:                '신고 잠금 (차감)',
  POST_LIKED:                 '추천 받음',
  COMMENT_WRITE:              '댓글 작성',
  SPIRIT_REVIEW_WRITE:        '술 상세 리뷰 작성',
  SPIRIT_REQUEST:             '술 등록 요청',
  SPIRIT_REQUEST_APPROVED:    '술 등록 승인',
  WISHLIST_ADD:               '위시리스트 추가',
  ATTENDANCE:                 '출석 체크',
  ATTENDANCE_STREAK_7:        '7일 연속 출석 보너스',
  ATTENDANCE_STREAK_30:       '30일 연속 출석 보너스',
  ADMIN_ADJUST:               '관리자 수동 조정 (기준값)',
}

export default function AdminScorePage() {
  const [editingId, setEditingId] = useState<number | null>(null)
  const queryClient = useQueryClient()

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['admin-score-config'],
    queryFn: () => adminScoreApi.getScoreConfigs().then((r) => r.data.data ?? []),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateScoreConfigRequest }) =>
      adminScoreApi.updateScoreConfig(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-score-config'] })
      setEditingId(null)
    },
  })

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">점수 설정</h1>
        <p className="text-sm text-neutral-500 mt-0.5">각 액션별 숙성력 지급·차감 점수를 설정합니다.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-neutral-400 text-sm">불러오는 중...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-4 py-3 text-neutral-500 font-medium">액션</th>
                <th className="text-center px-4 py-3 text-neutral-500 font-medium w-24">점수</th>
                <th className="text-center px-4 py-3 text-neutral-500 font-medium w-32">일일 한도</th>
                <th className="text-center px-4 py-3 text-neutral-500 font-medium w-20">상태</th>
                <th className="text-right px-4 py-3 text-neutral-500 font-medium w-20">수정</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {configs.map((cfg) =>
                editingId === cfg.id ? (
                  <EditRow
                    key={cfg.id}
                    cfg={cfg}
                    onSave={(data) => updateMutation.mutate({ id: cfg.id, data })}
                    onCancel={() => setEditingId(null)}
                    isPending={updateMutation.isPending}
                  />
                ) : (
                  <ViewRow
                    key={cfg.id}
                    cfg={cfg}
                    onEdit={() => setEditingId(cfg.id)}
                  />
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function ViewRow({ cfg, onEdit }: { cfg: ScoreConfigAdmin; onEdit: () => void }) {
  const icon = ACTION_ICONS[cfg.actionType] ?? '•'
  const label = ACTION_LABELS[cfg.actionType] ?? cfg.actionType

  return (
    <tr className={`hover:bg-neutral-50 transition-colors ${!cfg.isActive ? 'opacity-50' : ''}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{icon}</span>
          <span className="text-neutral-700">{label}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`font-bold tabular-nums ${cfg.score >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {cfg.score >= 0 ? '+' : ''}{cfg.score}
        </span>
      </td>
      <td className="px-4 py-3 text-center text-neutral-500">
        {cfg.dailyLimit != null ? `${cfg.dailyLimit}점` : '—'}
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
          cfg.isActive ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-500'
        }`}>
          {cfg.isActive ? '활성' : '비활성'}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={onEdit}
          className="h-7 px-2.5 text-xs font-medium rounded-md border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          수정
        </button>
      </td>
    </tr>
  )
}

function EditRow({
  cfg,
  onSave,
  onCancel,
  isPending,
}: {
  cfg: ScoreConfigAdmin
  onSave: (data: UpdateScoreConfigRequest) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [score,      setScore]      = useState(String(cfg.score))
  const [dailyLimit, setDailyLimit] = useState(cfg.dailyLimit != null ? String(cfg.dailyLimit) : '')
  const [isActive,   setIsActive]   = useState(cfg.isActive)

  const handleSave = () => {
    onSave({
      score: Number(score),
      dailyLimit: dailyLimit.trim() ? Number(dailyLimit) : null,
      isActive,
    })
  }

  return (
    <tr className="bg-amber-50/40">
      <td className="px-4 py-3">
        <span className="text-sm text-neutral-600">
          {ACTION_ICONS[cfg.actionType] ?? '•'} {ACTION_LABELS[cfg.actionType] ?? cfg.actionType}
        </span>
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="w-20 px-2 py-1 text-sm text-center border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          value={dailyLimit}
          onChange={(e) => setDailyLimit(e.target.value)}
          placeholder="없음"
          min={0}
          className="w-20 px-2 py-1 text-sm text-center border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400 placeholder:text-neutral-300"
        />
      </td>
      <td className="px-4 py-3 text-center">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="w-4 h-4 accent-primary-800"
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="h-7 px-2.5 text-xs font-medium rounded-md bg-primary-800 text-white hover:bg-primary-900 transition-colors disabled:opacity-40"
          >
            저장
          </button>
          <button
            onClick={onCancel}
            className="h-7 px-2.5 text-xs font-medium rounded-md border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            취소
          </button>
        </div>
      </td>
    </tr>
  )
}
