import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/domain/auth/hooks/useAuth'
import Button from '@/shared/components/Button'
import Input from '@/shared/components/Input'

const schema = z.object({
  email:    z.string().email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
})

type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormValues) => {
    try {
      await login(data)
      navigate('/')
    } catch {
      setError('root', { message: t('auth.login.error') })
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-neutral-900 text-center mb-8">
          {t('auth.login.title')}
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label={t('auth.email')}
            type="email"
            autoComplete="email"
            {...register('email')}
            error={errors.email?.message}
          />
          <Input
            label={t('auth.password')}
            type="password"
            autoComplete="current-password"
            {...register('password')}
            error={errors.password?.message}
          />

          {errors.root && (
            <p className="text-sm text-danger-600 text-center">{errors.root.message}</p>
          )}

          <Button type="submit" isLoading={isSubmitting} className="w-full mt-2">
            {t('auth.login.submit')}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          {t('auth.login.noAccount')}{' '}
          <Link to="/signup" className="text-primary-600 font-medium hover:underline">
            {t('auth.signup.title')}
          </Link>
        </p>
      </div>
    </div>
  )
}
