import { useState, useMemo, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Input from '@/shared/components/Input'
import Button from '@/shared/components/Button'
import Modal from '@/shared/components/Modal'
import { useUpdateNickname, useUpdatePassword, useDeleteMe, useResetPassword, useFixNickname, useMe, useUpdateEmailSubscription, useVerifyAdult, useSocialAccounts, useUnlinkSocial } from '../hooks/useUser'
import ProfileImageSection from './ProfileImageSection'
import { startOAuth } from '@/domain/auth/oauth'
import type { SocialProvider } from '@/domain/auth/types/auth.types'

// ── 설정 그룹 카드 ───────────────────────────────────────────

const ICON_CLS = 'w-5 h-5'

function UserGroupIcon() {
  return (
    <svg className={ICON_CLS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.314 3.134-6 7-6s7 2.686 7 6" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg className={ICON_CLS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg className={ICON_CLS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9Z" />
      <path d="M10.5 18a1.7 1.7 0 0 0 3 0" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg className={ICON_CLS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 9v4" />
      <path d="M10.29 3.86 1.82 18a1.5 1.5 0 0 0 1.29 2.25h17.78A1.5 1.5 0 0 0 22.18 18L13.71 3.86a1.5 1.5 0 0 0-2.42 0Z" />
      <path d="M12 17h.01" />
    </svg>
  )
}

interface SettingsGroupProps {
  icon: ReactNode
  title: string
  description?: string
  tone?: 'default' | 'danger'
  children: ReactNode
}

function SettingsGroup({ icon, title, description, tone = 'default', children }: SettingsGroupProps) {
  const isDanger = tone === 'danger'
  return (
    <section className={`bg-white rounded-2xl border overflow-hidden ${isDanger ? 'border-red-100' : 'border-neutral-100'}`}>
      <div className={`flex items-center gap-3 px-5 py-4 border-b ${isDanger ? 'border-red-100 bg-red-50/50' : 'border-neutral-100 bg-neutral-50/60'}`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
          ${isDanger ? 'bg-red-100 text-red-600' : 'bg-primary-50 text-primary-700'}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className={`text-sm font-bold ${isDanger ? 'text-red-700' : 'text-neutral-900'}`}>{title}</h2>
          {description && <p className="text-xs text-neutral-400 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="divide-y divide-neutral-100">
        {children}
      </div>
    </section>
  )
}

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
      const apiErr = (err as { response?: { data?: { code?: string; message?: string } } })?.response?.data
      const fallbackMsg = apiErr?.code === 'NICKNAME_BAD_WORD_DETECTED'
        ? t('mypage.nickname.badWordError')
        : (apiErr?.message ?? t('mypage.nickname.save'))
      setError('nickname', { message: fallbackMsg })
    }
  }

  return (
    <div className="p-5 space-y-4">
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
        <p className="text-[11px] leading-relaxed text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
          ⚠ {t('mypage.nickname.policyWarning')}
        </p>
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
    </div>
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
    <div className="p-5 space-y-3">
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
    </div>
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
    <div className="p-5 space-y-4">
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
    </div>
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
    <div className="p-5 space-y-3">
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
    </div>
  )
}

// ── 이메일 수신 동의 ─────────────────────────────────────────

function EmailSubscriptionSection() {
  const { data: profile } = useMe()
  const updateSubscription = useUpdateEmailSubscription()
  const [optimistic, setOptimistic] = useState<boolean | null>(null)

  const current = optimistic !== null ? optimistic : (profile?.emailSubscribed ?? false)

  const handleToggle = async () => {
    const next = !current
    setOptimistic(next)
    try {
      await updateSubscription.mutateAsync(next)
    } catch {
      setOptimistic(!next)
    } finally {
      setOptimistic(null)
    }
  }

  return (
    <div className="p-5 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-neutral-800">이메일 수신 동의</h3>
        <p className="text-xs text-neutral-500 mt-0.5">새소식, 이벤트, 프로모션 안내 이메일을 받습니다.</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${current ? 'bg-green-400' : 'bg-neutral-300'}`} />
          <span className="text-sm text-neutral-700">
            {current ? '수신 동의' : '수신 거부'}
          </span>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={current}
          onClick={handleToggle}
          disabled={updateSubscription.isPending}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${current ? 'bg-primary-800' : 'bg-neutral-300'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform
              ${current ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
      </div>

      {updateSubscription.isSuccess && (
        <p className="text-xs text-green-600">
          {current ? '이메일 수신에 동의했습니다.' : '이메일 수신을 거부했습니다.'}
        </p>
      )}
    </div>
  )
}

// ── 성인(연령) 인증 ─────────────────────────────────────────

function AdultVerificationSection() {
  const { t, i18n } = useTranslation()
  const { data: profile } = useMe()
  const verifyAdult = useVerifyAdult()
  const [birthDate, setBirthDate] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')

  const isVerified = profile?.adultVerified === true
  const verifiedAt = profile?.adultVerifiedAt
  // 만 19세 이상 입력만 허용하기 위한 최대 선택 가능일(오늘 - 19년) 및 합리적 최소일
  const today = new Date()
  const maxDate = new Date(today.getFullYear() - 19, today.getMonth(), today.getDate())
    .toISOString()
    .slice(0, 10)
  const minDate = '1900-01-01'

  const canSubmit = !!birthDate && agreed && !verifyAdult.isPending

  const handleSubmit = async () => {
    setError('')
    if (!birthDate || !agreed) return
    try {
      await verifyAdult.mutateAsync(birthDate)
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { code?: string; message?: string } } })?.response?.data
      if (apiErr?.code === 'USER_021') {
        setError(t('mypage.adult.underageError'))
      } else {
        setError(apiErr?.message ?? t('mypage.adult.failed'))
      }
    }
  }

  return (
    <div className="p-5 space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-neutral-800">{t('mypage.adult.section')}</h3>
        {isVerified && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold
            bg-gradient-to-r from-amber-400 to-orange-500 text-white">
            {t('mypage.adult.verifiedBadge')}
          </span>
        )}
      </div>

      {isVerified ? (
        <p className="text-sm text-neutral-600">
          {t('mypage.adult.verifiedDesc')}
          {verifiedAt && (
            <span className="text-neutral-400 ml-1">
              ({new Date(verifiedAt).toLocaleDateString()})
            </span>
          )}
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-neutral-500 leading-relaxed">{t('mypage.adult.desc')}</p>

          <div className="space-y-1.5">
            <label className="text-xs text-neutral-600">{t('mypage.adult.birthDateLabel')}</label>
            <input
              type="date"
              value={birthDate}
              min={minDate}
              max={maxDate}
              lang={i18n.language}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm
                focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>

          <label className="flex items-start gap-2 text-xs text-neutral-600 leading-relaxed cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 accent-primary-700"
            />
            <span>{t('mypage.adult.confirmLabel')}</span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end">
            <Button
              size="sm"
              isLoading={verifyAdult.isPending}
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              {t('mypage.adult.submit')}
            </Button>
          </div>

          <p className="text-[11px] leading-relaxed text-neutral-500 bg-neutral-50 border border-neutral-200 rounded-md px-2 py-1.5">
            {t('mypage.adult.legalNotice')}
          </p>
        </div>
      )}
    </div>
  )
}

// ── 소셜 로그인 연동 ─────────────────────────────────────────

function LinkIcon() {
  return (
    <svg className={ICON_CLS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11.5 4.5" />
      <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07L12.5 19.5" />
    </svg>
  )
}

const SOCIAL_PROVIDERS: SocialProvider[] = ['NAVER', 'GOOGLE']

function SocialLinkSection() {
  const { t } = useTranslation()
  const { data, isLoading } = useSocialAccounts()
  const unlink = useUnlinkSocial()
  const [busy, setBusy] = useState<SocialProvider | null>(null)
  const [error, setError] = useState('')

  const accounts = data?.accounts ?? []
  const hasPassword = data?.hasPassword ?? true
  const linkedCount = accounts.length

  const handleConnect = async (provider: SocialProvider) => {
    setError('')
    setBusy(provider)
    try {
      // 'link' 모드 — 콜백이 현재 로그인 계정에 직접 연동 후 마이페이지로 복귀
      await startOAuth(provider, 'link', '/mypage?tab=settings')
    } catch {
      setBusy(null)
      setError(t('mypage.social.connectError'))
    }
  }

  const handleUnlink = async (provider: SocialProvider) => {
    setError('')
    setBusy(provider)
    try {
      await unlink.mutateAsync(provider)
    } catch (err: unknown) {
      const apiErr = (err as { response?: { data?: { code?: string; message?: string } } })?.response?.data
      if (apiErr?.code === 'OAUTH_005') setError(t('mypage.social.lastMethodError'))
      else setError(apiErr?.message ?? t('mypage.social.unlinkError'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="p-5 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-neutral-800">{t('mypage.social.section')}</h3>
        <p className="text-xs text-neutral-500 mt-0.5">{t('mypage.social.desc')}</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-neutral-400">{t('common.loading')}</p>
      ) : (
        <div className="space-y-2">
          {SOCIAL_PROVIDERS.map((provider) => {
            const account = accounts.find((a) => a.provider === provider)
            const connected = !!account
            // 마지막 로그인 수단 보호: 비밀번호 없고 연동이 1개뿐이면 해제 불가
            const isLastMethod = connected && !hasPassword && linkedCount <= 1
            return (
              <div key={provider}
                className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-800">
                    {t(`auth.social.providerName.${provider}`)}
                  </p>
                  {connected ? (
                    <p className="text-xs text-neutral-400 truncate">
                      {account?.email || t('mypage.social.connected')}
                    </p>
                  ) : (
                    <p className="text-xs text-neutral-400">{t('mypage.social.notConnected')}</p>
                  )}
                </div>
                {connected ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    isLoading={busy === provider && unlink.isPending}
                    disabled={isLastMethod || busy !== null}
                    onClick={() => handleUnlink(provider)}
                    title={isLastMethod ? t('mypage.social.lastMethodError') : undefined}
                  >
                    {t('mypage.social.unlink')}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    isLoading={busy === provider}
                    disabled={busy !== null}
                    onClick={() => handleConnect(provider)}
                  >
                    {t('mypage.social.connect')}
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-[11px] leading-relaxed text-neutral-500 bg-neutral-50 border border-neutral-200 rounded-md px-2 py-1.5">
        {t('mypage.social.notice')}
      </p>
    </div>
  )
}

// ── 회원 탈퇴 ───────────────────────────────────────────────

const DELETE_CONFIRM_WORD = '삭제'

function DangerZone() {
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [error, setError]         = useState('')
  const navigate  = useNavigate()
  const deleteMe  = useDeleteMe()

  const canDelete = confirmText.trim() === DELETE_CONFIRM_WORD

  const closeModal = () => {
    if (deleteMe.isPending) return
    setModalOpen(false)
    setConfirmText('')
    setError('')
  }

  const handleConfirm = async () => {
    if (!canDelete) return
    setError('')
    try {
      await deleteMe.mutateAsync()
      navigate('/', { replace: true })
    } catch {
      setError('탈퇴 처리 중 오류가 발생했습니다. 다시 시도해주세요.')
    }
  }

  return (
    <div className="p-5 space-y-3">
      <p className="text-xs text-neutral-500 leading-relaxed">
        회원을 탈퇴하면 계정과 개인정보가 <strong>영구적으로 파기</strong>되며 복구할 수 없습니다.
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
        onClose={closeModal}
        title="정말 탈퇴하시겠습니까?"
        size="sm"
        closeOnOverlay={!deleteMe.isPending}
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 space-y-2">
            <p className="text-sm font-semibold text-red-700">⚠ 이 작업은 되돌릴 수 없습니다.</p>
            <ul className="text-xs text-red-700/90 leading-relaxed list-disc pl-4 space-y-1">
              <li>계정과 개인정보(이메일·프로필 등)가 <strong>영구 파기</strong>됩니다.</li>
              <li>쪽지·위시리스트·보틀·임시저장 등 개인 데이터가 삭제됩니다.</li>
              <li>작성하신 게시글·리뷰·댓글은 <strong>‘탈퇴한사용자’</strong> 명의로 남습니다.</li>
              <li>같은 이메일로 다시 가입해도 기존 데이터와 연결되지 않습니다.</li>
            </ul>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-neutral-600">
              계속하려면 아래에 <strong className="text-red-600">{DELETE_CONFIRM_WORD}</strong>를 입력해주세요.
            </label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={DELETE_CONFIRM_WORD}
              maxLength={10}
              autoComplete="off"
              disabled={deleteMe.isPending}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={closeModal}
              disabled={deleteMe.isPending}
            >
              취소
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={deleteMe.isPending}
              disabled={!canDelete}
              onClick={handleConfirm}
            >
              탈퇴 확인
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── 메인 컴포넌트 ────────────────────────────────────────────

// 성인 인증 기능 오픈 여부. 사업자 인증·이용자 증가 후 true로 전환하면 바로 노출됨.
// (백엔드/DB·게이팅 로직은 유지, UI만 숨김)
const ADULT_VERIFICATION_ENABLED = false

export default function AccountSettings() {
  const { t } = useTranslation()

  return (
    <div className="space-y-5">
      <SettingsGroup
        icon={<UserGroupIcon />}
        title={t('mypage.settingsGroups.profile.title')}
        description={t('mypage.settingsGroups.profile.desc')}
      >
        <ProfileImageSection />
        <NicknameSection />
        <FixedNicknameSection />
        {ADULT_VERIFICATION_ENABLED && <AdultVerificationSection />}
      </SettingsGroup>

      <SettingsGroup
        icon={<LockIcon />}
        title={t('mypage.settingsGroups.security.title')}
        description={t('mypage.settingsGroups.security.desc')}
      >
        <PasswordSection />
        <TempPasswordSection />
      </SettingsGroup>

      <SettingsGroup
        icon={<LinkIcon />}
        title={t('mypage.social.section')}
        description={t('mypage.social.desc')}
      >
        <SocialLinkSection />
      </SettingsGroup>

      <SettingsGroup
        icon={<BellIcon />}
        title={t('mypage.settingsGroups.notifications.title')}
        description={t('mypage.settingsGroups.notifications.desc')}
      >
        <EmailSubscriptionSection />
      </SettingsGroup>

      <SettingsGroup
        icon={<WarningIcon />}
        title={t('mypage.settingsGroups.danger.title')}
        description={t('mypage.settingsGroups.danger.desc')}
        tone="danger"
      >
        <DangerZone />
      </SettingsGroup>
    </div>
  )
}
