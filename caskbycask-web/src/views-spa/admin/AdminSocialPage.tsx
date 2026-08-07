import { useEffect, useState } from 'react'
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
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import AdminPageHeader from '@/shared/components/AdminPageHeader'
import ImageEditorModal from '@/shared/components/ImageEditorModal'
import { socialApi } from '@/domain/social/api/socialApi'
import type {
  SocialAccount,
  SocialPlatform,
  SocialPublicationStatus,
  SocialTemplate,
} from '@/domain/social/types/social.types'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { useSearchParams } from 'react-router-dom'

type Tab = 'publications' | 'templates' | 'accounts'

export default function AdminSocialPage() {
  const [tab, setTab] = useState<Tab>('publications')
  const [searchParams] = useSearchParams()
  const isSuperAdmin = useAuthStore((state) => state.user?.role === 'SUPER_ADMIN')
  const connected = searchParams.get('socialConnected')
  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <AdminPageHeader
        breadcrumbs={[{ label: '커뮤니티' }, { label: 'SNS 게시 관리' }]}
        title="SNS 게시 관리"
      />
      {connected && (
        <div className={`mb-4 rounded-lg border p-3 text-sm ${
          connected === 'true'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {connected === 'true'
            ? '공식 SNS 계정 연결이 완료되었습니다.'
            : '공식 SNS 계정 연결이 취소되었거나 실패했습니다. Meta 앱 설정과 권한을 확인해주세요.'}
        </div>
      )}
      <div className="mb-5 flex gap-2 overflow-x-auto border-b border-neutral-200">
        {([
          ['publications', '게시 이력'],
          ['templates', '썸네일 배경'],
          ...(isSuperAdmin ? [['accounts', '공식 계정'] as const] : []),
        ] as Array<[Tab, string]>).map(([value, label]) => (
          <button key={value} type="button" onClick={() => setTab(value)}
            className={`border-b-2 px-4 py-3 text-sm font-semibold ${
              tab === value ? 'border-primary-800 text-primary-900' : 'border-transparent text-neutral-500'
            }`}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'publications' && <PublicationPanel />}
      {tab === 'templates' && <TemplatePanel />}
      {tab === 'accounts' && isSuperAdmin && <AccountPanel />}
    </div>
  )
}

function PublicationPanel() {
  const queryClient = useQueryClient()
  const [platform, setPlatform] = useState<SocialPlatform>('INSTAGRAM')
  const [status, setStatus] = useState<SocialPublicationStatus | ''>('')
  const [page, setPage] = useState(0)
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'social', 'publications', platform, status, page],
    queryFn: () => socialApi.adminPublications({
      platform,
      status: status || undefined,
      page,
      size: 20,
    }),
  })
  const retry = useMutation({
    mutationFn: (id: number) => socialApi.retry(id, true),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'social', 'publications'] }),
  })
  const republish = useMutation({
    mutationFn: (id: number) => socialApi.republish(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'social', 'publications'] }),
  })

  const requestRepublish = (id: number) => {
    if (!window.confirm(
      '기존 게시물을 Instagram 또는 Threads에서 삭제했는지 확인해주세요.\n'
      + '기존 이력은 보존하고 새로운 재등록 요청을 생성합니다.',
    )) return
    republish.mutate(id)
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        원본 수정·삭제는 Meta 게시물에 반영되지 않습니다. SNS 게시물을 삭제하려면 게시물 링크를 열어
        Instagram 또는 Threads에서 직접 삭제하세요.
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(['INSTAGRAM', 'THREADS'] as SocialPlatform[]).map((value) => (
          <button key={value} type="button" onClick={() => { setPlatform(value); setPage(0) }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              platform === value ? 'bg-primary-800 text-white' : 'border border-neutral-300 bg-white text-neutral-600'
            }`}>
            {value === 'INSTAGRAM' ? 'Instagram' : 'Threads'}
          </button>
        ))}
        <select value={status} onChange={(event) => { setStatus(event.target.value as SocialPublicationStatus | ''); setPage(0) }}
          className="ml-auto rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm">
          <option value="">전체 상태</option>
          {STATUS_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>
      {isLoading ? <p className="py-12 text-center text-neutral-400">불러오는 중...</p> : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {(data?.content ?? []).length === 0 ? (
            <p className="py-12 text-center text-sm text-neutral-400">게시 이력이 없습니다.</p>
          ) : (data?.content ?? []).map((item) => (
            <div key={item.id} className="grid gap-3 border-b border-neutral-100 p-4 last:border-0 md:grid-cols-[110px_1fr_auto]">
              <div>
                {item.renderedImageUrl
                  ? <img src={item.renderedImageUrl} alt="" className="aspect-[4/5] w-24 rounded-lg object-cover" />
                  : <div className="aspect-[4/5] w-24 rounded-lg bg-neutral-100" />}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm text-neutral-900">{item.sourceType} #{item.sourceId}</strong>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${adminStatusClass(item.status)}`}>
                    {item.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  요청 {new Date(item.createdAt).toLocaleString('ko-KR')}
                  {item.publishedAt && ` · 발행 ${new Date(item.publishedAt).toLocaleString('ko-KR')}`}
                </p>
                {item.lastError && <p className="mt-2 break-words text-xs text-red-600">{item.lastError}</p>}
              </div>
              <div className="flex items-start gap-2">
                {item.permalink && (
                  <a href={item.permalink} target="_blank" rel="noopener noreferrer"
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700">
                    게시물 열기
                  </a>
                )}
                {item.canRetry && (
                  <button type="button" disabled={retry.isPending} onClick={() => retry.mutate(item.id)}
                    className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                    다시 발행
                  </button>
                )}
                {(item.status === 'PUBLISHED' || item.status === 'EXTERNALLY_DELETED') && (
                  <button type="button" disabled={republish.isPending} onClick={() => requestRepublish(item.id)}
                    className="rounded-lg bg-primary-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                    재등록 요청
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {data && data.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}
            className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">이전</button>
          <span className="px-3 py-2 text-sm">{page + 1} / {data.totalPages}</span>
          <button type="button" disabled={data.last} onClick={() => setPage((value) => value + 1)}
            className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">다음</button>
        </div>
      )}
    </section>
  )
}

function TemplatePanel() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [editingBackground, setEditingBackground] = useState<string | null>(null)
  const [selectedFileName, setSelectedFileName] = useState('')
  const [ordered, setOrdered] = useState<SocialTemplate[]>([])
  const [isSortDirty, setIsSortDirty] = useState(false)
  const { data: templates } = useQuery({
    queryKey: ['admin', 'social', 'templates'],
    queryFn: socialApi.templates,
  })

  // 서버 응답은 이미 displayOrder 오름차순 — 앞에서 뒤가 곧 사용자 배경 목록 순서다.
  useEffect(() => {
    if (!templates) return
    setOrdered(templates)
    setIsSortDirty(false)
  }, [templates])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const save = useMutation({
    mutationFn: () => socialApi.createTemplate({
      name: name.trim(),
      backgroundImageUrl: imageUrl,
      active: true,
    }),
    onSuccess: () => {
      setName('')
      setImageUrl('')
      setSelectedFileName('')
      queryClient.invalidateQueries({ queryKey: ['admin', 'social', 'templates'] })
      queryClient.invalidateQueries({ queryKey: ['social', 'capabilities'] })
    },
  })
  const toggle = useMutation({
    mutationFn: (template: SocialTemplate) => socialApi.updateTemplate(template.id, {
      name: template.name,
      backgroundImageUrl: template.backgroundImageUrl,
      active: !template.active,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'social', 'templates'] }),
  })
  const reorder = useMutation({
    mutationFn: (ids: number[]) => socialApi.reorderTemplates(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'social', 'templates'] })
      queryClient.invalidateQueries({ queryKey: ['social', 'capabilities'] })
      setIsSortDirty(false)
    },
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setOrdered((items) => {
      const oldIndex = items.findIndex((i) => String(i.id) === active.id)
      const newIndex = items.findIndex((i) => String(i.id) === over.id)
      setIsSortDirty(true)
      return arrayMove(items, oldIndex, newIndex)
    })
  }

  useEffect(() => {
    const source = editingBackground
    return () => {
      if (source) URL.revokeObjectURL(source)
    }
  }, [editingBackground])

  const saveEditedBackground = async (file: File) => {
    setUploading(true)
    try {
      const uploaded = await socialApi.uploadBackground(file)
      setImageUrl(uploaded.imageUrl)
      setEditingBackground(null)
    } finally {
      setUploading(false)
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <div className="h-fit space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
        <div>
          <h2 className="font-bold text-neutral-900">배경 등록</h2>
          <p className="mt-1 text-xs leading-5 text-neutral-500">
            권장 해상도 1080×1350px(4:5). 이미지를 선택하면 권장 비율로 자른 뒤 JPEG로 저장합니다.
          </p>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-neutral-700">배경 이름</span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={100}
            placeholder="예: 기본 앰버 배경"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          <span className="mt-1.5 block text-xs leading-5 text-neutral-500">
            썸네일 선택 화면에서 배경을 구분할 관리용 이름입니다. SNS 게시물에는 표시되지 않습니다.
          </span>
        </label>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-neutral-700">배경 이미지</p>
          <div className="flex min-w-0 items-center overflow-hidden rounded-lg border border-neutral-300 bg-white">
            <input id="social-template-background-file" type="file"
              accept="image/jpeg,image/png,image/webp" disabled={uploading} className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.currentTarget.value = ''
                if (!file) return
                setSelectedFileName(file.name)
                setEditingBackground(URL.createObjectURL(file))
              }} />
            <label htmlFor="social-template-background-file"
              className={`shrink-0 border-r border-neutral-300 px-3 py-2 text-sm font-semibold transition-colors ${
                uploading
                  ? 'cursor-not-allowed bg-neutral-100 text-neutral-400'
                  : 'cursor-pointer bg-primary-50 text-primary-800 hover:bg-primary-100'
              }`}>
              {uploading ? '업로드 중...' : '파일 선택'}
            </label>
            <span className={`min-w-0 flex-1 truncate px-3 py-2 text-sm ${
              selectedFileName || imageUrl ? 'text-neutral-700' : 'text-neutral-400'
            }`} title={selectedFileName || undefined}>
              {selectedFileName || (imageUrl ? '이미지 업로드 완료' : '선택된 파일 없음')}
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-5 text-neutral-500">
            JPG, PNG, WebP 파일을 선택할 수 있으며, 선택 후 편집기에서 4:5 비율로 자릅니다.
          </p>
        </div>
        {imageUrl && <img src={imageUrl} alt="" className="mx-auto aspect-[4/5] w-40 rounded-lg object-cover" />}
        <button type="button" disabled={!name.trim() || !imageUrl || save.isPending} onClick={() => save.mutate()}
          className="w-full rounded-lg bg-primary-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
          등록
        </button>
        {editingBackground && (
          <ImageEditorModal
            open
            onClose={() => {
              setEditingBackground(null)
              setSelectedFileName('')
            }}
            imageSrc={editingBackground}
            onSave={saveEditedBackground}
            isSaving={uploading}
            fixedRatio="4:5"
            initialMode="crop"
            outputSize={{ width: 1080, height: 1350 }}
            recommendedResolution="SNS 소식 배경 권장 해상도: 1080×1350px (4:5)"
          />
        )}
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-neutral-500">
            앞에서 뒤 순서가 사용자 썸네일 배경 목록 순서입니다. 드래그로 순서를 바꾸세요.
          </p>
          {isSortDirty && (
            <button type="button" disabled={reorder.isPending}
              onClick={() => reorder.mutate(ordered.map((template) => template.id))}
              className="shrink-0 rounded-lg bg-primary-800 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">
              {reorder.isPending ? '저장 중...' : '순서 저장'}
            </button>
          )}
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ordered.map((t) => String(t.id))} strategy={rectSortingStrategy}>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {ordered.map((template) => (
                <SortableTemplateCard
                  key={template.id}
                  template={template}
                  onToggle={() => toggle.mutate(template)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </section>
  )
}

function SortableTemplateCard({ template, onToggle }: { template: SocialTemplate; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(template.id),
  })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <article ref={setNodeRef} style={style}
      className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <img src={template.backgroundImageUrl} alt="" className="aspect-[4/5] w-full object-cover" />
      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <strong className="truncate text-sm">{template.name}</strong>
          <button type="button" {...attributes} {...listeners} aria-label="순서 변경"
            className="shrink-0 cursor-grab touch-none p-1 text-neutral-300 hover:text-neutral-500 active:cursor-grabbing">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="8" x2="20" y2="8" strokeLinecap="round" />
              <line x1="4" y1="12" x2="20" y2="12" strokeLinecap="round" />
              <line x1="4" y1="16" x2="20" y2="16" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <button type="button" onClick={onToggle}
          className={`w-full rounded-lg px-3 py-2 text-xs font-semibold ${
            template.active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'
          }`}>
          {template.active ? '사용 중 · 비활성화' : '비활성 · 다시 사용'}
        </button>
      </div>
    </article>
  )
}

function AccountPanel() {
  const queryClient = useQueryClient()
  const [verificationFeedback, setVerificationFeedback] = useState<{
    platform: SocialPlatform
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const { data: accounts = [] } = useQuery({
    queryKey: ['admin', 'social', 'accounts'],
    queryFn: socialApi.accounts,
  })
  const connect = useMutation({
    mutationFn: socialApi.startOAuth,
    onSuccess: ({ authorizationUrl }) => window.location.assign(authorizationUrl),
  })
  const verify = useMutation({
    mutationFn: socialApi.verifyAccount,
    onMutate: () => setVerificationFeedback(null),
    onSuccess: (account, platform) => {
      queryClient.setQueryData<SocialAccount[]>(
        ['admin', 'social', 'accounts'],
        (current = []) => current.map((item) => item.platform === platform ? account : item),
      )
      if (account.status === 'CONNECTED') {
        setVerificationFeedback({
          platform,
          type: 'success',
          message: '연결이 정상입니다. Meta API로 공식 계정 정보를 확인했습니다.',
        })
      } else {
        setVerificationFeedback({
          platform,
          type: 'error',
          message: `연결 확인에 실패했습니다. 현재 상태: ${account.status}`,
        })
      }
    },
    onError: (_error, platform) => {
      setVerificationFeedback({
        platform,
        type: 'error',
        message: '연결 확인 요청에 실패했습니다. 잠시 후 다시 시도해주세요.',
      })
    },
  })
  const disconnect = useMutation({
    mutationFn: socialApi.disconnectAccount,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'social', 'accounts'] }),
  })
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {(['INSTAGRAM', 'THREADS'] as SocialPlatform[]).map((platform) => {
        const account = accounts.find((item) => item.platform === platform)
        const isVerifying = verify.isPending && verify.variables === platform
        const feedback = verificationFeedback?.platform === platform
          ? verificationFeedback
          : null
        return (
          <article key={platform} className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="text-lg font-bold">{platform === 'INSTAGRAM' ? 'Instagram' : 'Threads'}</h2>
            {account ? (
              <>
                <p className="mt-2 text-sm text-neutral-600">@{account.username ?? account.externalUserId}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  상태 {account.status} · 만료 {new Date(account.tokenExpiresAt).toLocaleString('ko-KR')}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  최근 확인 {account.lastVerifiedAt
                    ? new Date(account.lastVerifiedAt).toLocaleString('ko-KR')
                    : '확인 전'}
                </p>
                {account.lastError && <p className="mt-2 text-xs text-red-600">{account.lastError}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => verify.mutate(platform)}
                    disabled={verify.isPending}
                    aria-busy={isVerifying}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold disabled:cursor-wait disabled:opacity-60">
                    {isVerifying && (
                      <span aria-hidden="true"
                        className="h-3 w-3 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" />
                    )}
                    {isVerifying ? '연결 확인 중...' : '연결 확인'}
                  </button>
                  <button type="button" onClick={() => connect.mutate(platform)}
                    className="rounded-lg bg-primary-800 px-3 py-2 text-xs font-semibold text-white">다시 연결</button>
                  <button type="button" onClick={() => {
                    if (window.confirm('공식 계정 연결과 저장된 토큰을 삭제하시겠습니까?')) disconnect.mutate(platform)
                  }} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600">
                    연결 해제
                  </button>
                </div>
                {feedback && (
                  <p role={feedback.type === 'error' ? 'alert' : 'status'} aria-live="polite"
                    className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
                      feedback.type === 'success'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-red-200 bg-red-50 text-red-700'
                    }`}>
                    {feedback.message}
                  </p>
                )}
              </>
            ) : (
              <button type="button" onClick={() => connect.mutate(platform)}
                className="mt-4 rounded-lg bg-primary-800 px-4 py-2.5 text-sm font-semibold text-white">
                공식 계정 연결
              </button>
            )}
          </article>
        )
      })}
    </section>
  )
}

const STATUS_OPTIONS: SocialPublicationStatus[] = [
  'WAITING_SOURCE', 'QUEUED', 'RENDERING', 'CONTAINER_CREATED', 'PUBLISHING',
  'VERIFYING', 'PUBLISHED', 'RETRY_WAIT', 'FAILED', 'CANCELED', 'EXTERNALLY_DELETED',
]

function adminStatusClass(status: SocialPublicationStatus) {
  if (status === 'PUBLISHED') return 'bg-emerald-100 text-emerald-700'
  if (status === 'FAILED' || status === 'EXTERNALLY_DELETED') return 'bg-red-100 text-red-700'
  if (status === 'VERIFYING') return 'bg-amber-100 text-amber-700'
  return 'bg-blue-100 text-blue-700'
}
