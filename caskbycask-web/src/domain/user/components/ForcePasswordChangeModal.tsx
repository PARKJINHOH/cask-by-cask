import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import Modal from '@/shared/components/Modal'
import Input from '@/shared/components/Input'
import Button from '@/shared/components/Button'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { useMe, useUpdatePassword } from '../hooks/useUser'

const _SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/
const _PW_CHARS = /^[a-zA-Z\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+$/

const schema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z
      .string()
      .min(7)
      .max(100)
      .regex(_PW_CHARS)
      .regex(/\d/)
      .regex(_SPECIAL),
    confirmPassword: z.string().min(1),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'] })

type FormValues = z.infer<typeof schema>

/**
 * 임시 비밀번호 발급 후(mustChangePassword) 강제 비밀번호 변경 모달.
 * 변경 완료 전까지 닫을 수 없으며, 변경 성공 시 ['me'] 무효화로 자동 닫힘.
 */
export default function ForcePasswordChangeModal() {
  const { t } = useTranslation()
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const isAuthReady = useAuthStore((s) => s.isAuthReady)
  const { data: profile } = useMe()
  const updatePassword = useUpdatePassword()
  const qc = useQueryClient()
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  if (!isAuthReady || !isLoggedIn || !profile?.mustChangePassword) return null

  const onSubmit = async (values: FormValues) => {
    try {
      await updatePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      setSuccess(true)
      // mustChangePassword 플래그가 갱신되도록 프로필 재조회 → 모달 자동 닫힘
      await qc.invalidateQueries({ queryKey: ['me'] })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError('currentPassword', { message: msg ?? t('forcePw.error') })
    }
  }

  return (
    <Modal open onClose={() => {}} size="sm" closeOnOverlay={false}>
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">{t('forcePw.title')}</h2>
          <p className="mt-1 text-sm text-neutral-500 leading-relaxed">{t('forcePw.desc')}</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <Input
            label={t('forcePw.current')}
            type="password"
            placeholder={t('forcePw.current')}
            autoComplete="current-password"
            maxLength={100}
            error={errors.currentPassword ? t('forcePw.currentError') : undefined}
            {...register('currentPassword')}
          />
          <Input
            label={t('forcePw.new')}
            type="password"
            placeholder={t('forcePw.hint')}
            autoComplete="new-password"
            maxLength={100}
            error={errors.newPassword ? t('forcePw.newError') : undefined}
            {...register('newPassword')}
          />
          <Input
            label={t('forcePw.confirm')}
            type="password"
            placeholder={t('forcePw.confirm')}
            autoComplete="new-password"
            maxLength={100}
            error={errors.confirmPassword ? t('forcePw.confirmError') : undefined}
            {...register('confirmPassword')}
          />
          {success && <p className="text-sm text-green-600">{t('forcePw.success')}</p>}
          <Button type="submit" fullWidth isLoading={isSubmitting || updatePassword.isPending}>
            {t('forcePw.submit')}
          </Button>
        </form>
      </div>
    </Modal>
  )
}
