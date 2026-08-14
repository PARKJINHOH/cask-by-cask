import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { adminPhotoCardApi } from '@/domain/photo-card/api/photoCardApi'
import { BUILTIN_LAYOUTS } from '@/domain/photo-card/constants/builtinLayouts'
import type { PhotoCardTemplate } from '@/domain/photo-card/types/photoCard.types'
import { normalizeLayout } from '@/domain/photo-card/utils/layoutSchema'

// 관리자 화면은 한국어 고정 (AGENTS.md)

type Tab = 'official' | 'public'

export default function AdminPhotoCardTemplatePage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('official')
  // 드롭 직후 ~ 서버 반영 사이에만 쓰는 임시 순서.
  const [pendingOfficialOrder, setPendingOfficialOrder] = useState<PhotoCardTemplate[] | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const official = useQuery({
    queryKey: ['adminPhotoCardOfficial'],
    queryFn: adminPhotoCardApi.getOfficialTemplates,
  })
  const publicUser = useQuery({
    queryKey: ['adminPhotoCardPublic'],
    queryFn: () => adminPhotoCardApi.getPublicUserTemplates(0, 50),
    enabled: tab === 'public',
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['adminPhotoCardOfficial'] })
    void queryClient.invalidateQueries({ queryKey: ['adminPhotoCardPublic'] })
  }

  const seedBuiltins = useMutation({
    mutationFn: async () => {
      const existing = new Set((official.data ?? []).map((template) => template.name))
      for (const builtin of BUILTIN_LAYOUTS) {
        const name = BUILTIN_NAMES[builtin.key] ?? builtin.key
        if (existing.has(name)) continue
        await adminPhotoCardApi.createOfficial({
          name,
          description: BUILTIN_DESCRIPTIONS[builtin.key] ?? null,
          layout: normalizeLayout(builtin.layout),
        })
      }
    },
    onSuccess: invalidate,
  })

  const reorder = useMutation({
    mutationFn: (orderedIds: number[]) => adminPhotoCardApi.reorderOfficial(orderedIds),
    onSuccess: invalidate,
    onSettled: () => setPendingOfficialOrder(null),
  })

  const moderate = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'VISIBLE' | 'HIDDEN' }) =>
      adminPhotoCardApi.changeModeration(id, status),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: number) => adminPhotoCardApi.deleteTemplate(id),
    onSuccess: invalidate,
  })

  const rows: PhotoCardTemplate[] = tab === 'official'
    ? pendingOfficialOrder ?? official.data ?? []
    : publicUser.data?.content ?? []

  /**
   * 표에 보이는 순서대로 id 를 모아 서버에 넘기면 배열 index 가 그대로 displayOrder 가 된다.
   * 사용자 편집기의 템플릿 목록이 이 순서를 따른다.
   * 드롭 즉시 저장하고, 응답을 기다리는 동안에는 화면이 튀지 않게 로컬 순서를 보여준다.
   */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = rows.findIndex((template) => String(template.id) === active.id)
    const newIndex = rows.findIndex((template) => String(template.id) === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(rows, oldIndex, newIndex)
    setPendingOfficialOrder(next)
    reorder.mutate(next.map((template) => template.id))
  }

  /**
   * 이미 시드된 DB 를 코드의 기본 순서(미니멀 → 세로 정렬 → 클래식 → 폴라로이드 → 다크 바)로 맞춘다.
   * 시드는 createOfficial 이 displayOrder 를 전부 0 으로 넣어 등록한 순서대로 남기 때문에,
   * 코드 순서를 바꿔도 기존 DB 는 따라오지 않는다.
   */
  const applyBuiltinOrder = () => {
    const rank = new Map(BUILTIN_LAYOUTS.map((builtin, index) => [
      BUILTIN_NAMES[builtin.key] ?? builtin.key, index,
    ]))
    // 기본 5종에 없는 템플릿(관리자가 따로 만든 것)은 뒤로 밀되 서로의 순서는 유지한다.
    const ids = rows.slice()
      .sort((a, b) => (rank.get(a.name) ?? 999) - (rank.get(b.name) ?? 999))
      .map((template) => template.id)
    reorder.mutate(ids)
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-neutral-900">포토카드 템플릿</h1>
      <p className="mt-1 text-sm text-neutral-500">
        사용자가 포토카드를 만들 때 고르는 배치를 관리합니다. 공식 템플릿은 모든 사용자에게 보이고,
        사용자가 공개한 템플릿은 부적절한 문구가 있으면 숨길 수 있습니다.
      </p>

      <div className="mt-5 flex gap-1.5">
        {([['official', '공식 템플릿'], ['public', '사용자 공개 템플릿']] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              tab === key ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {label}
          </button>
        ))}
        {tab === 'official' && (
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              disabled={reorder.isPending || rows.length === 0}
              onClick={applyBuiltinOrder}
              className="rounded-lg border border-neutral-300 px-4 py-1.5 text-sm font-bold text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
            >
              기본 순서로 정렬
            </button>
            <button
              type="button"
              disabled={seedBuiltins.isPending}
              onClick={() => seedBuiltins.mutate()}
              className="rounded-lg border border-primary-300 px-4 py-1.5 text-sm font-bold text-primary-700 hover:bg-primary-50 disabled:opacity-50"
            >
              {seedBuiltins.isPending ? '등록 중...' : '기본 템플릿 5종 등록'}
            </button>
          </div>
        )}
      </div>

      {tab === 'official' && (
        <p className="mt-2 text-xs text-neutral-400">
          위에서 아래 순서가 사용자 편집기의 템플릿 목록 순서입니다. 드래그로 순서를 바꾸면 바로 저장됩니다.
        </p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-xs text-neutral-500">
            <tr>
              {tab === 'official' && <th className="w-10 px-3 py-2.5" />}
              <th className="px-4 py-2.5 text-left font-semibold">이름</th>
              <th className="px-4 py-2.5 text-left font-semibold">비율</th>
              <th className="px-4 py-2.5 text-left font-semibold">요소</th>
              {tab === 'public' && <th className="px-4 py-2.5 text-left font-semibold">작성자</th>}
              <th className="px-4 py-2.5 text-left font-semibold">사용</th>
              <th className="px-4 py-2.5 text-left font-semibold">상태</th>
              <th className="px-4 py-2.5 text-right font-semibold">관리</th>
            </tr>
          </thead>
          <tbody>
            {tab === 'official' ? (
              <SortableContext
                items={rows.map((template) => String(template.id))}
                strategy={verticalListSortingStrategy}
              >
                {rows.map((template) => (
                  <SortableTemplateRow
                    key={template.id}
                    template={template}
                    showOwner={false}
                    onModerate={moderate.mutate}
                    onRemove={remove.mutate}
                  />
                ))}
              </SortableContext>
            ) : (
              rows.map((template) => (
                <tr key={template.id} className="border-t border-neutral-100">
                  <TemplateRowCells
                    template={template}
                    showOwner
                    onModerate={moderate.mutate}
                    onRemove={remove.mutate}
                  />
                </tr>
              ))
            )}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-neutral-400">
                  {tab === 'official'
                    ? '등록된 공식 템플릿이 없습니다. 위 버튼으로 기본 5종을 등록할 수 있습니다.'
                    : '공개된 사용자 템플릿이 없습니다.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </DndContext>
    </div>
  )
}

interface TemplateRowProps {
  template: PhotoCardTemplate
  showOwner: boolean
  onModerate: (input: { id: number; status: 'VISIBLE' | 'HIDDEN' }) => void
  onRemove: (id: number) => void
}

function SortableTemplateRow({ template, ...props }: TemplateRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(template.id),
  })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
    backgroundColor: isDragging ? '#f9fafb' : undefined,
  }

  return (
    <tr ref={setNodeRef} style={style} className="border-t border-neutral-100">
      <td className="w-10 px-3 py-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="순서 변경"
          className="cursor-grab touch-none p-1 text-neutral-300 transition-colors hover:text-neutral-500 active:cursor-grabbing"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="8" x2="20" y2="8" strokeLinecap="round" />
            <line x1="4" y1="12" x2="20" y2="12" strokeLinecap="round" />
            <line x1="4" y1="16" x2="20" y2="16" strokeLinecap="round" />
          </svg>
        </button>
      </td>
      <TemplateRowCells template={template} {...props} />
    </tr>
  )
}

function TemplateRowCells({ template, showOwner, onModerate, onRemove }: TemplateRowProps) {
  return (
    <>
      <td className="max-w-[320px] px-4 py-3">
        <span className="font-semibold text-neutral-900">{template.name}</span>
        {template.description && (
          <span className="mt-0.5 block text-xs text-neutral-500">{template.description}</span>
        )}
      </td>
      <td className="px-4 py-3 text-neutral-600">{template.aspectRatio}</td>
      <td className="px-4 py-3 text-neutral-600">{template.layout?.layers?.length ?? 0}</td>
      {showOwner && <td className="px-4 py-3 text-neutral-600">{template.ownerNickname ?? '-'}</td>}
      <td className="px-4 py-3 text-neutral-600">{template.useCount}</td>
      <td className="px-4 py-3">
        <span className={`rounded px-2 py-0.5 text-xs font-bold ${
          template.moderationStatus === 'VISIBLE'
            ? 'bg-green-100 text-green-700' : 'bg-neutral-200 text-neutral-600'
        }`}>
          {template.moderationStatus === 'VISIBLE' ? '노출' : '숨김'}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={() => onModerate({
            id: template.id,
            status: template.moderationStatus === 'VISIBLE' ? 'HIDDEN' : 'VISIBLE',
          })}
          className="mr-2 text-xs font-semibold text-primary-700 hover:underline"
        >
          {template.moderationStatus === 'VISIBLE' ? '숨기기' : '노출하기'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`'${template.name}' 템플릿을 삭제할까요?`)) onRemove(template.id)
          }}
          className="text-xs font-semibold text-neutral-400 hover:text-red-600"
        >
          삭제
        </button>
      </td>
    </>
  )
}

const BUILTIN_NAMES: Record<string, string> = {
  classic: '클래식 하단 밴드',
  polaroid: '폴라로이드',
  minimal: '미니멀',
  darkBar: '다크 바',
  stacked: '세로 정렬',
}

const BUILTIN_DESCRIPTIONS: Record<string, string> = {
  classic: '사진 아래 흰 밴드에 주류명·증류소·EXIF·로고를 좌우로 나눠 배치합니다.',
  polaroid: '사방에 여백을 두고 아래를 더 넓게. 손글씨 글꼴과 잘 어울립니다.',
  minimal: '사진을 가장자리까지 채우고 밴드는 얇게. 정보 밀도를 낮춥니다.',
  darkBar: '검은 배경에 밝은 글자. 바 조명 아래 찍은 어두운 사진과 톤이 맞습니다.',
  stacked: '정보를 세로로 쌓고 EXIF 를 한 줄로 길게. 정보가 많을 때 유리합니다.',
}
