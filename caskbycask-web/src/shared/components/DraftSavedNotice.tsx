import { useTranslation } from 'react-i18next'

interface DraftSavedNoticeProps {
  // ISO 문자열 (마지막 임시저장 시각). null이면 표시 안 함.
  savedAt: string | null
}

// 에디터 아래에 표시되는 "임시저장됨 · 날짜/시간" 안내 문구 (작게)
export default function DraftSavedNotice({ savedAt }: DraftSavedNoticeProps) {
  const { t, i18n } = useTranslation()
  if (!savedAt) return null

  const locale = i18n.language === 'ko' ? 'ko-KR' : 'en-US'
  const dt = new Date(savedAt).toLocaleString(locale, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
  return (
    <p className="mt-1.5 flex items-center gap-1 text-xs text-neutral-400">
      <svg className="w-3 h-3 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      {t('post.draft.savedTime', { time: dt, defaultValue: `임시저장됨 · ${dt}` })}
    </p>
  )
}
