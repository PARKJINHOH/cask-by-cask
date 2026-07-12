import { useState, useEffect, startTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom'
import type { AxiosError } from 'axios'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { useAuth } from '@/domain/auth/hooks/useAuth'
import { authApi } from '@/domain/auth/api/authApi'
import type { AdminCredentials } from '@/domain/auth/types/auth.types'
import { userApi } from '@/domain/user/api/userApi'
import SocialLoginButtons from '@/domain/auth/components/SocialLoginButtons'
import { OAUTH_LINK_TICKET_KEY } from '@/domain/auth/oauth'
import Button from '@/shared/components/Button'
import Input from '@/shared/components/Input'
import Modal from '@/shared/components/Modal'
import RouteFallback from '@/shared/components/RouteFallback'
import SeoMeta from '@/shared/components/SeoMeta'
import type { ApiResponse } from '@/shared/types/common.types'

// ── Validation schema ──────────────────────────────────────
const schema = z.object({
  email:    z.string().email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
})

type FormValues = z.infer<typeof schema>

const ADMIN_CREDENTIALS_ENABLED = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development'

interface SuspensionDetail {
  suspendedUntil: string
  reason: string | null
}

// ── Sub-components ─────────────────────────────────────────
function ErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert"
      className="flex items-start gap-2 px-3 py-2.5 bg-danger-50 border border-danger-200 rounded-lg">
      <svg className="w-4 h-4 text-danger-500 flex-shrink-0 mt-px" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      <p className="text-sm text-danger-700 leading-relaxed">{message}</p>
    </div>
  )
}

function UnverifiedBanner() {
  return (
    <div role="alert" className="bg-amber-50 border border-amber-300 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-100 border-b border-amber-300">
        <svg className="w-4 h-4 text-amber-600 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <p className="text-sm font-semibold text-amber-800">이메일 인증이 필요합니다</p>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-sm text-amber-900 leading-relaxed">
          이메일 인증이 완료되지 않은 계정입니다.{' '}
          <a href="/signup" className="font-semibold underline">회원가입</a>을 다시 진행하거나
          문의사항이 있으시면 고객센터로 연락해주세요.
        </p>
      </div>
    </div>
  )
}

function InactiveBanner() {
  return (
    <div role="alert" className="bg-neutral-100 border border-neutral-300 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-neutral-200 border-b border-neutral-300">
        <svg className="w-4 h-4 text-neutral-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <p className="text-sm font-semibold text-neutral-700">비활성화된 계정입니다</p>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-sm text-neutral-600 leading-relaxed">
          이 계정은 관리자에 의해 비활성화되었습니다. 문의사항이 있으시면 고객센터로 연락해 주세요.
        </p>
      </div>
    </div>
  )
}

function LockedBanner() {
  return (
    <div role="alert" className="bg-danger-50 border border-danger-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-danger-100 border-b border-danger-200">
        <svg className="w-4 h-4 text-danger-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
        <p className="text-sm font-semibold text-danger-700">계정이 일시적으로 잠겼습니다</p>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-sm text-danger-700 leading-relaxed">
          비밀번호를 5회 이상 잘못 입력하여 계정이 잠겼습니다.
          약 10분 후 다시 시도하거나, 비밀번호가 기억나지 않으면{' '}
          <Link to="/account-recovery?tab=password" className="font-semibold underline">
            비밀번호 재설정
          </Link>
          을 이용해주세요.
        </p>
      </div>
    </div>
  )
}

function SuspensionBanner({ detail }: { detail: SuspensionDetail }) {
  const until = new Date(detail.suspendedUntil).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  return (
    <div role="alert" className="bg-amber-50 border border-amber-300 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-100 border-b border-amber-300">
        <svg className="w-4 h-4 text-amber-600 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <p className="text-sm font-semibold text-amber-800">계정이 정지되었습니다</p>
      </div>
      <div className="px-3 py-2.5 space-y-1.5">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-amber-600 font-medium w-20 shrink-0">정지 해제일</span>
          <span className="text-amber-900">{until}</span>
        </div>
        {detail.reason && (
          <div className="flex items-start gap-2 text-sm">
            <span className="text-amber-600 font-medium w-20 shrink-0">사유</span>
            <span className="text-amber-900 leading-relaxed">{detail.reason}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 휴면 계정 해제 모달 ─────────────────────────────────────
function DormantReactivateModal({
  email,
  password,
  onClose,
  onSuccess,
}: {
  email: string
  password: string
  onClose: () => void
  onSuccess: (from: string) => void
}) {
  const { reactivate } = useAuth()
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const handleSendCode = async () => {
    setError('')
    setInfo('')
    setSending(true)
    try {
      await authApi.sendVerificationCode(email)
      setCodeSent(true)
      setInfo('인증 코드를 이메일로 발송했습니다. (5분 내 입력)')
    } catch (err) {
      const msg = (err as AxiosError<ApiResponse<unknown>>)?.response?.data?.message
      setError(msg ?? '인증 코드 발송에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setSending(false)
    }
  }

  const handleReactivate = async () => {
    setError('')
    setSubmitting(true)
    try {
      await reactivate({ email, password, code })
      onSuccess('/')
    } catch (err) {
      const msg = (err as AxiosError<ApiResponse<unknown>>)?.response?.data?.message
      setError(msg ?? '휴면 해제에 실패했습니다. 인증 코드를 확인해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="휴면 계정 해제" size="sm" closeOnOverlay={!submitting}>
      <div className="space-y-4">
        <p className="text-sm text-neutral-600 leading-relaxed">
          장기간 미접속으로 <strong>휴면 상태</strong>로 전환된 계정입니다.
          본인 확인을 위해 이메일 인증 후 휴면을 해제해주세요.
        </p>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-neutral-400 w-12 shrink-0">이메일</span>
          <span className="font-medium text-neutral-800 truncate">{email}</span>
        </div>

        {!codeSent ? (
          <Button fullWidth isLoading={sending} onClick={handleSendCode}>
            인증 코드 발송
          </Button>
        ) : (
          <div className="space-y-3">
            <Input
              label="인증 코드"
              placeholder="6자리 코드 입력"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
            <button
              type="button"
              onClick={handleSendCode}
              disabled={sending}
              className="text-xs text-primary-700 hover:underline disabled:opacity-50"
            >
              코드 재발송
            </button>
          </div>
        )}

        {info && <p className="text-sm text-green-600">{info}</p>}
        {error && <p className="text-sm text-danger-600">{error}</p>}

        {codeSent && (
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting}>
              취소
            </Button>
            <Button
              size="sm"
              isLoading={submitting}
              disabled={code.length < 6}
              onClick={handleReactivate}
            >
              휴면 해제하고 로그인
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Page ───────────────────────────────────────────────────
export default function LoginPage() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const isAuthReady = useAuthStore((s) => s.isAuthReady)
  const navigate   = useNavigate()
  const location   = useLocation()
  const { login }  = useAuth()
  const [suspensionDetail, setSuspensionDetail] = useState<SuspensionDetail | null>(null)
  const [showInactive, setShowInactive]         = useState(false)
  const [showUnverified, setShowUnverified]     = useState(false)
  const [showLocked, setShowLocked]             = useState(false)
  const [dormantCreds, setDormantCreds]         = useState<{ email: string; password: string } | null>(null)
  const [adminCreds, setAdminCreds]             = useState<AdminCredentials | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  useEffect(() => {
    if (!ADMIN_CREDENTIALS_ENABLED) return

    authApi.getAdminCredentials()
      .then((res) => {
        if (res.data.success && res.data.data) {
          setAdminCreds(res.data.data)
        }
      })
      .catch(() => {
        // Ignore. Failures are expected in prod environment where endpoint returns 404
      })
  }, [])

  const handleAdminLogin = async () => {
    if (!adminCreds) return
    setValue('email', adminCreds.email)
    setValue('password', adminCreds.password)
    await handleSubmit(onSubmit)()
  }


  const state = location.state as { from?: { pathname: string }; signupSuccess?: boolean; verifySuccess?: boolean; passwordResetSuccess?: boolean; socialLinkNotice?: string } | null
  const from = state?.from?.pathname ?? '/'
  const signupSuccess  = !!state?.signupSuccess
  const verifySuccess  = !!state?.verifySuccess
  const passwordResetSuccess = !!state?.passwordResetSuccess
  // 소셜 콜백 NEEDS_LINK → 본인확인용 로그인 안내(마스킹된 이메일)
  const socialLinkNotice = state?.socialLinkNotice

  // 이미 로그인된 사용자는 이전 페이지 또는 홈으로
  if (!isAuthReady) return <RouteFallback />
  if (isLoggedIn) return <Navigate to={from} replace />

  const onSubmit = async (data: FormValues) => {
    setSuspensionDetail(null)
    setShowInactive(false)
    setShowUnverified(false)
    setShowLocked(false)
    setDormantCreds(null)
    try {
      await login(data)
      // 소셜 연동 대기 티켓이 있으면 — 로그인(본인확인) 직후 현재 계정에 연동
      const linkTicket = sessionStorage.getItem(OAUTH_LINK_TICKET_KEY)
      if (linkTicket) {
        sessionStorage.removeItem(OAUTH_LINK_TICKET_KEY)
        try {
          await userApi.linkSocial(linkTicket)
        } catch {
          // 이미 연동됨 등 — 마이페이지에서 현황 확인 가능하므로 무시하고 이동
        }
        startTransition(() => {
          navigate(from !== '/' ? from : '/mypage?tab=settings', { replace: true, state: { socialLinked: true } })
        })
        return
      }
      startTransition(() => {
        navigate(from, { replace: true })
      })
    } catch (err) {
      const res = (err as AxiosError<ApiResponse<SuspensionDetail>>)?.response?.data
      const code = res?.code
      if (code === 'USER_005') {
        setShowUnverified(true)
      } else if (code === 'USER_016') {
        setShowInactive(true)
      } else if (code === 'USER_017' && res?.data) {
        setSuspensionDetail(res.data)
      } else if (code === 'USER_018') {
        // 휴면 계정 — 이메일 재인증 모달로 해제 유도
        setDormantCreds({ email: data.email, password: data.password })
      } else if (code === 'USER_019') {
        // 로그인 실패 누적으로 계정 잠금
        setShowLocked(true)
      } else {
        setError('root', { message: '이메일 또는 비밀번호가 올바르지 않습니다.' })
      }
    }
  }

  const handleReactivateSuccess = (to: string) => {
    setDormantCreds(null)
    startTransition(() => {
      navigate(to, { replace: true })
    })
  }

  return (
    <div className="min-h-[calc(100vh-9rem)] flex items-center justify-center px-4 py-12">
      <SeoMeta title="로그인" description="CaskByCask 로그인 페이지." noindex />
      <div className="w-full max-w-sm">

        {/* Branding */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block text-2xl font-bold text-primary-800 tracking-tight">
            CaskByCask
          </Link>
          <h1 className="mt-3 text-xl font-semibold text-neutral-900">로그인</h1>
          <p className="mt-1 text-sm text-neutral-500">계속하려면 로그인해주세요</p>
        </div>

        {/* 소셜 연동 본인확인 안내 (NEEDS_LINK) */}
        {socialLinkNotice && (
          <div className="mb-4 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 leading-relaxed">
            이미 <strong>{socialLinkNotice}</strong> 로 가입된 계정이 있습니다.
            본인 확인을 위해 기존 계정으로 로그인하면 소셜 계정이 자동으로 연동됩니다.
          </div>
        )}

        {/* 이메일 인증 완료 안내 */}
        {verifySuccess && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5l-3.5-3.5 1.41-1.41L10 13.67l6.59-6.59L18 8.5l-8 8z"/>
            </svg>
            이메일 인증이 완료되었습니다. 로그인해주세요.
          </div>
        )}

        {/* 비밀번호 재설정 완료 안내 */}
        {passwordResetSuccess && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5l-3.5-3.5 1.41-1.41L10 13.67l6.59-6.59L18 8.5l-8 8z"/>
            </svg>
            비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.
          </div>
        )}

        {/* 회원가입 완료 안내 (하위 호환) */}
        {signupSuccess && !verifySuccess && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5l-3.5-3.5 1.41-1.41L10 13.67l6.59-6.59L18 8.5l-8 8z"/>
            </svg>
            회원가입이 완료되었습니다. 로그인해주세요.
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Input
            label="이메일"
            type="email"
            placeholder="example@email.com"
            autoComplete="email"
            maxLength={255}
            {...register('email')}
            error={errors.email?.message}
          />

          <Input
            label="비밀번호"
            type="password"
            placeholder="비밀번호 입력"
            autoComplete="current-password"
            maxLength={100}
            {...register('password')}
            error={errors.password?.message}
          />

          {errors.root?.message && <ErrorBanner message={errors.root.message} />}
          {showUnverified && <UnverifiedBanner />}
          {showInactive && <InactiveBanner />}
          {showLocked && <LockedBanner />}
          {suspensionDetail && <SuspensionBanner detail={suspensionDetail} />}

          <Button type="submit" isLoading={isSubmitting} fullWidth className="!mt-6">
            로그인
          </Button>

          {adminCreds && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleAdminLogin}
              fullWidth
              disabled={isSubmitting}
              className="!mt-2 border-primary-600/30 text-primary-800 hover:bg-primary-50/50 hover:border-primary-600 transition-colors"
            >
              <svg className="w-4 h-4 mr-2 text-primary-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              관리자 자동 로그인
            </Button>
          )}
        </form>

        {/* 소셜 로그인 */}
        <div className="mt-5">
          <SocialLoginButtons returnTo={from} />
        </div>

        {/* 계정 찾기 */}
        <div className="mt-4 flex items-center justify-center gap-3 text-xs text-neutral-500">
          <Link to="/account-recovery?tab=email" className="hover:text-primary-800 hover:underline">
            아이디 찾기
          </Link>
          <span className="text-neutral-300">|</span>
          <Link to="/account-recovery?tab=password" className="hover:text-primary-800 hover:underline">
            비밀번호 찾기
          </Link>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-neutral-500">
          계정이 없으신가요?{' '}
          <Link to="/signup" className="text-primary-800 font-semibold hover:underline">
            회원가입
          </Link>
        </p>
      </div>

      {dormantCreds && (
        <DormantReactivateModal
          email={dormantCreds.email}
          password={dormantCreds.password}
          onClose={() => setDormantCreds(null)}
          onSuccess={handleReactivateSuccess}
        />
      )}
    </div>
  )
}
