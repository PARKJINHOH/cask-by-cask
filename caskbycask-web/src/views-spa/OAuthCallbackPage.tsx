import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authApi } from '@/domain/auth/api/authApi'
import { userApi } from '@/domain/user/api/userApi'
import { useAuth } from '@/domain/auth/hooks/useAuth'
import {
  OAUTH_MODE_KEY, OAUTH_PROVIDER_KEY, OAUTH_RETURN_TO_KEY, OAUTH_LINK_TICKET_KEY,
  oauthRedirectUri, clearOAuthSession,
} from '@/domain/auth/oauth'
import SeoMeta from '@/shared/components/SeoMeta'

/**
 * 소셜 제공자 콜백 처리 — 제공자가 code/state 와 함께 이 경로로 리다이렉트한다.
 * sessionStorage 의 mode(auth/link)·provider 로 의도를 판별해 분기한다.
 *   - auth: 콜백 → LOGIN(세션 수립) / NEEDS_SIGNUP(소셜 가입) / NEEDS_LINK(로그인 후 연동)
 *   - link: 마이페이지에서 현재 계정에 직접 연동(코드 기반)
 */
export default function OAuthCallbackPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { establishOAuthSession } = useAuth()
  const [error, setError] = useState('')
  const ran = useRef(false)

  useEffect(() => {
    // code 는 1회용 — StrictMode 의 effect 이중 실행로 인한 중복 교환 방지
    if (ran.current) return
    ran.current = true

    const code = params.get('code')
    const state = params.get('state')
    const providerError = params.get('error')
    const provider = sessionStorage.getItem(OAUTH_PROVIDER_KEY)
    const mode = sessionStorage.getItem(OAUTH_MODE_KEY) ?? 'auth'
    const returnTo = sessionStorage.getItem(OAUTH_RETURN_TO_KEY) ?? '/'
    const redirectUri = oauthRedirectUri()

    const fail = (msg: string, to: string) => {
      clearOAuthSession()
      setError(msg)
      setTimeout(() => navigate(to, { replace: true }), 1500)
    }

    if (providerError || !code || !state || !provider) {
      fail(t('auth.social.callbackError'), mode === 'link' ? '/mypage?tab=settings' : '/login')
      return
    }

    ;(async () => {
      try {
        if (mode === 'link') {
          // 마이페이지에서 현재 로그인 계정에 직접 연동
          await userApi.connectSocial({ provider, code, state, redirectUri })
          clearOAuthSession()
          navigate('/mypage?tab=settings', { replace: true, state: { socialConnected: provider } })
          return
        }

        // 로그인/가입 흐름
        const res = await authApi.oauthCallback({ provider, code, state, redirectUri })
        const data = res.data.data!
        if (data.status === 'LOGIN' && data.login) {
          await establishOAuthSession(data.login)
          clearOAuthSession()
          navigate(returnTo, { replace: true })
        } else if (data.status === 'NEEDS_SIGNUP') {
          clearOAuthSession()
          navigate('/oauth/signup', {
            replace: true,
            state: {
              signupTicket: data.signupTicket,
              email: data.email,
              emailVerified: data.emailVerified,
              suggestedNickname: data.suggestedNickname,
              provider,
            },
          })
        } else if (data.status === 'NEEDS_LINK' && data.linkTicket) {
          // 기존 이메일 계정 존재 → 로그인 후 연동. 티켓을 보관하고 로그인 페이지로.
          sessionStorage.setItem(OAUTH_LINK_TICKET_KEY, data.linkTicket)
          sessionStorage.removeItem(OAUTH_MODE_KEY)
          sessionStorage.removeItem(OAUTH_PROVIDER_KEY)
          navigate('/login', { replace: true, state: { socialLinkNotice: data.maskedEmail, provider } })
        } else {
          fail(t('auth.social.callbackError'), '/login')
        }
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        fail(msg ?? t('auth.social.callbackError'), mode === 'link' ? '/mypage?tab=settings' : '/login')
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-[calc(100vh-9rem)] flex items-center justify-center px-4 py-12">
      <SeoMeta title={t('auth.social.processing')} noindex />
      <div className="text-center">
        {error ? (
          <p className="text-sm text-danger-600">{error}</p>
        ) : (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-700" />
            <p className="text-sm text-neutral-500">{t('auth.social.processing')}</p>
          </>
        )}
      </div>
    </div>
  )
}
