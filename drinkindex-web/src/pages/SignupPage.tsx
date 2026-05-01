import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link, Navigate } from 'react-router-dom'
import type { AxiosError } from 'axios'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { useAuth } from '@/domain/auth/hooks/useAuth'
import Button from '@/shared/components/Button'
import Input from '@/shared/components/Input'
import type { ApiResponse } from '@/shared/types/common.types'

// ── Validation schema ──────────────────────────────────────
const schema = z
  .object({
    email: z
      .string()
      .email('올바른 이메일 형식이 아닙니다.'),
    nickname: z
      .string()
      .min(2,   '닉네임은 2자 이상이어야 합니다.')
      .max(100, '닉네임은 100자 이하여야 합니다.'),
    password: z
      .string()
      .min(8,   '비밀번호는 8자 이상이어야 합니다.')
      .max(100, '비밀번호는 100자 이하여야 합니다.'),
    passwordConfirm: z
      .string()
      .min(1, '비밀번호 확인을 입력해주세요.'),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['passwordConfirm'],
  })

type FormValues = z.infer<typeof schema>

// ── Error banner ───────────────────────────────────────────
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

// ── Page ───────────────────────────────────────────────────
export default function SignupPage() {
  const isLoggedIn        = useAuthStore((s) => s.isLoggedIn)
  const navigate          = useNavigate()
  const { signup, login } = useAuth()

  if (isLoggedIn) return <Navigate to="/" replace />

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', nickname: '', password: '', passwordConfirm: '' },
  })

  const onSubmit = async (data: FormValues) => {
    try {
      await signup({
        email:    data.email,
        nickname: data.nickname,
        password: data.password,
      })
      await login({ email: data.email, password: data.password })
      navigate('/', { replace: true })
    } catch (err) {
      const code = (err as AxiosError<ApiResponse<unknown>>)?.response?.data?.code
      if (code === 'USER_002') {
        setError('email',    { message: '이미 사용 중인 이메일입니다.' })
      } else if (code === 'USER_003') {
        setError('nickname', { message: '이미 사용 중인 닉네임입니다.' })
      } else {
        setError('root',     { message: '회원가입 중 오류가 발생했습니다. 다시 시도해주세요.' })
      }
    }
  }

  return (
    <div className="min-h-[calc(100vh-9rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Branding */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block text-2xl font-bold text-primary-600 tracking-tight">
            DrinkIndex
          </Link>
          <h1 className="mt-3 text-xl font-semibold text-neutral-900">회원가입</h1>
          <p className="mt-1 text-sm text-neutral-500">무료로 가입하고 리뷰를 남겨보세요</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Input
            label="이메일"
            type="email"
            placeholder="example@email.com"
            autoComplete="email"
            {...register('email')}
            error={errors.email?.message}
          />

          <Input
            label="닉네임"
            type="text"
            placeholder="2~100자"
            autoComplete="nickname"
            {...register('nickname')}
            error={errors.nickname?.message}
            hint="커뮤니티에서 사용되는 이름입니다"
          />

          <Input
            label="비밀번호"
            type="password"
            placeholder="8자 이상 입력"
            autoComplete="new-password"
            {...register('password')}
            error={errors.password?.message}
          />

          <Input
            label="비밀번호 확인"
            type="password"
            placeholder="비밀번호 재입력"
            autoComplete="new-password"
            {...register('passwordConfirm')}
            error={errors.passwordConfirm?.message}
          />

          {errors.root?.message && <ErrorBanner message={errors.root.message} />}

          <Button type="submit" isLoading={isSubmitting} fullWidth className="!mt-6">
            가입하기
          </Button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-neutral-500">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="text-primary-600 font-semibold hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}
