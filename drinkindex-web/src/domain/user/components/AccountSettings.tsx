import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Input from '@/shared/components/Input'
import Button from '@/shared/components/Button'
import Modal from '@/shared/components/Modal'
import { useUpdateNickname, useUpdatePassword, useDeleteMe, useResetPassword, useFixNickname, useMe } from '../hooks/useUser'
import ProfileImageSection from './ProfileImageSection'

// ── 닉네임 폼 ───────────────────────────────────────────────

const NICKNAME_LOCK_DAYS = 60

const nicknameSchema = z.object({
  nickname: z
    .string()
    .min(2, '닉네임은 최소 2자 이상이어야 합니다.')
    .max(8,  '닉네임은 8자 이내로 입력해주세요.')
    .regex(/^[가-힣a-zA-Z]+$/, '닉네임은 한글 또는 영문만 사용 가능합니다.'),
})
type NicknameForm = z.infer<typeof nicknameSchema>

function NicknameSection() {
  const { t } = useTranslation()
  const { data: profile } = useMe()
  const [success, setSuccess] = useState(false)
  const updateNickname = useUpdateNickname()

  // 60일 제한 계산
  const { canChange, availableAt, daysLeft } = useMemo(() => {
    const baseline = profile?.nicknameChangedAt ?? profile?.createdAt
    if (!baseline) return { canChange: true, availableAt: null, daysLeft: 0 }
    const unlockDate = new Date(baseline)
    unlockDate.setDate(unlockDate.getDate() + NICKNAME_LOCK_DAYS)
    const now = new Date()
    if (unlockDate <= now) return { canChange: true, availableAt: null, daysLeft: 0 }
    const daysLeft = Math.ceil((unlockDate.getTime() - now.getTime()) / 86_400_000)
    return { canChange: false, availableAt: unlockDate, daysLeft }
  }, [profile?.nicknameChangedAt, profile?.createdAt])

  const isFixed = profile?.nicknameFixed === true
  const isDisabled = isFixed || !canChange

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    setError,
  } = useForm<NicknameForm>({
    resolver: zodResolver(nicknameSchema),
    defaultValues: { nickname: profile?.nickname ?? '' },
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
      setError('nickname', { message: msg ?? t('mypage.nickname.save') })
    }
  }

  return (
    <section className="p-5 bg-white rounded-xl border border-neutral-100 space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-neutral-800">{t('mypage.nickname.section')}</h3>
        {isFixed && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold
            bg-gradient-to-r from-amber-400 to-orange-500 text-white">
            {t('mypage.nickname.fixedBadge')}
          </span>
        )}
      </div>

      {isFixed ? (
        <p className="text-sm text-neutral-500">{t('mypage.fixNickname.alreadyFixed')}</p>
      ) : !canChange ? (
        <p className="text-sm text-amber-600">
          {t('mypage.nickname.changeAvailableDays', { days: daysLeft })}
          {availableAt && (
            <span className="text-neutral-400 ml-1">
              ({availableAt.toLocaleDateString()})
            </span>
          )}
        </p>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <Input
          label={t('mypage.nickname.label')}
          placeholder={t('mypage.nickname.hint')}
          maxLength={8}
          error={errors.nickname?.message}
          disabled={isDisabled}
          {...register('nickname')}
        />
        {success && (
          <p className="text-sm text-green-600">{t('mypage.nickname.success')}</p>
        )}
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            isLoading={isSubmitting || updateNickname.isPending}
            disabled={!isDirty || isDisabled}
          >
            {t('mypage.nickname.save')}
          </Button>
        </div>
      </form>
    </section>
  )
}

// ── 고정닉 설정 ─────────────────────────────────────────────

function FixedNicknameSection() {
  const { t } = useTranslation()
  const { data: profile } = useMe()
  const [modalOpen, setModalOpen] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const fixNickname = useFixNickname()

  const isFixed = profile?.nicknameFixed === true
  const nickname = profile?.nickname ?? ''

  const handleConfirm = async () => {
    setError('')
    try {
      await fixNickname.mutateAsync()
      setModalOpen(false)
      setSuccess(true)
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? t('mypage.fixNickname.alreadyFixed'))
    }
  }

  return (
    <section className="p-5 bg-white rounded-xl border border-amber-100 space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-neutral-800">{t('mypage.fixNickname.section')}</h3>
        {isFixed && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold
            bg-gradient-to-r from-amber-400 to-orange-500 text-white">
            {t('mypage.nickname.fixedBadge')}
          </span>
        )}
      </div>

      <p className="text-xs text-neutral-500 leading-relaxed">{t('mypage.fixNickname.desc')}</p>
      <div className="flex items-center gap-2 text-sm text-neutral-700">
        <span className="text-neutral-400">{t('mypage.fixNickname.currentNickname')}:</span>
        <span className="font-semibold">{nickname}</span>
      </div>

      {success && (
        <p className="text-sm text-green-600">{t('mypage.fixNickname.success')}</p>
      )}

      {isFixed ? (
        <p className="text-sm text-amber-600 font-medium">{t('mypage.fixNickname.alreadyFixed')}</p>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setModalOpen(true)}
        >
          {t('mypage.fixNickname.btn')}
        </Button>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t('mypage.fixNickname.confirmTitle')}
        size="sm"
        closeOnOverlay={!fixNickname.isPending}
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600 leading-relaxed">
            {t('mypage.fixNickname.confirmDesc', { nickname })}
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setModalOpen(false)}
              disabled={fixNickname.isPending}
            >
              취소
            </Button>
            <Button
              size="sm"
              isLoading={fixNickname.isPending}
              onClick={handleConfirm}
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white
                hover:from-amber-600 hover:to-orange-600 border-0"
            >
              {t('mypage.fixNickname.confirmBtn')}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  )
}

// ── 비밀번호 폼 ─────────────────────────────────────────────

const _SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/
const _PW_CHARS = /^[a-zA-Z\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+$/

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요.'),
    newPassword: z
      .string()
      .min(7,   '새 비밀번호는 최소 7자 이상이어야 합니다.')
      .max(100, '비밀번호가 너무 깁니다.')
      .regex(_PW_CHARS, '비밀번호는 영문, 숫자, 특수문자만 사용 가능합니다.')
      .regex(/\d/, '비밀번호에 숫자가 최소 1개 포함되어야 합니다.')
      .regex(_SPECIAL, '비밀번호에 특수문자가 최소 1개 포함되어야 합니다.'),
    confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요.'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: '새 비밀번호가 일치하지 않습니다.',
    path: ['confirmPassword'],
  })

type PasswordForm = z.infer<typeof passwordSchema>

function PasswordSection() {
  const { t } = useTranslation()
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
      setError('currentPassword', { message: msg ?? t('mypage.password.submit') })
    }
  }

  return (
    <section className="p-5 bg-white rounded-xl border border-neutral-100 space-y-4">
      <h3 className="text-sm font-semibold text-neutral-800">{t('mypage.password.section')}</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <Input
          label={t('mypage.password.current')}
          type="password"
          placeholder={t('mypage.password.current')}
          autoComplete="current-password"
          maxLength={100}
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <Input
          label={t('mypage.password.new')}
          type="password"
          placeholder={t('mypage.password.hint')}
          autoComplete="new-password"
          maxLength={100}
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <Input
          label={t('mypage.password.confirm')}
          type="password"
          placeholder={t('mypage.password.confirm')}
          autoComplete="new-password"
          maxLength={100}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        {success && (
          <p className="text-sm text-green-600">{t('mypage.password.success')}</p>
        )}
        <div className="flex justify-end">
          <Button type="submit" size="sm" isLoading={isSubmitting || updatePassword.isPending}>
            {t('mypage.password.submit')}
          </Button>
        </div>
      </form>
    </section>
  )
}

// ── 임시 비밀번호 발급 ──────────────────────────────────────

function TempPasswordSection() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const resetPassword = useResetPassword()

  const handleReset = async () => {
    setStatus('idle')
    setErrorMsg('')
    try {
      await resetPassword.mutateAsync()
      setStatus('success')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setErrorMsg(msg ?? t('mypage.password.resetCooldown'))
      setStatus('error')
    }
  }

  return (
    <section className="p-5 bg-white rounded-xl border border-neutral-100 space-y-3">
      <h3 className="text-sm font-semibold text-neutral-800">{t('mypage.password.resetSection')}</h3>
      <p className="text-xs text-neutral-500 leading-relaxed">{t('mypage.password.resetDesc')}</p>
      {status === 'success' && (
        <p className="text-sm text-green-600">{t('mypage.password.resetSuccess')}</p>
      )}
      {status === 'error' && (
        <p className="text-sm text-red-600">{errorMsg}</p>
      )}
      <Button
        variant="secondary"
        size="sm"
        isLoading={resetPassword.isPending}
        onClick={handleReset}
      >
        {t('mypage.password.resetBtn')}
      </Button>
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
      <ProfileImageSection />
      <NicknameSection />
      <FixedNicknameSection />
      <PasswordSection />
      <TempPasswordSection />
      <DangerZone />
    </div>
  )
}
