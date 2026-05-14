import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import Input from '@/shared/components/Input'
import Button from '@/shared/components/Button'
import Modal from '@/shared/components/Modal'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { useUpdateNickname, useUpdatePassword, useDeleteMe } from '../hooks/useUser'

// ── 닉네임 폼 ───────────────────────────────────────────────

const nicknameSchema = z.object({
  nickname: z
    .string()
    .min(2, '닉네임은 최소 2자 이상이어야 합니다.')
    .max(20, '닉네임은 20자 이내로 입력해주세요.')
    .regex(/^\S+$/, '닉네임에 공백을 포함할 수 없습니다.'),
})
type NicknameForm = z.infer<typeof nicknameSchema>

function NicknameSection() {
  const user = useAuthStore((s) => s.user)
  const [success, setSuccess] = useState(false)
  const updateNickname = useUpdateNickname()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    setError,
  } = useForm<NicknameForm>({
    resolver: zodResolver(nicknameSchema),
    defaultValues: { nickname: user?.nickname ?? '' },
  })

  const onSubmit = async (values: NicknameForm) => {
    setSuccess(false)
    try {
      await updateNickname.mutateAsync({ nickname: values.nickname })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError('nickname', { message: msg ?? '닉네임 변경에 실패했습니다.' })
    }
  }

  return (
    <section className="p-5 bg-white rounded-xl border border-neutral-100 space-y-4">
      <h3 className="text-sm font-semibold text-neutral-800">닉네임 수정</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <Input
          label="새 닉네임"
          placeholder="변경할 닉네임을 입력하세요"
          maxLength={20}
          error={errors.nickname?.message}
          {...register('nickname')}
        />
        {success && (
          <p className="text-sm text-green-600">닉네임이 성공적으로 변경되었습니다.</p>
        )}
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            isLoading={isSubmitting || updateNickname.isPending}
            disabled={!isDirty}
          >
            저장
          </Button>
        </div>
      </form>
    </section>
  )
}

// ── 비밀번호 폼 ─────────────────────────────────────────────

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요.'),
    newPassword: z
      .string()
      .min(8, '새 비밀번호는 최소 8자 이상이어야 합니다.')
      .max(100, '비밀번호가 너무 깁니다.'),
    confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요.'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: '새 비밀번호가 일치하지 않습니다.',
    path: ['confirmPassword'],
  })

type PasswordForm = z.infer<typeof passwordSchema>

function PasswordSection() {
  const [success, setSuccess] = useState(false)
  const updatePassword = useUpdatePassword()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })

  const onSubmit = async (values: PasswordForm) => {
    setSuccess(false)
    try {
      await updatePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      setSuccess(true)
      reset()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError('currentPassword', { message: msg ?? '비밀번호 변경에 실패했습니다.' })
    }
  }

  return (
    <section className="p-5 bg-white rounded-xl border border-neutral-100 space-y-4">
      <h3 className="text-sm font-semibold text-neutral-800">비밀번호 변경</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <Input
          label="현재 비밀번호"
          type="password"
          placeholder="현재 비밀번호"
          autoComplete="current-password"
          maxLength={100}
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <Input
          label="새 비밀번호"
          type="password"
          placeholder="8자 이상"
          autoComplete="new-password"
          maxLength={100}
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <Input
          label="새 비밀번호 확인"
          type="password"
          placeholder="새 비밀번호를 다시 입력"
          autoComplete="new-password"
          maxLength={100}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        {success && (
          <p className="text-sm text-green-600">비밀번호가 성공적으로 변경되었습니다.</p>
        )}
        <div className="flex justify-end">
          <Button type="submit" size="sm" isLoading={isSubmitting || updatePassword.isPending}>
            변경
          </Button>
        </div>
      </form>
    </section>
  )
}

// ── 회원 탈퇴 ───────────────────────────────────────────────

function DangerZone() {
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError]         = useState('')
  const navigate  = useNavigate()
  const deleteMe  = useDeleteMe()

  const handleConfirm = async () => {
    setError('')
    try {
      await deleteMe.mutateAsync()
      navigate('/', { replace: true })
    } catch {
      setError('탈퇴 처리 중 오류가 발생했습니다. 다시 시도해주세요.')
    }
  }

  return (
    <section className="p-5 bg-white rounded-xl border border-red-100 space-y-3">
      <h3 className="text-sm font-semibold text-red-700">위험 구역</h3>
      <p className="text-xs text-neutral-500 leading-relaxed">
        회원을 탈퇴하면 모든 리뷰, 댓글, 위시리스트 데이터가 삭제되며 복구할 수 없습니다.
      </p>
      <Button
        variant="danger"
        size="sm"
        onClick={() => setModalOpen(true)}
      >
        회원 탈퇴
      </Button>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="정말 탈퇴하시겠습니까?"
        size="sm"
        closeOnOverlay={!deleteMe.isPending}
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600 leading-relaxed">
            탈퇴 후에는 모든 데이터(리뷰, 댓글, 위시리스트)가 <strong>영구적으로 삭제</strong>되며,
            이 작업은 되돌릴 수 없습니다.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setModalOpen(false)}
              disabled={deleteMe.isPending}
            >
              취소
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={deleteMe.isPending}
              onClick={handleConfirm}
            >
              탈퇴 확인
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  )
}

// ── 메인 컴포넌트 ────────────────────────────────────────────

export default function AccountSettings() {
  return (
    <div className="space-y-4">
      <NicknameSection />
      <PasswordSection />
      <DangerZone />
    </div>
  )
}
