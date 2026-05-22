import { useState, startTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom'
import type { AxiosError } from 'axios'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { useAuth } from '@/domain/auth/hooks/useAuth'
import Button from '@/shared/components/Button'
import Input from '@/shared/components/Input'
import SeoMeta from '@/shared/components/SeoMeta'
import type { ApiResponse } from '@/shared/types/common.types'

// ── Validation schema ──────────────────────────────────────
const schema = z.object({
  email:    z.string().email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
})

type FormValues = z.infer<typeof schema>

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

// ── Page ───────────────────────────────────────────────────
export default function LoginPage() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const navigate   = useNavigate()
  const location   = useLocation()
  const { login }  = useAuth()
  const [suspensionDetail, setSuspensionDetail] = useState<SuspensionDetail | null>(null)
  const [showInactive, setShowInactive]         = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  const state = location.state as { from?: { pathname: string }; signupSuccess?: boolean; verifySuccess?: boolean } | null
  const from = state?.from?.pathname ?? '/'
  const signupSuccess  = !!state?.signupSuccess
  const verifySuccess  = !!state?.verifySuccess

  // 이미 로그인된 사용자는 이전 페이지 또는 홈으로
  if (isLoggedIn) return <Navigate to={from} replace />

  const onSubmit = async (data: FormValues) => {
    setSuspensionDetail(null)
    setShowInactive(false)
    try {
      await login(data)
      startTransition(() => {
        navigate(from, { replace: true })
      })
    } catch (err) {
      const res = (err as AxiosError<ApiResponse<SuspensionDetail>>)?.response?.data
      const code = res?.code
      if (code === 'USER_005') {
        navigate('/verify-email', { state: { email: data.email } })
      } else if (code === 'USER_016') {
        setShowInactive(true)
      } else if (code === 'USER_017' && res?.data) {
        setSuspensionDetail(res.data)
      } else {
        setError('root', { message: '이메일 또는 비밀번호가 올바르지 않습니다.' })
      }
    }
  }

  return (
    <div className="min-h-[calc(100vh-9rem)] flex items-center justify-center px-4 py-12">
      <SeoMeta title="로그인" description="DrinkIndex 로그인 페이지." noindex />
      <div className="w-full max-w-sm">

        {/* Branding */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block text-2xl font-bold text-primary-800 tracking-tight">
            DrinkIndex
          </Link>
          <h1 className="mt-3 text-xl font-semibold text-neutral-900">로그인</h1>
          <p className="mt-1 text-sm text-neutral-500">계속하려면 로그인해주세요</p>
        </div>

        {/* 이메일 인증 완료 안내 */}
        {verifySuccess && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5l-3.5-3.5 1.41-1.41L10 13.67l6.59-6.59L18 8.5l-8 8z"/>
            </svg>
            이메일 인증이 완료되었습니다. 로그인해주세요.
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
          {showInactive && <InactiveBanner />}
          {suspensionDetail && <SuspensionBanner detail={suspensionDetail} />}

          <Button type="submit" isLoading={isSubmitting} fullWidth className="!mt-6">
            로그인
          </Button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-neutral-500">
          계정이 없으신가요?{' '}
          <Link to="/signup" className="text-primary-800 font-semibold hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  )
}
