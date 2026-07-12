import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import type { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import { authApi } from '@/domain/auth/api/authApi'
import { useAuth } from '@/domain/auth/hooks/useAuth'
import Button from '@/shared/components/Button'
import Input from '@/shared/components/Input'
import SeoMeta from '@/shared/components/SeoMeta'
import type { ApiResponse } from '@/shared/types/common.types'

interface OAuthSignupState {
  signupTicket: string
  email: string | null
  emailVerified: boolean
  suggestedNickname: string | null
  provider: string
  returnTo?: string
}

const NICKNAME_RE = /^[가-힣a-zA-Z0-9]+$/

/**
 * 소셜 신규가입 완료 — 콜백(NEEDS_SIGNUP)에서 넘어온 티켓으로 닉네임/약관(+필요 시 이메일 인증)을 받아
 * 계정을 생성하고 로그인까지 처리한다. 직접 접근 시(상태 없음) 로그인으로 보낸다.
 */
export default function OAuthSignupPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { establishOAuthSession } = useAuth()
  const state = location.state as OAuthSignupState | null

  // 제공자가 검증된 이메일을 주지 않은 경우에만 이메일 입력+인증코드 필요
  const needsEmail = !state?.emailVerified || !state?.email

  const [nickname, setNickname] = useState(state?.suggestedNickname ?? '')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false)
  const [emailSubscribed, setEmailSubscribed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  if (!state?.signupTicket) {
    return <Navigate to="/login" replace />
  }

  const handleSendCode = async () => {
    setError('')
    setInfo('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t('auth.oauthSignup.emailInvalid'))
      return
    }
    setSending(true)
    try {
      const check = await authApi.checkEmailAvailable(email)
      if (!check.data.data?.available) {
        setError(t('auth.oauthSignup.emailTaken'))
        return
      }
      await authApi.sendVerificationCode(email)
      setCodeSent(true)
      setInfo(t('auth.oauthSignup.codeSent'))
    } catch {
      setError(t('auth.oauthSignup.codeSendFailed'))
    } finally {
      setSending(false)
    }
  }

  const validate = (): string | null => {
    if (nickname.length < 2 || nickname.length > 8 || !NICKNAME_RE.test(nickname)) {
      return t('auth.oauthSignup.nicknameInvalid')
    }
    if (!agreedToTerms || !agreedToPrivacy) return t('auth.oauthSignup.consentRequired')
    if (needsEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return t('auth.oauthSignup.emailInvalid')
      if (code.length !== 6) return t('auth.oauthSignup.codeRequired')
    }
    return null
  }

  const handleSubmit = async () => {
    setError('')
    const v = validate()
    if (v) { setError(v); return }
    setSubmitting(true)
    try {
      const res = await authApi.oauthSignup({
        signupTicket: state.signupTicket,
        nickname,
        email: needsEmail ? email : undefined,
        emailCode: needsEmail ? code : undefined,
        agreedToTerms,
        agreedToPrivacy,
        emailSubscribed,
      })
      await establishOAuthSession(res.data.data!)
      navigate(state.returnTo ?? '/', { replace: true })
    } catch (err) {
      const data = (err as AxiosError<ApiResponse<unknown>>)?.response?.data
      const code = data?.code
      if (code === 'USER_003') setError(t('auth.oauthSignup.nicknameTaken'))
      else if (code === 'USER_002') setError(t('auth.oauthSignup.emailTaken'))
      else if (code === 'USER_006') setError(t('auth.oauthSignup.codeInvalid'))
      else if (code === 'USER_007') setError(t('auth.oauthSignup.codeExpired'))
      else if (code === 'OAUTH_003') setError(t('auth.oauthSignup.ticketExpired'))
      else setError(data?.message ?? t('auth.oauthSignup.failed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-9rem)] flex items-center justify-center px-4 py-12">
      <SeoMeta title={t('auth.oauthSignup.title')} noindex />
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block text-2xl font-bold text-primary-800 tracking-tight">
            CaskByCask
          </Link>
          <h1 className="mt-3 text-xl font-semibold text-neutral-900">{t('auth.oauthSignup.title')}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {t('auth.oauthSignup.subtitle', { provider: t(`auth.social.providerName.${state.provider}`) })}
          </p>
        </div>

        <div className="space-y-4">
          {/* 닉네임 */}
          <Input
            label={t('auth.nickname')}
            placeholder={t('auth.oauthSignup.nicknameHint')}
            maxLength={8}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />

          {/* 이메일 인증 (제공자 이메일 미제공/미인증 시) */}
          {needsEmail && (
            <div className="space-y-2">
              <div className="flex gap-2 items-start">
                <Input
                  label={t('auth.email')}
                  type="email"
                  placeholder="example@email.com"
                  maxLength={255}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setCodeSent(false) }}
                  className="flex-1"
                />
              </div>
              <Button variant="secondary" size="sm" isLoading={sending} onClick={handleSendCode}>
                {codeSent ? t('auth.oauthSignup.resendCode') : t('auth.oauthSignup.sendCode')}
              </Button>
              {codeSent && (
                <Input
                  label={t('auth.oauthSignup.code')}
                  placeholder={t('auth.oauthSignup.codeHint')}
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                />
              )}
            </div>
          )}

          {needsEmail && state.email && !state.emailVerified && (
            <p className="text-xs text-amber-600">{t('auth.oauthSignup.emailUnverifiedNotice')}</p>
          )}

          {/* 약관 */}
          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <span className="flex items-center gap-2 min-w-0">
                <input type="checkbox" checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="w-4 h-4 shrink-0 rounded accent-primary-800" />
                <span className="text-sm text-neutral-700 truncate">{t('auth.signup.terms.agreeTerms')}</span>
              </span>
              <Link to="/terms" target="_blank" className="shrink-0 text-xs text-primary-800 hover:underline">
                {t('auth.signup.terms.viewFull')}
              </Link>
            </label>
            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <span className="flex items-center gap-2 min-w-0">
                <input type="checkbox" checked={agreedToPrivacy}
                  onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                  className="w-4 h-4 shrink-0 rounded accent-primary-800" />
                <span className="text-sm text-neutral-700 truncate">{t('auth.signup.terms.agreePrivacy')}</span>
              </span>
              <Link to="/privacy" target="_blank" className="shrink-0 text-xs text-primary-800 hover:underline">
                {t('auth.signup.terms.viewFull')}
              </Link>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={emailSubscribed}
                onChange={(e) => setEmailSubscribed(e.target.checked)}
                className="w-4 h-4 shrink-0 rounded accent-primary-800" />
              <span className="text-sm text-neutral-700 truncate">{t('auth.oauthSignup.agreeEmail')}</span>
            </label>
          </div>

          {info && <p className="text-sm text-green-600">{info}</p>}
          {error && <p className="text-sm text-danger-600">{error}</p>}

          <Button fullWidth isLoading={submitting} onClick={handleSubmit} className="!mt-6">
            {t('auth.oauthSignup.submit')}
          </Button>
        </div>
      </div>
    </div>
  )
}
