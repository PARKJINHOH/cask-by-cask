import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  adminScoreApi,
  type ScoreConfigAdmin,
  type CreateScoreConfigRequest,
  type UpdateScoreConfigRequest,
} from '@/domain/admin/api/adminScoreApi'
import { ACTION_ICONS } from '@/domain/score/types/score.types'
import { RequiredFieldsNotice } from '@/shared/components/FormFieldLabel'
import NumberInput from '@/shared/components/NumberInput'

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
  SPIRIT_REVIEW_WRITE:        '주류 상세 리뷰 작성',
  SPIRIT_REQUEST:             '주류 등록 요청',
  SPIRIT_REQUEST_APPROVED:    '주류 등록 승인',
  WISHLIST_ADD:               '위시리스트 추가',
  ATTENDANCE:                 '출석 체크',
  ATTENDANCE_STREAK_7:        '7일 연속 출석 보너스',
  ATTENDANCE_STREAK_30:       '30일 연속 출석 보너스',
  ADMIN_ADJUST:               '관리자 수동 조정 (기준값)',
  FEEDBACK_WRITE:             '개선·문의 작성',
  FEEDBACK_RESOLVED:          '개선·문의 해결 보너스',
}

const ALL_ACTION_TYPES = Object.keys(ACTION_LABELS)

export default function AdminScorePage() {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const queryClient = useQueryClient()

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['admin-score-config'],
    queryFn: () => adminScoreApi.getScoreConfigs().then((r) => r.data.data ?? []),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-score-config'] })

  const createMutation = useMutation({
    mutationFn: (data: CreateScoreConfigRequest) => adminScoreApi.createScoreConfig(data),
    onSuccess: () => {
      invalidate()
      setAdding(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateScoreConfigRequest }) =>
      adminScoreApi.updateScoreConfig(id, data),
    onSuccess: () => {
      invalidate()
      setEditingId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminScoreApi.deleteScoreConfig(id),
    onSuccess: invalidate,
  })

  const existingKeys = configs.map((c) => c.actionType)
  const suggestedKeys = ALL_ACTION_TYPES.filter((t) => !existingKeys.includes(t))

  // 시스템 액션(코드에 이벤트 트리거 존재) / 커스텀 액션(수동 등록) 분리
  const systemConfigs = configs.filter((c) => ALL_ACTION_TYPES.includes(c.actionType))
  const customConfigs = configs.filter((c) => !ALL_ACTION_TYPES.includes(c.actionType))

  const makeRowProps = (cfg: ScoreConfigAdmin) => ({
    cfg,
    onEdit: () => setEditingId(cfg.id),
    onDelete: () => {
      const label = ACTION_LABELS[cfg.actionType] ?? cfg.actionType
      if (window.confirm(`'${label}' 점수 설정을 삭제할까요?\n삭제 시 해당 액션은 레벨 점수를 지급/차감하지 않습니다.`)) {
        deleteMutation.mutate(cfg.id)
      }
    },
    isDeleting: deleteMutation.isPending,
  })

  const renderRow = (cfg: ScoreConfigAdmin) =>
    editingId === cfg.id ? (
      <EditRow
        key={cfg.id}
        cfg={cfg}
        existingKeys={existingKeys.filter((k) => k !== cfg.actionType)}
        onSave={(data) => updateMutation.mutate({ id: cfg.id, data })}
        onCancel={() => setEditingId(null)}
        isPending={updateMutation.isPending}
      />
    ) : (
      <ViewRow key={cfg.id} {...makeRowProps(cfg)} />
    )

  const tableHead = (
    <thead className="bg-neutral-50 border-b border-neutral-200">
      <tr>
        <th className="text-left px-4 py-3 text-neutral-500 font-medium">액션</th>
        <th className="text-center px-4 py-3 text-neutral-500 font-medium w-24">점수</th>
        <th className="text-center px-4 py-3 text-neutral-500 font-medium w-32">일일 한도</th>
        <th className="text-center px-4 py-3 text-neutral-500 font-medium w-20">상태</th>
        <th className="text-right px-4 py-3 text-neutral-500 font-medium w-32">관리</th>
      </tr>
    </thead>
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">점수 설정</h1>
          <p className="text-sm text-neutral-500 mt-0.5">각 액션별 레벨 점수 지급·차감을 설정합니다.</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          disabled={adding}
          className="shrink-0 h-9 px-3.5 text-sm font-medium rounded-md bg-primary-800 text-white hover:bg-primary-900 transition-colors disabled:opacity-40"
        >
          + 점수 추가
        </button>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-neutral-400 text-sm">불러오는 중...</div>
      ) : (
        <>
          {/* 커스텀 이벤트 액션 영역 — 점수 추가로 등록된 비시스템 키 */}
          {(adding || customConfigs.length > 0) && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/40 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-amber-200 flex items-center gap-2">
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">이벤트 / 커스텀 액션</span>
                <span className="text-xs text-amber-600">코드 연결 없이는 실제 지급되지 않습니다.</span>
              </div>
              <table className="w-full text-sm">
                {tableHead}
                <tbody className="divide-y divide-amber-100">
                  {adding && (
                    <AddRow
                      existingKeys={existingKeys}
                      suggestedKeys={suggestedKeys}
                      onSave={(data) => createMutation.mutate(data)}
                      onCancel={() => setAdding(false)}
                      isPending={createMutation.isPending}
                    />
                  )}
                  {customConfigs.map(renderRow)}
                </tbody>
              </table>
            </div>
          )}

          {/* 시스템 액션 영역 */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-neutral-200">
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">시스템 액션</span>
            </div>
            <table className="w-full text-sm">
              {tableHead}
              <tbody className="divide-y divide-neutral-100">
                {systemConfigs.map(renderRow)}
                {systemConfigs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-neutral-400 text-sm">
                      등록된 시스템 액션 점수 설정이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function ViewRow({
  cfg,
  onEdit,
  onDelete,
  isDeleting,
}: {
  cfg: ScoreConfigAdmin
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}) {
  const icon = ACTION_ICONS[cfg.actionType] ?? '•'
  const label = ACTION_LABELS[cfg.actionType] ?? cfg.actionType

  return (
    <tr className={`hover:bg-neutral-50 transition-colors ${!cfg.isActive ? 'opacity-50' : ''}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{icon}</span>
          <div>
            <span className="text-neutral-700">{label}</span>
            {cfg.description && cfg.description !== label && (
              <p className="text-xs text-neutral-400 mt-0.5">{cfg.description}</p>
            )}
          </div>
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
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={onEdit}
            className="h-7 px-2.5 text-xs font-medium rounded-md border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            수정
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="h-7 px-2.5 text-xs font-medium rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
          >
            삭제
          </button>
        </div>
      </td>
    </tr>
  )
}

function EditRow({
  cfg,
  existingKeys,
  onSave,
  onCancel,
  isPending,
}: {
  cfg: ScoreConfigAdmin
  existingKeys: string[]
  onSave: (data: UpdateScoreConfigRequest) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [actionType,  setActionType]  = useState(cfg.actionType)
  const [description, setDescription] = useState(cfg.description ?? '')
  const [score,       setScore]       = useState(String(cfg.score))
  const [dailyLimit,  setDailyLimit]  = useState(cfg.dailyLimit != null ? String(cfg.dailyLimit) : '')
  const [isActive,    setIsActive]    = useState(cfg.isActive)

  const trimmedKey   = actionType.trim()
  const isDuplicate  = trimmedKey !== '' && existingKeys.includes(trimmedKey)
  const canSave      = trimmedKey !== '' && !isDuplicate

  // datalist: 아직 사용되지 않은 시스템 키 + 현재 편집 중인 키
  const suggestedKeys = ALL_ACTION_TYPES.filter((t) => !existingKeys.includes(t))

  const handleSave = () => {
    if (!canSave) return
    onSave({
      actionType: trimmedKey,
      description: description.trim() || undefined,
      score: Number(score),
      dailyLimit: dailyLimit.trim() ? Number(dailyLimit) : null,
      isActive,
    })
  }

  return (
    <tr className="bg-amber-50/40 align-top">
      <td className="px-4 py-3">
        <div className="space-y-1.5">
          <RequiredFieldsNotice admin />
          <input
            required
            aria-required="true"
            aria-label="액션 키"
            list="edit-action-suggestions"
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
            placeholder="액션 키"
            maxLength={50}
            autoFocus
            className="w-full max-w-[18rem] px-2 py-1 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400"
          />
          <datalist id="edit-action-suggestions">
            {suggestedKeys.map((t) => (
              <option key={t} value={t}>{ACTION_LABELS[t] ?? t}</option>
            ))}
          </datalist>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="설명 (선택)"
            maxLength={200}
            className="w-full max-w-[18rem] px-2 py-1 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400 placeholder:text-neutral-300"
          />
          {isDuplicate && (
            <p className="text-xs text-red-500">이미 등록된 액션 키입니다.</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <NumberInput
          required
          aria-required="true"
          aria-label="점수"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="w-20 px-2 py-1 text-sm text-center border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400"
        />
      </td>
      <td className="px-4 py-3">
        <NumberInput
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
            disabled={isPending || !canSave}
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

function AddRow({
  existingKeys,
  suggestedKeys,
  onSave,
  onCancel,
  isPending,
}: {
  existingKeys: string[]
  suggestedKeys: string[]
  onSave: (data: CreateScoreConfigRequest) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [actionType,  setActionType]  = useState('')
  const [description, setDescription] = useState('')
  const [score,       setScore]       = useState('0')
  const [dailyLimit,  setDailyLimit]  = useState('')
  const [isActive,    setIsActive]    = useState(false)

  const trimmedKey = actionType.trim()
  const isDuplicate = trimmedKey !== '' && existingKeys.includes(trimmedKey)
  const canSave = trimmedKey !== '' && !isDuplicate

  const handleSave = () => {
    if (!canSave) return
    onSave({
      actionType: trimmedKey,
      score: Number(score),
      dailyLimit: dailyLimit.trim() ? Number(dailyLimit) : null,
      isActive,
      description: description.trim() || (ACTION_LABELS[trimmedKey] ?? trimmedKey),
    })
  }

  return (
    <tr className="bg-primary-50/50 align-top">
      <td className="px-4 py-3">
        <div className="space-y-1.5">
          <RequiredFieldsNotice admin />
          <input
            required
            aria-required="true"
            aria-label="액션 키"
            list="score-action-suggestions"
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
            placeholder="액션 키 (예: EVENT_2026)"
            maxLength={50}
            autoFocus
            className="w-full max-w-[18rem] px-2 py-1 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400 placeholder:text-neutral-300"
          />
          <datalist id="score-action-suggestions">
            {suggestedKeys.map((t) => (
              <option key={t} value={t}>
                {ACTION_LABELS[t] ?? t}
              </option>
            ))}
          </datalist>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="설명 (선택)"
            maxLength={200}
            className="w-full max-w-[18rem] px-2 py-1 text-xs border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400 placeholder:text-neutral-300"
          />
          {isDuplicate && (
            <p className="text-xs text-red-500">이미 등록된 액션 키입니다.</p>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <NumberInput
          required
          aria-required="true"
          aria-label="점수"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="w-20 px-2 py-1 text-sm text-center border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400"
        />
      </td>
      <td className="px-4 py-3">
        <NumberInput
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
            disabled={isPending || !canSave}
            className="h-7 px-2.5 text-xs font-medium rounded-md bg-primary-800 text-white hover:bg-primary-900 transition-colors disabled:opacity-40"
          >
            추가
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
