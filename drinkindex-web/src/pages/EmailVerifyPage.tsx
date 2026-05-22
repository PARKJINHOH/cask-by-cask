import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { AxiosError } from 'axios'
import { authApi } from '@/domain/auth/api/authApi'
import Button from '@/shared/components/Button'
import SeoMeta from '@/shared/components/SeoMeta'
import type { ApiResponse } from '@/shared/types/common.types'

const CODE_TTL = 5 * 60 // 5분 (초)
const COOLDOWN = 60      // 재발송 쿨다운 (초)

export default function EmailVerifyPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()

  const email = (location.state as { email?: string } | null)?.email ?? ''

  const [code, setCode]               = useState('')
  const [error, setError]             = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [timeLeft, setTimeLeft]       = useState(CODE_TTL)
  const [cooldown, setCooldown]       = useState(COOLDOWN)
  const [resending, setResending]     = useState(false)

  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 이메일 없이 직접 접근 시 리다이렉트
  useEffect(() => {
    if (!email) navigate('/signup', { replace: true })
  }, [email, navigate])

  // OTP 만료 카운트다운
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current!)
  }, [])

  // 재발송 쿨다운 카운트다운
  useEffect(() => {
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(cooldownRef.current!)
  }, [])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 6) {
      setError(t('emailVerify.errors.invalidCode'))
      return
    }
    setIsSubmitting(true)
    setError('')
    try {
      await authApi.verifyEmail({ email, code })
      navigate('/login', { replace: true, state: { verifySuccess: true } })
    } catch (err) {
      const apiCode = (err as AxiosError<ApiResponse<unknown>>)?.response?.data?.code
      if (apiCode === 'USER_007') {
        setError(t('emailVerify.errors.expired'))
      } else if (apiCode === 'USER_006') {
        setError(t('emailVerify.errors.invalidCode'))
      } else {
        setError(t('emailVerify.errors.generic'))
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResend = useCallback(async () => {
    if (cooldown > 0 || resending) return
    setResending(true)
    setError('')
    try {
      await authApi.sendVerificationCode(email)
      setTimeLeft(CODE_TTL)
      setCooldown(COOLDOWN)
      clearInterval(timerRef.current!)
      clearInterval(cooldownRef.current!)
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) { clearInterval(timerRef.current!); return 0 }
          return prev - 1
        })
      }, 1000)
      cooldownRef.current = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) { clearInterval(cooldownRef.current!); return 0 }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      const apiCode = (err as AxiosError<ApiResponse<unknown>>)?.response?.data?.code
      if (apiCode === 'USER_008') {
        setError(t('emailVerify.errors.cooldown'))
      } else {
        setError(t('emailVerify.errors.generic'))
      }
    } finally {
      setResending(false)
    }
  }, [cooldown, resending, email, t])

  if (!email) return null

  return (
    <div className="min-h-[calc(100vh-9rem)] flex items-center justify-center px-4 py-12">
      <SeoMeta title={t('emailVerify.title')} description="DrinkIndex 이메일 인증." noindex />
      <div className="w-full max-w-sm">

        {/* Branding */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block text-2xl font-bold text-primary-800 tracking-tight">
            DrinkIndex
          </Link>
          <h1 className="mt-3 text-xl font-semibold text-neutral-900">{t('emailVerify.title')}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t('emailVerify.sentTo', { email })}</p>
        </div>

        {/* 만료 타이머 */}
        <div className={`mb-4 text-center text-sm font-medium ${timeLeft <= 60 ? 'text-danger-500' : 'text-neutral-500'}`}>
          {timeLeft > 0
            ? t('emailVerify.expires', { time: formatTime(timeLeft) })
            : t('emailVerify.expired')}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              {t('emailVerify.code')}
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder={t('emailVerify.codePlaceholder')}
              disabled={timeLeft === 0}
              className="w-full px-3 py-2 text-center text-2xl tracking-widest font-mono border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-neutral-100 disabled:text-neutral-400"
            />
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 px-3 py-2.5 bg-danger-50 border border-danger-200 rounded-lg">
              <svg className="w-4 h-4 text-danger-500 flex-shrink-0 mt-px" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              <p className="text-sm text-danger-700 leading-relaxed">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            isLoading={isSubmitting}
            fullWidth
            disabled={code.length !== 6 || timeLeft === 0}
            className="!mt-6"
          >
            {t('emailVerify.verify')}
          </Button>
        </form>

        {/* 재발송 */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
            className="text-sm text-primary-800 font-semibold hover:underline disabled:text-neutral-400 disabled:no-underline disabled:cursor-not-allowed"
          >
            {cooldown > 0
              ? t('emailVerify.resendIn', { seconds: cooldown })
              : t('emailVerify.resend')}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-neutral-500">
          <Link to="/login" className="text-neutral-500 hover:underline">
            {t('emailVerify.backToLogin')}
          </Link>
        </p>
      </div>
    </div>
  )
}
