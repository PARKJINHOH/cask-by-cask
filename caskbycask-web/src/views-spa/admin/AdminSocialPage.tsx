import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AdminPageHeader from '@/shared/components/AdminPageHeader'
import { socialApi } from '@/domain/social/api/socialApi'
import type {
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
  const [displayOrder, setDisplayOrder] = useState(0)
  const [uploading, setUploading] = useState(false)
  const { data: templates = [] } = useQuery({
    queryKey: ['admin', 'social', 'templates'],
    queryFn: socialApi.templates,
  })
  const save = useMutation({
    mutationFn: () => socialApi.createTemplate({
      name: name.trim(),
      backgroundImageUrl: imageUrl,
      active: true,
      displayOrder,
    }),
    onSuccess: () => {
      setName('')
      setImageUrl('')
      setDisplayOrder(0)
      queryClient.invalidateQueries({ queryKey: ['admin', 'social', 'templates'] })
      queryClient.invalidateQueries({ queryKey: ['social', 'capabilities'] })
    },
  })
  const toggle = useMutation({
    mutationFn: (template: SocialTemplate) => socialApi.updateTemplate(template.id, {
      name: template.name,
      backgroundImageUrl: template.backgroundImageUrl,
      active: !template.active,
      displayOrder: template.displayOrder,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'social', 'templates'] }),
  })

  return (
    <section className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <div className="h-fit space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
        <div>
          <h2 className="font-bold text-neutral-900">배경 등록</h2>
          <p className="mt-1 text-xs text-neutral-500">업로드 시 1080×1350 JPEG로 정규화됩니다.</p>
        </div>
        <input value={name} onChange={(event) => setName(event.target.value)} maxLength={100}
          placeholder="배경 이름" className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
        <input type="number" min={0} max={10000} value={displayOrder}
          onChange={(event) => setDisplayOrder(Number(event.target.value))}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
        <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading}
          onChange={async (event) => {
            const file = event.target.files?.[0]
            if (!file) return
            setUploading(true)
            try {
              const uploaded = await socialApi.uploadBackground(file)
              setImageUrl(uploaded.imageUrl)
            } finally {
              setUploading(false)
            }
          }} />
        {imageUrl && <img src={imageUrl} alt="" className="mx-auto aspect-[4/5] w-40 rounded-lg object-cover" />}
        <button type="button" disabled={!name.trim() || !imageUrl || save.isPending} onClick={() => save.mutate()}
          className="w-full rounded-lg bg-primary-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
          등록
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
          <article key={template.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <img src={template.backgroundImageUrl} alt="" className="aspect-[4/5] w-full object-cover" />
            <div className="space-y-2 p-3">
              <div className="flex items-center justify-between gap-2">
                <strong className="truncate text-sm">{template.name}</strong>
                <span className="text-xs text-neutral-400">#{template.displayOrder}</span>
              </div>
              <button type="button" onClick={() => toggle.mutate(template)}
                className={`w-full rounded-lg px-3 py-2 text-xs font-semibold ${
                  template.active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'
                }`}>
                {template.active ? '사용 중 · 비활성화' : '비활성 · 다시 사용'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function AccountPanel() {
  const queryClient = useQueryClient()
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'social', 'accounts'] }),
  })
  const disconnect = useMutation({
    mutationFn: socialApi.disconnectAccount,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'social', 'accounts'] }),
  })
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {(['INSTAGRAM', 'THREADS'] as SocialPlatform[]).map((platform) => {
        const account = accounts.find((item) => item.platform === platform)
        return (
          <article key={platform} className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="text-lg font-bold">{platform === 'INSTAGRAM' ? 'Instagram' : 'Threads'}</h2>
            {account ? (
              <>
                <p className="mt-2 text-sm text-neutral-600">@{account.username ?? account.externalUserId}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  상태 {account.status} · 만료 {new Date(account.tokenExpiresAt).toLocaleString('ko-KR')}
                </p>
                {account.lastError && <p className="mt-2 text-xs text-red-600">{account.lastError}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => verify.mutate(platform)}
                    className="rounded-lg border px-3 py-2 text-xs font-semibold">연결 확인</button>
                  <button type="button" onClick={() => connect.mutate(platform)}
                    className="rounded-lg bg-primary-800 px-3 py-2 text-xs font-semibold text-white">다시 연결</button>
                  <button type="button" onClick={() => {
                    if (window.confirm('공식 계정 연결과 저장된 토큰을 삭제하시겠습니까?')) disconnect.mutate(platform)
                  }} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600">
                    연결 해제
                  </button>
                </div>
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
