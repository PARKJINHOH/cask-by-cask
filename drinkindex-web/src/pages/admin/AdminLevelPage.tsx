import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  adminScoreApi,
  type LevelConfigAdmin,
  type UpdateLevelConfigRequest,
  type CreateLevelConfigRequest,
} from '@/domain/admin/api/adminScoreApi'
import LevelBadge from '@/shared/components/LevelBadge'

export default function AdminLevelPage() {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId,   setEditingId]   = useState<number | null>(null)
  const queryClient = useQueryClient()

  const { data: levels = [], isLoading } = useQuery({
    queryKey: ['admin-level-config'],
    queryFn: () => adminScoreApi.getLevelConfigs().then((r) => r.data.data ?? []),
  })

  // 임팩트(티어) 산정 기준 = 정의된 최고 레벨. 항상 최고 레벨이 가장 화려하게 보인다.
  const maxLevel = levels.length ? Math.max(...levels.map((l) => l.level)) : 20
  const activeLevels = [...levels].filter((l) => l.isActive).sort((a, b) => a.level - b.level)

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateLevelConfigRequest }) =>
      adminScoreApi.updateLevelConfig(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-level-config'] })
      setEditingId(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminScoreApi.deleteLevelConfig(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-level-config'] }),
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateLevelConfigRequest) => adminScoreApi.createLevelConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-level-config'] })
      setShowAddForm(false)
    },
  })

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">레벨 설정</h1>
          <p className="text-sm text-neutral-500 mt-0.5">숙성력 레벨 구간을 정의합니다. 레벨이 오를수록 뱃지가 강렬해집니다.</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-primary-800 text-white text-sm font-medium rounded-lg hover:bg-primary-900 transition-colors"
        >
          + 레벨 추가
        </button>
      </div>

      {/* ── 미리보기 램프 — 사용자에게 보이는 임팩트 escalation ──────────── */}
      <PreviewRamp levels={activeLevels} maxLevel={maxLevel} isLoading={isLoading} />

      {/* 인라인 폼 (추가) */}
      {showAddForm && (
        <LevelAddForm
          onClose={() => setShowAddForm(false)}
          onSave={(data) => createMutation.mutate(data)}
          isPending={createMutation.isPending}
        />
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-neutral-400 text-sm">불러오는 중...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-5 py-3 text-neutral-500 font-medium w-28">레벨</th>
                <th className="text-left px-4 py-3 text-neutral-500 font-medium">이름</th>
                <th className="text-right px-4 py-3 text-neutral-500 font-medium">최소 숙성력</th>
                <th className="text-center px-4 py-3 text-neutral-500 font-medium w-20">상태</th>
                <th className="text-right px-5 py-3 text-neutral-500 font-medium w-40">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {levels.map((lv) =>
                editingId === lv.id ? (
                  <LevelEditRow
                    key={lv.id}
                    lv={lv}
                    maxLevel={maxLevel}
                    onSave={(data) => updateMutation.mutate({ id: lv.id, data })}
                    onCancel={() => setEditingId(null)}
                    isPending={updateMutation.isPending}
                  />
                ) : (
                  <LevelViewRow
                    key={lv.id}
                    lv={lv}
                    maxLevel={maxLevel}
                    onEdit={() => setEditingId(lv.id)}
                    onDelete={() => {
                      if (!confirm(`Lv.${lv.level} "${lv.name}"을 삭제하시겠습니까?`)) return
                      deleteMutation.mutate(lv.id)
                    }}
                    deleteDisabled={lv.level === 1}
                    deletePending={deleteMutation.isPending}
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

// ── 미리보기 램프 ─────────────────────────────────────────────

function PreviewRamp({
  levels,
  maxLevel,
  isLoading,
}: {
  levels: LevelConfigAdmin[]
  maxLevel: number
  isLoading: boolean
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-5">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-sm font-semibold text-neutral-700">레벨 미리보기</p>
        <p className="text-xs text-neutral-400">사용자에게 보이는 모습 · 활성 레벨만 표시</p>
      </div>

      {isLoading ? (
        <div className="py-6 text-center text-neutral-400 text-sm">불러오는 중...</div>
      ) : levels.length === 0 ? (
        <div className="py-6 text-center text-neutral-400 text-sm">활성화된 레벨이 없습니다.</div>
      ) : (
        <div className="overflow-x-auto -mx-1 px-1">
          {/* 우상향 램프 느낌 — 고레벨일수록 칸을 살짝 더 띄워 위로 올린다 */}
          <div className="flex items-end gap-3 min-w-max pb-1">
            {levels.map((lv, i) => {
              const lift = Math.round((i / Math.max(1, levels.length - 1)) * 14) // 0~14px 상승
              return (
                <div
                  key={lv.id}
                  className="flex flex-col items-center gap-1.5 w-[68px] flex-shrink-0"
                  style={{ marginBottom: lift }}
                >
                  <LevelBadge level={lv.level} maxLevel={maxLevel} size={54} />
                  <span className="text-xs font-bold text-neutral-700 leading-none mt-0.5">Lv.{lv.level}</span>
                  <span className="text-[11px] text-neutral-500 leading-none truncate max-w-full text-center">
                    {lv.name}
                  </span>
                  <span className="text-[10px] text-neutral-400 leading-none tabular-nums">
                    {lv.minScore.toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── 관리 테이블 행 ────────────────────────────────────────────

function LevelViewRow({
  lv,
  maxLevel,
  onEdit,
  onDelete,
  deleteDisabled,
  deletePending,
}: {
  lv: LevelConfigAdmin
  maxLevel: number
  onEdit: () => void
  onDelete: () => void
  deleteDisabled: boolean
  deletePending: boolean
}) {
  return (
    <tr className={`hover:bg-neutral-50 transition-colors ${!lv.isActive ? 'opacity-50' : ''}`}>
      <td className="px-5 py-3">
        <div className="flex items-center gap-2.5">
          <LevelBadge level={lv.level} maxLevel={maxLevel} size={34} />
          <span className="font-semibold text-neutral-700">Lv.{lv.level}</span>
        </div>
      </td>
      <td className="px-4 py-3 font-medium text-neutral-800">{lv.name}</td>
      <td className="px-4 py-3 text-right font-mono text-neutral-600 tabular-nums">
        {lv.minScore.toLocaleString()}
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
          lv.isActive ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-500'
        }`}>
          {lv.isActive ? '활성' : '비활성'}
        </span>
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-1.5 justify-end">
          <button
            onClick={onEdit}
            className="h-7 px-3 text-xs font-medium rounded-md border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50 transition-colors whitespace-nowrap shrink-0"
          >
            수정
          </button>
          <button
            onClick={onDelete}
            disabled={deleteDisabled || deletePending}
            title={deleteDisabled ? '기본 레벨은 삭제할 수 없습니다' : undefined}
            className="h-7 px-3 text-xs font-medium rounded-md border border-red-200 bg-white text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
          >
            삭제
          </button>
        </div>
      </td>
    </tr>
  )
}

function LevelEditRow({
  lv,
  maxLevel,
  onSave,
  onCancel,
  isPending,
}: {
  lv: LevelConfigAdmin
  maxLevel: number
  onSave: (data: UpdateLevelConfigRequest) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [name,     setName]     = useState(lv.name)
  const [minScore, setMinScore] = useState(String(lv.minScore))
  const [isActive, setIsActive] = useState(lv.isActive)

  return (
    <tr className="bg-amber-50/40">
      <td className="px-5 py-3">
        <div className="flex items-center gap-2.5">
          <LevelBadge level={lv.level} maxLevel={maxLevel} size={34} />
          <span className="font-semibold text-neutral-700">Lv.{lv.level}</span>
        </div>
      </td>
      <td className="px-4 py-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-24 px-2 py-1 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400"
        />
      </td>
      <td className="px-4 py-2">
        <div className="flex justify-end">
          <input
            type="number"
            value={minScore}
            onChange={(e) => setMinScore(e.target.value)}
            min={0}
            className="w-28 px-2 py-1 text-sm text-right border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400"
          />
        </div>
      </td>
      <td className="px-4 py-2 text-center">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="w-4 h-4 accent-primary-800"
        />
      </td>
      <td className="px-5 py-2">
        <div className="flex items-center gap-1.5 justify-end">
          <button
            onClick={() => onSave({ name: name.trim(), minScore: Number(minScore), isActive })}
            disabled={isPending || !name.trim()}
            className="h-7 px-3 text-xs font-medium rounded-md bg-primary-800 text-white hover:bg-primary-900 transition-colors disabled:opacity-40 whitespace-nowrap shrink-0"
          >
            저장
          </button>
          <button
            onClick={onCancel}
            className="h-7 px-3 text-xs font-medium rounded-md border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50 transition-colors whitespace-nowrap shrink-0"
          >
            취소
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── 레벨 추가 폼 ──────────────────────────────────────────────

function LevelAddForm({
  onClose,
  onSave,
  isPending,
}: {
  onClose: () => void
  onSave: (data: CreateLevelConfigRequest) => void
  isPending: boolean
}) {
  const [level,    setLevel]    = useState('')
  const [name,     setName]     = useState('')
  const [minScore, setMinScore] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!level || !name) return
    onSave({ level: Number(level), name, minScore: Number(minScore) })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl shadow-sm p-5 space-y-4 max-w-lg border border-primary-100"
    >
      <h2 className="text-sm font-semibold text-neutral-700">레벨 추가</h2>

        <div className="space-y-3">
          {[
            { label: '레벨 번호', value: level, set: setLevel, type: 'number', placeholder: '21', min: 1 },
            { label: '레벨 이름', value: name,  set: setName,  type: 'text',   placeholder: '예: 리저브' },
            { label: '최소 숙성력', value: minScore, set: setMinScore, type: 'number', placeholder: '1300000', min: 0 },
          ].map(({ label, value, set, type, placeholder, min }) => (
            <div key={label}>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                {label} <span className="text-red-500">*</span>
              </label>
              <input
                type={type}
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder={placeholder}
                min={min}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-neutral-200 text-sm font-medium text-neutral-600 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isPending || !level || !name}
            className="flex-1 px-4 py-2 bg-primary-800 text-white text-sm font-medium rounded-lg hover:bg-primary-900 transition-colors disabled:opacity-40"
          >
            {isPending ? '추가 중...' : '추가'}
          </button>
        </div>
    </form>
  )
}
