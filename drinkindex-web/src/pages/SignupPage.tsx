import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import type { AxiosError } from 'axios'
import { useAuth } from '@/domain/auth/hooks/useAuth'
import { authApi } from '@/domain/auth/api/authApi'
import Button from '@/shared/components/Button'
import Input from '@/shared/components/Input'
import type { ApiResponse } from '@/shared/types/common.types'
import { TermsContent, PrivacyContent } from '@/pages/legal/LegalContent'
import { useLegalLatest } from '@/domain/legal/hooks/useLegal'

// ── Types ──────────────────────────────────────────────────
type CheckStatus = 'idle' | 'checking' | 'available' | 'taken'
type PolicyType = 'terms' | 'privacy'

// ── Schema ─────────────────────────────────────────────────
const SPECIAL_CHARS = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/
const PASSWORD_CHARS = /^[a-zA-Z\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+$/

const schema = z
  .object({
    email: z.string().email('올바른 이메일 형식이 아닙니다.'),
    nickname: z
      .string()
      .min(2, '닉네임은 2자 이상이어야 합니다.')
      .max(8,  '닉네임은 8자 이하여야 합니다.')
      .regex(/^[가-힣a-zA-Z]+$/, '닉네임은 한글 또는 영문만 사용 가능합니다.'),
    password: z
      .string()
      .min(7,   '비밀번호는 7자 이상이어야 합니다.')
      .max(100, '비밀번호는 100자 이하여야 합니다.')
      .regex(PASSWORD_CHARS, '비밀번호는 영문, 숫자, 특수문자만 사용 가능합니다.')
      .regex(/\d/, '비밀번호에 숫자가 최소 1개 포함되어야 합니다.')
      .regex(SPECIAL_CHARS, '비밀번호에 특수문자가 최소 1개 포함되어야 합니다.'),
    passwordConfirm: z.string().min(1, '비밀번호 확인을 입력해주세요.'),
    agreedToTerms: z.boolean().refine(v => v === true, { message: '이용약관에 동의해주세요.' }),
    agreedToPrivacy: z.boolean().refine(v => v === true, { message: '개인정보 처리방침에 동의해주세요.' }),
    emailSubscribed: z.boolean(),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['passwordConfirm'],
  })

type FormValues = z.infer<typeof schema>

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

function FieldError({ message }: { message: string }) {
  return (
    <p role="alert" className="flex items-start gap-1 text-xs text-danger-600">
      <svg className="w-3 h-3 flex-shrink-0 mt-px" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      {message}
    </p>
  )
}

function CheckBtn({ status, onClick }: { status: CheckStatus; onClick: () => void }) {
  const base = 'shrink-0 h-[38px] px-3 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1 whitespace-nowrap'

  if (status === 'checking') {
    return (
      <button type="button" disabled className={`${base} border-neutral-200 text-neutral-400 bg-neutral-50 cursor-not-allowed`}>
        <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
        </svg>
        확인 중
      </button>
    )
  }
  if (status === 'available') {
    return (
      <button type="button" disabled className={`${base} border-green-300 text-green-600 bg-green-50 cursor-default`}>
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        사용가능
      </button>
    )
  }
  if (status === 'taken') {
    return (
      <button type="button" disabled className={`${base} border-danger-300 text-danger-600 bg-danger-50 cursor-default`}>
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        중복
      </button>
    )
  }
  // idle
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} border-neutral-300 text-neutral-600 bg-white hover:bg-neutral-50 active:bg-neutral-100`}
    >
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      중복확인
    </button>
  )
}

function CheckStatusMsg({ status, field }: { status: CheckStatus; field: 'email' | 'nickname' }) {
  if (status === 'available') {
    const msg = field === 'email' ? '사용 가능한 이메일입니다.' : '사용 가능한 닉네임입니다.'
    return <p className="text-xs text-green-600">{msg}</p>
  }
  if (status === 'taken') {
    const msg = field === 'email'
      ? '이미 사용 중인 이메일입니다. 다른 이메일을 입력해주세요.'
      : '이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해주세요.'
    return <p className="text-xs text-danger-600">{msg}</p>
  }
  return null
}

// ── Policy Modal ───────────────────────────────────────────
function PolicyModal({ type, onClose }: { type: PolicyType; onClose: () => void }) {
  const apiType = type === 'terms' ? 'TERMS' : 'PRIVACY_POLICY'
  const { data, isLoading } = useLegalLatest(apiType)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const title = type === 'terms' ? '이용약관' : '개인정보 처리방침'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col bg-white rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 shrink-0">
          <div className="flex items-baseline gap-2">
            <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
            {data && <span className="text-xs text-neutral-400">{data.version}</span>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
            aria-label="닫기"
          >
            <svg className="w-5 h-5 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 text-sm text-neutral-700">
          {isLoading ? (
            <div className="py-12 text-center text-neutral-400">불러오는 중...</div>
          ) : data ? (
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: data.contentSanitized }} />
          ) : type === 'terms' ? (
            <TermsContent />
          ) : (
            <PrivacyContent />
          )}
        </div>
        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-200 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Input base style helpers ────────────────────────────────
const inputBase = [
  'w-full px-3 py-2 text-sm rounded-lg border transition-colors',
  'placeholder:text-neutral-400',
  'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent',
].join(' ')

const inputNormal = 'border-neutral-300 bg-white'
const inputError  = 'border-danger-400 bg-danger-50/30 focus:ring-danger-400'

// ── Page ───────────────────────────────────────────────────
export default function SignupPage() {
  const navigate   = useNavigate()
  const { signup } = useAuth()

  const [emailStatus,    setEmailStatus]    = useState<CheckStatus>('idle')
  const [nicknameStatus, setNicknameStatus] = useState<CheckStatus>('idle')
  const [policyModal,    setPolicyModal]    = useState<PolicyType | null>(null)

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', nickname: '', password: '', passwordConfirm: '', agreedToTerms: false, agreedToPrivacy: false, emailSubscribed: false },
  })

  // ── 이메일 중복확인 ──────────────────────────────────────
  const handleCheckEmail = async () => {
    const valid = await trigger('email')
    if (!valid) return
    setEmailStatus('checking')
    try {
      const res = await authApi.checkEmailAvailable(getValues('email'))
      setEmailStatus(res.data.data?.available ? 'available' : 'taken')
    } catch {
      setEmailStatus('idle')
    }
  }

  // ── 닉네임 중복확인 ─────────────────────────────────────
  const handleCheckNickname = async () => {
    const valid = await trigger('nickname')
    if (!valid) return
    setNicknameStatus('checking')
    try {
      const res = await authApi.checkNicknameAvailable(getValues('nickname'))
      setNicknameStatus(res.data.data?.available ? 'available' : 'taken')
    } catch {
      setNicknameStatus('idle')
    }
  }

  // ── 제출 ────────────────────────────────────────────────
  const onSubmit = async (data: FormValues) => {
    // Step 1: 로컬 상태 검사
    if (emailStatus !== 'available') {
      setError('email', { message: '이메일 중복확인을 완료해주세요.' })
      return
    }
    if (nicknameStatus !== 'available') {
      setError('nickname', { message: '닉네임 중복확인을 완료해주세요.' })
      return
    }

    // Step 2: 제출 직전 최종 재확인
    try {
      const [emailCheck, nicknameCheck] = await Promise.all([
        authApi.checkEmailAvailable(data.email),
        authApi.checkNicknameAvailable(data.nickname),
      ])

      let valid = true
      if (!emailCheck.data.data?.available) {
        setEmailStatus('taken')
        setError('email', { message: '이미 사용 중인 이메일입니다.' })
        valid = false
      }
      if (!nicknameCheck.data.data?.available) {
        setNicknameStatus('taken')
        setError('nickname', { message: '이미 사용 중인 닉네임입니다.' })
        valid = false
      }
      if (!valid) return

      // Step 3: 회원가입
      await signup({ email: data.email, password: data.password, nickname: data.nickname, agreedToTerms: data.agreedToTerms, agreedToPrivacy: data.agreedToPrivacy, emailSubscribed: data.emailSubscribed })
      navigate('/verify-email', { replace: true, state: { email: data.email } })
    } catch (err) {
      const code = (err as AxiosError<ApiResponse<unknown>>)?.response?.data?.code
      if (code === 'USER_002') {
        setEmailStatus('taken')
        setError('email', { message: '이미 사용 중인 이메일입니다.' })
      } else if (code === 'USER_003') {
        setNicknameStatus('taken')
        setError('nickname', { message: '이미 사용 중인 닉네임입니다.' })
      } else {
        setError('root', { message: '회원가입 중 오류가 발생했습니다. 다시 시도해주세요.' })
      }
    }
  }

  // register + onChange 병합 (입력 변경 시 중복확인 상태 초기화)
  const emailReg    = register('email')
  const nicknameReg = register('nickname')

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

          {/* 이메일 */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-neutral-700">이메일</label>
            <div className="flex gap-2 items-start">
              <input
                type="email"
                placeholder="example@email.com"
                autoComplete="email"
                maxLength={255}
                aria-invalid={!!errors.email}
                className={`${inputBase} ${errors.email || emailStatus === 'taken' ? inputError : inputNormal}`}
                {...emailReg}
                onChange={(e) => { emailReg.onChange(e); setEmailStatus('idle') }}
              />
              <CheckBtn status={emailStatus} onClick={handleCheckEmail} />
            </div>
            {errors.email?.message
              ? <FieldError message={errors.email.message} />
              : <CheckStatusMsg status={emailStatus} field="email" />
            }
          </div>

          {/* 닉네임 */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-neutral-700">닉네임</label>
            <div className="flex gap-2 items-start">
              <input
                type="text"
                placeholder="2~8자, 한글 또는 영문"
                autoComplete="nickname"
                maxLength={8}
                aria-invalid={!!errors.nickname}
                className={`${inputBase} ${errors.nickname || nicknameStatus === 'taken' ? inputError : inputNormal}`}
                {...nicknameReg}
                onChange={(e) => { nicknameReg.onChange(e); setNicknameStatus('idle') }}
              />
              <CheckBtn status={nicknameStatus} onClick={handleCheckNickname} />
            </div>
            {errors.nickname?.message
              ? <FieldError message={errors.nickname.message} />
              : nicknameStatus === 'idle'
                ? <p className="text-xs text-neutral-400">커뮤니티에서 사용되는 이름입니다</p>
                : <CheckStatusMsg status={nicknameStatus} field="nickname" />
            }
          </div>

          {/* 비밀번호 */}
          <Input
            label="비밀번호"
            type="password"
            placeholder="영문+숫자+특수문자 포함, 7자 이상"
            autoComplete="new-password"
            maxLength={100}
            {...register('password')}
            error={errors.password?.message}
          />

          {/* 비밀번호 확인 */}
          <Input
            label="비밀번호 확인"
            type="password"
            placeholder="비밀번호 재입력"
            autoComplete="new-password"
            maxLength={100}
            {...register('passwordConfirm')}
            error={errors.passwordConfirm?.message}
          />

          {/* 약관 동의 */}
          <div className="space-y-2 pt-2 border-t border-neutral-100">
            {/* 이용약관 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer min-w-0">
                  <input
                    type="checkbox"
                    {...register('agreedToTerms')}
                    className="w-4 h-4 shrink-0 rounded accent-primary-600 cursor-pointer"
                  />
                  <span className="text-sm text-neutral-700 truncate">
                    이용약관 동의 <span className="text-danger-500">(필수)</span>
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setPolicyModal('terms')}
                  className="shrink-0 text-xs text-primary-600 hover:underline"
                >
                  전문보기
                </button>
              </div>
              {errors.agreedToTerms?.message && <FieldError message={errors.agreedToTerms.message} />}
            </div>

            {/* 개인정보 처리방침 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer min-w-0">
                  <input
                    type="checkbox"
                    {...register('agreedToPrivacy')}
                    className="w-4 h-4 shrink-0 rounded accent-primary-600 cursor-pointer"
                  />
                  <span className="text-sm text-neutral-700 truncate">
                    개인정보 처리방침 동의 <span className="text-danger-500">(필수)</span>
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setPolicyModal('privacy')}
                  className="shrink-0 text-xs text-primary-600 hover:underline"
                >
                  전문보기
                </button>
              </div>
              {errors.agreedToPrivacy?.message && <FieldError message={errors.agreedToPrivacy.message} />}
            </div>

            {/* 이메일 수신 동의 (선택) */}
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer min-w-0">
                <input
                  type="checkbox"
                  {...register('emailSubscribed')}
                  className="w-4 h-4 shrink-0 rounded accent-primary-600 cursor-pointer"
                />
                <span className="text-sm text-neutral-700 truncate">
                  이메일 수신 동의 <span className="text-neutral-400">(선택)</span>
                </span>
              </label>
              <span className="shrink-0 text-xs text-neutral-400">새소식·이벤트 안내</span>
            </div>
          </div>

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

      {/* Policy Modals */}
      {policyModal && <PolicyModal type={policyModal} onClose={() => setPolicyModal(null)} />}
    </div>
  )
}
