import { useState } from 'react'
import AdminPageHeader from '@/shared/components/AdminPageHeader'
import AdminYoutubeChannelPanel from './components/AdminYoutubeChannelPanel'
import AdminYoutubeVideoPanel from './components/AdminYoutubeVideoPanel'

type Tab = 'channels' | 'videos'

/**
 * 유튜브 갤러리 관리.
 *
 * 채널 탭에서 승인·수집을 다루고, 영상 탭에서 개별 노출을 다룬다.
 * 화면을 둘로 나눈 이유 — 채널은 드물게 바뀌고 영상은 자동으로 계속 늘어난다.
 */
export default function AdminYoutubePage() {
  const [tab, setTab] = useState<Tab>('channels')

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <AdminPageHeader
        breadcrumbs={[{ label: '커뮤니티' }, { label: '유튜브 갤러리' }]}
        title="유튜브 갤러리"
      />

      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
        외부 창작자의 영상을 우리 화면에 싣는 기능입니다. <strong>채널 운영자의 게재 허락을 확인</strong>해야
        갤러리에 노출됩니다 — 허락 확인이 꺼져 있으면 &lsquo;노출&rsquo;을 켜도 목록에 나오지 않습니다.
        영상 자체는 유튜브에서 재생되며 조회수·재생시간은 수집하지 않습니다.
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto border-b border-neutral-200">
        {([['channels', '채널'], ['videos', '영상']] as Array<[Tab, string]>).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`border-b-2 px-4 py-3 text-sm font-semibold ${
              tab === value ? 'border-primary-800 text-primary-900' : 'border-transparent text-neutral-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'channels' ? <AdminYoutubeChannelPanel /> : <AdminYoutubeVideoPanel />}
    </div>
  )
}
