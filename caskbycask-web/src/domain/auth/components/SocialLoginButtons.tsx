import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { startOAuth } from '../oauth'
import type { SocialProvider } from '../types/auth.types'

/**
 * 로그인/회원가입 페이지의 소셜 로그인 버튼 (네이버·구글).
 * 클릭 시 인가 URL 을 받아 제공자로 이동한다. 콜백은 /oauth/callback 이 처리.
 */
export default function SocialLoginButtons({ returnTo }: { returnTo?: string }) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState<SocialProvider | null>(null)
  const [error, setError] = useState('')

  const handle = async (provider: SocialProvider) => {
    setError('')
    setLoading(provider)
    try {
      await startOAuth(provider, 'auth', returnTo)
    } catch {
      setLoading(null)
      setError(t('auth.social.startError'))
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-neutral-200" />
        <span className="text-xs text-neutral-400">{t('auth.social.divider')}</span>
        <span className="h-px flex-1 bg-neutral-200" />
      </div>

      {/* 네이버 */}
      <button
        type="button"
        onClick={() => handle('NAVER')}
        disabled={loading !== null}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#03C75A] px-4 py-2.5
          text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <span className="flex h-4 w-4 items-center justify-center font-bold leading-none">N</span>
        {t('auth.social.naver')}
      </button>

      {/* 구글 */}
      <button
        type="button"
        onClick={() => handle('GOOGLE')}
        disabled={loading !== null}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white
          px-4 py-2.5 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/>
          <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"/>
        </svg>
        {t('auth.social.google')}
      </button>

      {error && <p className="text-center text-xs text-danger-600">{error}</p>}
    </div>
  )
}
