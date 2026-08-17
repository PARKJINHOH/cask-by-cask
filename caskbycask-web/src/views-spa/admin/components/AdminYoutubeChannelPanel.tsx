import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { youtubeApi } from '@/domain/youtube/api/youtubeApi'
import type {
  AdminYoutubeChannel,
  YoutubeSyncResult,
} from '@/domain/youtube/types/youtube.types'
import { extractApiErrorMessage } from '@/shared/utils/apiError'

/** 관리자 유튜브 채널 관리 — 등록·승인·수집. */
export default function AdminYoutubeChannelPanel() {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<AdminYoutubeChannel | null>(null)
  const [syncResult, setSyncResult] = useState<YoutubeSyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'youtube', 'channels'],
    queryFn: () => youtubeApi.adminChannels({ size: 100 }),
  })
  const channels = data?.content ?? []

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'youtube'] })
    queryClient.invalidateQueries({ queryKey: ['youtubeChannels'] })
    queryClient.invalidateQueries({ queryKey: ['youtubeVideos'] })
  }

  const syncAll = useMutation({
    mutationFn: youtubeApi.syncAll,
    onMutate: () => { setError(null); setSyncResult(null) },
    onSuccess: (result) => { setSyncResult(result); invalidate() },
    onError: (cause) => setError(extractApiErrorMessage(cause, '수집에 실패했습니다.')),
  })

  const syncOne = useMutation({
    mutationFn: youtubeApi.syncChannel,
    onMutate: () => { setError(null); setSyncResult(null) },
    onSuccess: (result) => { setSyncResult(result); invalidate() },
    onError: (cause) => setError(extractApiErrorMessage(cause, '수집에 실패했습니다.')),
  })

  const refreshProfile = useMutation({
    mutationFn: youtubeApi.refreshChannelProfile,
    onMutate: () => { setError(null); setSyncResult(null) },
    onSuccess: invalidate,
    onError: (cause) => setError(
      extractApiErrorMessage(cause, '프로필을 다시 가져오지 못했습니다.')),
  })

  const remove = useMutation({
    mutationFn: youtubeApi.deleteChannel,
    onSuccess: invalidate,
    onError: (cause) => setError(extractApiErrorMessage(cause, '삭제에 실패했습니다.')),
  })

  const requestRemove = (channel: AdminYoutubeChannel) => {
    if (!window.confirm(
      `'${channel.title}' 채널을 삭제하시겠습니까?\n`
      + `이 채널로 수집된 영상 ${channel.videoCount}편도 함께 삭제됩니다.\n`
      + '잠시 내리기만 하려면 삭제 대신 노출을 꺼주세요.',
    )) return
    remove.mutate(channel.id)
  }

  return (
    <section className="space-y-5">
      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {syncResult && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm">
          <p className="font-semibold text-neutral-800">
            수집 완료 — 채널 {syncResult.channelCount}곳, 새 영상 {syncResult.createdCount}편
          </p>
          <ul className="mt-2 space-y-1 text-xs">
            {syncResult.items.map((item) => (
              <li key={item.channelId} className={item.error ? 'text-red-600' : 'text-neutral-500'}>
                {item.channelTitle ?? `#${item.channelId}`} —{' '}
                {item.error ?? `신규 ${item.created}편 / 갱신 ${item.updated}편`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ChannelForm
        key={editing?.id ?? 'new'}
        editing={editing}
        onDone={() => { setEditing(null); invalidate() }}
        onCancel={() => setEditing(null)}
        onError={setError}
      />

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-neutral-700">등록된 채널 {channels.length}곳</h2>
        <button
          type="button"
          disabled={syncAll.isPending}
          onClick={() => syncAll.mutate()}
          className="rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 disabled:opacity-50"
        >
          {syncAll.isPending ? '수집 중...' : '전체 지금 수집'}
        </button>
      </div>

      {isLoading ? (
        <p className="py-12 text-center text-neutral-400">불러오는 중...</p>
      ) : channels.length === 0 ? (
        <p className="rounded-xl border border-neutral-200 bg-white py-12 text-center text-sm text-neutral-400">
          등록된 채널이 없습니다.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {channels.map((channel) => (
            <article key={channel.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-start gap-3">
                {channel.thumbnailUrl ? (
                  <img src={channel.thumbnailUrl} alt="" referrerPolicy="no-referrer"
                    className="size-11 shrink-0 rounded-full bg-neutral-100 object-cover" />
                ) : (
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-neutral-200 font-bold text-neutral-600">
                    {channel.title.charAt(0)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-neutral-900">{channel.title}</p>
                  <p className="truncate text-xs text-neutral-500">
                    {channel.handle ? `@${channel.handle}` : channel.channelKey} · 영상 {channel.videoCount}편
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <StatusChip on={channel.permissionConfirmed} onLabel="허락 확인" offLabel="허락 미확인" critical />
                <StatusChip on={channel.visible} onLabel="노출 중" offLabel="노출 꺼짐" />
                <StatusChip on={channel.syncEnabled} onLabel="자동 수집" offLabel="수집 정지" />
              </div>

              {!channel.permissionConfirmed && channel.visible && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  허락 확인이 꺼져 있어 노출을 켜도 갤러리에 나오지 않습니다.
                </p>
              )}
              {channel.lastSyncError && (
                <p className="mt-2 break-words rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  마지막 수집 실패: {channel.lastSyncError}
                </p>
              )}
              <p className="mt-2 text-xs text-neutral-400">
                마지막 수집{' '}
                {channel.lastSyncedAt
                  ? new Date(channel.lastSyncedAt).toLocaleString('ko-KR')
                  : '없음'}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setEditing(channel)}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700">
                  수정
                </button>
                <button type="button" disabled={syncOne.isPending}
                  onClick={() => syncOne.mutate(channel.id)}
                  className="rounded-lg bg-primary-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                  지금 수집
                </button>
                {/* 등록 당시 프로필을 못 읽었거나 창작자가 바꾼 경우 — 채널을 지웠다 다시 만들면
                    수집해 둔 영상과 노출 설정까지 날아가므로 이 버튼으로 갱신한다. */}
                <button type="button" disabled={refreshProfile.isPending}
                  onClick={() => refreshProfile.mutate(channel.id)}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 disabled:opacity-50">
                  {refreshProfile.isPending ? '가져오는 중...' : '프로필 다시 가져오기'}
                </button>
                <a href={channel.channelUrl} target="_blank" rel="noopener noreferrer"
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700">
                  채널 열기
                </a>
                <button type="button" onClick={() => requestRemove(channel)}
                  className="ml-auto rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600">
                  삭제
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function StatusChip({ on, onLabel, offLabel, critical = false }: {
  on: boolean; onLabel: string; offLabel: string; critical?: boolean
}) {
  const offClass = critical ? 'bg-red-100 text-red-700' : 'bg-neutral-100 text-neutral-500'
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
      on ? 'bg-emerald-100 text-emerald-700' : offClass
    }`}>
      {on ? onLabel : offLabel}
    </span>
  )
}

/** 채널 등록·수정 폼. 등록일 때만 채널 주소를 받는다(채널 ID 는 나중에 바꿀 수 없다). */
function ChannelForm({ editing, onDone, onCancel, onError }: {
  editing: AdminYoutubeChannel | null
  onDone: () => void
  onCancel: () => void
  onError: (message: string | null) => void
}) {
  const [channelUrl, setChannelUrl] = useState('')
  const [title, setTitle] = useState('')
  const [handle, setHandle] = useState('')
  const [description, setDescription] = useState('')
  const [descriptionEn, setDescriptionEn] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [visible, setVisible] = useState(true)
  const [syncEnabled, setSyncEnabled] = useState(true)
  const [permissionConfirmed, setPermissionConfirmed] = useState(false)
  const [permissionNote, setPermissionNote] = useState('')

  useEffect(() => {
    setChannelUrl('')
    setTitle(editing?.title ?? '')
    setHandle(editing?.handle ?? '')
    setDescription(editing?.description ?? '')
    setDescriptionEn(editing?.descriptionEn ?? '')
    setThumbnailUrl(editing?.thumbnailUrl ?? '')
    setVisible(editing?.visible ?? true)
    setSyncEnabled(editing?.syncEnabled ?? true)
    setPermissionConfirmed(editing?.permissionConfirmed ?? false)
    setPermissionNote(editing?.permissionNote ?? '')
  }, [editing])

  const save = useMutation({
    mutationFn: () => (editing
      ? youtubeApi.updateChannel(editing.id, {
        title: title.trim(),
        handle: handle.trim() || undefined,
        description: description.trim() || undefined,
        descriptionEn: descriptionEn.trim() || undefined,
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        visible,
        syncEnabled,
        permissionConfirmed,
        permissionNote: permissionNote.trim() || undefined,
      })
      : youtubeApi.createChannel({
        channelUrl: channelUrl.trim(),
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        descriptionEn: descriptionEn.trim() || undefined,
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        visible,
        syncEnabled,
        permissionConfirmed,
        permissionNote: permissionNote.trim() || undefined,
      })),
    onMutate: () => onError(null),
    onSuccess: () => {
      if (!editing) {
        setChannelUrl('')
        setTitle('')
        setDescription('')
        setDescriptionEn('')
        setPermissionNote('')
        setPermissionConfirmed(false)
      }
      onDone()
    },
    onError: (cause) => onError(extractApiErrorMessage(cause, '저장에 실패했습니다.')),
  })

  const canSave = editing ? title.trim().length > 0 : channelUrl.trim().length > 0

  return (
    <form
      onSubmit={(event) => { event.preventDefault(); save.mutate() }}
      className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-neutral-900">{editing ? '채널 수정' : '채널 등록'}</h2>
        {editing && (
          <button type="button" onClick={onCancel} className="text-xs font-semibold text-neutral-500">
            등록 모드로 돌아가기
          </button>
        )}
      </div>

      {!editing && (
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-neutral-700">채널 주소 *</span>
          <input value={channelUrl} onChange={(event) => setChannelUrl(event.target.value)}
            placeholder="https://www.youtube.com/@juryuhak"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          <span className="mt-1.5 block text-xs leading-5 text-neutral-500">
            채널 홈 주소(@핸들), 핸들만, 채널 ID(UC...) 중 아무거나 넣어도 됩니다.
            등록하면 곧바로 최신 영상을 한 번 수집합니다.
          </span>
        </label>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-neutral-700">
            채널명 {editing ? '*' : '(비우면 유튜브에서 가져옴)'}
          </span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
        </label>
        {editing && (
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-neutral-700">핸들</span>
            <input value={handle} onChange={(event) => setHandle(event.target.value)} maxLength={100}
              placeholder="juryuhak"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
          </label>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-neutral-700">소개 (한국어)</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)}
            maxLength={500} rows={2}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-neutral-700">소개 (영어)</span>
          <textarea value={descriptionEn} onChange={(event) => setDescriptionEn(event.target.value)}
            maxLength={500} rows={2}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-neutral-700">
          프로필 이미지 URL (비우면 유튜브에서 가져옴)
        </span>
        <input value={thumbnailUrl} onChange={(event) => setThumbnailUrl(event.target.value)}
          maxLength={1000}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
      </label>

      <fieldset className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <legend className="px-1 text-xs font-bold text-amber-900">게재 허락</legend>
        <label className="flex items-start gap-2 text-sm text-amber-900">
          <input type="checkbox" checked={permissionConfirmed}
            onChange={(event) => setPermissionConfirmed(event.target.checked)}
            className="mt-0.5" />
          <span>채널 운영자에게 갤러리 게재 허락을 받았습니다.</span>
        </label>
        <label className="mt-3 block">
          <span className="mb-1.5 block text-xs font-semibold text-amber-900">허락 확인 근거</span>
          <input value={permissionNote} onChange={(event) => setPermissionNote(event.target.value)}
            maxLength={500} placeholder="예: 2026-08-10 이메일 회신 / 인스타 DM 동의"
            className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm" />
          <span className="mt-1.5 block text-xs leading-5 text-amber-800">
            언제 어떤 경로로 허락을 받았는지 남겨 두면 나중에 문의가 왔을 때 근거가 됩니다.
          </span>
        </label>
      </fieldset>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} />
          갤러리에 노출
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" checked={syncEnabled}
            onChange={(event) => setSyncEnabled(event.target.checked)} />
          새 영상 자동 수집 (3시간마다)
        </label>
      </div>

      <button type="submit" disabled={!canSave || save.isPending}
        className="rounded-lg bg-primary-800 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
        {save.isPending ? '저장 중...' : editing ? '수정' : '등록하고 수집'}
      </button>
    </form>
  )
}
