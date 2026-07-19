import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  adminScoreApi,
  type LevelConfigAdmin,
  type UpdateLevelConfigRequest,
  type GenerateLevelConfigRequest,
} from '@/domain/admin/api/adminScoreApi'
import LevelBadge from '@/shared/components/LevelBadge'
import { generateLevels, DEFAULT_LEVEL_FORMULA } from '@/domain/score/types/score.types'
import { RequiredFieldsNotice, RequiredMark } from '@/shared/components/FormFieldLabel'

export default function AdminLevelPage() {
  const [editingId, setEditingId] = useState<number | null>(null)
  const queryClient = useQueryClient()

  const { data: levels = [], isLoading } = useQuery({
    queryKey: ['admin-level-config'],
    queryFn: () => adminScoreApi.getLevelConfigs().then((r) => r.data.data ?? []),
  })

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

  const generateMutation = useMutation({
    mutationFn: (data: GenerateLevelConfigRequest) => adminScoreApi.generateLevelConfigs(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-level-config'] }),
  })

  // 미리보기 마일스톤 — 1, 10, 20 … 최고레벨
  const milestones = levels.filter((l) => l.level === 1 || l.level % 10 === 0)

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">레벨 설정</h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          이름은 레벨 번호 그 자체(N레벨)입니다. 필요 점수는 공식으로 한 번에 생성하고, 개별 값만 미세 조정하세요.
        </p>
      </div>

      {/* ── 공식 자동생성 ─────────────────────────────────────── */}
      <FormulaGenerator
        onGenerate={(d) => generateMutation.mutate(d)}
        isPending={generateMutation.isPending}
      />

      {/* ── 뱃지 미리보기 (10레벨마다) ─────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-5">
        <p className="text-sm font-semibold text-neutral-700 mb-4">뱃지 미리보기 · 10레벨마다 변화</p>
        {isLoading ? (
          <div className="py-6 text-center text-neutral-400 text-sm">불러오는 중...</div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {milestones.map((lv) => (
              <div key={lv.id} className="flex flex-col items-center gap-1.5 w-[64px]">
                <LevelBadge level={lv.level} size={52} />
                <span className="text-xs font-bold text-neutral-700 leading-none">Lv.{lv.level}</span>
                <span className="text-[10px] text-neutral-400 leading-none tabular-nums">
                  {lv.minScore.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 관리 테이블 (레벨 · 필요점수 · 상태 · 액션) ─────────── */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-neutral-400 text-sm">불러오는 중...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-5 py-3 text-neutral-500 font-medium w-40">레벨</th>
                <th className="text-right px-4 py-3 text-neutral-500 font-medium">필요 점수</th>
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
                    onSave={(data) => updateMutation.mutate({ id: lv.id, data })}
                    onCancel={() => setEditingId(null)}
                    isPending={updateMutation.isPending}
                  />
                ) : (
                  <LevelViewRow
                    key={lv.id}
                    lv={lv}
                    onEdit={() => setEditingId(lv.id)}
                    onDelete={() => {
                      if (!confirm(`Lv.${lv.level}을 삭제하시겠습니까?`)) return
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

// ── 공식 자동생성 카드 ────────────────────────────────────────

function FormulaGenerator({
  onGenerate,
  isPending,
}: {
  onGenerate: (d: GenerateLevelConfigRequest) => void
  isPending: boolean
}) {
  const [maxLevel, setMaxLevel] = useState(String(DEFAULT_LEVEL_FORMULA.maxLevel))
  const [baseScore, setBaseScore] = useState(String(DEFAULT_LEVEL_FORMULA.baseScore))
  const [growthRate, setGrowthRate] = useState(String(DEFAULT_LEVEL_FORMULA.growthRate))
  const [earlyWeight, setEarlyWeight] = useState(String(DEFAULT_LEVEL_FORMULA.earlyWeight))

  const f = {
    maxLevel: Math.max(2, Math.min(200, Number(maxLevel) || 0)),
    baseScore: Math.max(1, Number(baseScore) || 0),
    growthRate: Math.max(1.01, Number(growthRate) || 0),
    earlyWeight: Math.max(0, Number(earlyWeight) || 0),
  }
  const preview = generateLevels(f)
  const sampleLevels = [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].filter((n) => n <= f.maxLevel)
  if (!sampleLevels.includes(f.maxLevel)) sampleLevels.push(f.maxLevel)

  const fields = [
    { label: '최대 레벨', value: maxLevel, set: setMaxLevel, step: '1', hint: '2 ~ 200' },
    { label: '시작 점수(기준)', value: baseScore, set: setBaseScore, step: '1', hint: '곡선 스케일' },
    { label: '증가율(배율)', value: growthRate, set: setGrowthRate, step: '0.0001', hint: '1.01 이상' },
    { label: '초반 가중', value: earlyWeight, set: setEarlyWeight, step: '1', hint: '클수록 초반이 가파름' },
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-primary-100 p-5 space-y-4">
      <div>
        <p className="text-sm font-semibold text-neutral-700">공식 자동생성</p>
        <p className="text-xs text-neutral-500 mt-0.5">
          입력값으로 1~최대레벨의 필요 점수를 한 번에 만듭니다. 지수 곡선에 초반 가중을 더해, 초반은 너무 빠르지 않게·후반은 가파르게 만듭니다.
        </p>
      </div>
      <RequiredFieldsNotice admin />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {fields.map(({ label, value, set, step, hint }) => (
          <div key={label}>
            <label className="block text-xs font-medium text-neutral-600 mb-1">{label}<RequiredMark /></label>
            <input
              type="number"
              required
              aria-required="true"
              value={value}
              step={step}
              onChange={(e) => set(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <p className="text-[11px] text-neutral-400 mt-1">{hint}</p>
          </div>
        ))}
      </div>

      {/* 라이브 미리보기 */}
      <div className="rounded-lg bg-neutral-50 border border-neutral-100 px-4 py-3">
        <p className="text-xs font-medium text-neutral-500 mb-2">생성 미리보기 (필요 점수)</p>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
          {sampleLevels.map((n) => {
            const item = preview.find((p) => p.level === n)
            if (!item) return null
            return (
              <span key={n} className="tabular-nums">
                <span className="font-semibold text-neutral-700">Lv.{n}</span>
                <span className="text-neutral-400"> · {item.minScore.toLocaleString()}</span>
              </span>
            )
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-amber-700">
          ⚠️ 생성 시 기존 레벨 구간이 모두 교체되고, 전체 회원 레벨이 재계산됩니다.
        </p>
        <button
          onClick={() => {
            if (!confirm(`${f.maxLevel}개 레벨을 이 공식으로 생성합니다.\n기존 레벨 구간은 모두 교체됩니다. 진행할까요?`)) return
            onGenerate(f)
          }}
          disabled={isPending}
          className="px-4 py-2 bg-primary-800 text-white text-sm font-medium rounded-lg hover:bg-primary-900 transition-colors disabled:opacity-40 whitespace-nowrap shrink-0"
        >
          {isPending ? '생성 중...' : `${f.maxLevel}레벨 생성`}
        </button>
      </div>
    </div>
  )
}

// ── 관리 테이블 행 ────────────────────────────────────────────

function LevelViewRow({
  lv,
  onEdit,
  onDelete,
  deleteDisabled,
  deletePending,
}: {
  lv: LevelConfigAdmin
  onEdit: () => void
  onDelete: () => void
  deleteDisabled: boolean
  deletePending: boolean
}) {
  return (
    <tr className={`hover:bg-neutral-50 transition-colors ${!lv.isActive ? 'opacity-50' : ''}`}>
      <td className="px-5 py-3">
        <div className="flex items-center gap-2.5">
          <LevelBadge level={lv.level} size={34} />
          <span className="font-semibold text-neutral-700">Lv.{lv.level}</span>
        </div>
      </td>
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
  onSave,
  onCancel,
  isPending,
}: {
  lv: LevelConfigAdmin
  onSave: (data: UpdateLevelConfigRequest) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [minScore, setMinScore] = useState(String(lv.minScore))
  const [isActive, setIsActive] = useState(lv.isActive)

  return (
    <tr className="bg-amber-50/40">
      <td className="px-5 py-3">
        <div className="flex items-center gap-2.5">
          <LevelBadge level={lv.level} size={34} />
          <span className="font-semibold text-neutral-700">Lv.{lv.level}</span>
        </div>
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
            onClick={() => onSave({ name: `${lv.level}레벨`, minScore: Number(minScore), isActive })}
            disabled={isPending}
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
