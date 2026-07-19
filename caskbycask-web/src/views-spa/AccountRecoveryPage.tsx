import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import type { AxiosError } from 'axios'
import { authApi } from '@/domain/auth/api/authApi'
import Button from '@/shared/components/Button'
import Input from '@/shared/components/Input'
import SeoMeta from '@/shared/components/SeoMeta'
import type { ApiResponse } from '@/shared/types/common.types'

type Tab = 'email' | 'password'

function errMsg(err: unknown, fallback: string): string {
  return (err as AxiosError<ApiResponse<unknown>>)?.response?.data?.message ?? fallback
}

// ── 아이디(이메일) 찾기 ──────────────────────────────────────
function FindEmailTab() {
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nickname.trim()) return
    setError('')
    setMaskedEmail(null)
    setLoading(true)
    try {
      const { data } = await authApi.findEmail(nickname.trim())
      setMaskedEmail(data.data?.maskedEmail ?? null)
    } catch (err) {
      setError(errMsg(err, '해당 닉네임으로 가입된 계정을 찾을 수 없습니다.'))
    } finally {
      setLoading(false)
    }
  }

  if (maskedEmail) {
    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-5 text-center">
          <p className="text-sm text-neutral-600">가입하신 이메일은 다음과 같습니다.</p>
          <p className="mt-2 text-lg font-bold text-primary-800 tracking-wide">{maskedEmail}</p>
          <p className="mt-2 text-xs text-neutral-500">보안을 위해 일부만 표시됩니다.</p>
        </div>
        <Link to="/login">
          <Button fullWidth>로그인하러 가기</Button>
        </Link>
        <button
          type="button"
          onClick={() => { setMaskedEmail(null); setNickname('') }}
          className="block w-full text-center text-xs text-neutral-500 hover:underline"
        >
          다른 닉네임으로 다시 찾기
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <p className="text-sm text-neutral-500 leading-relaxed">
        가입 시 사용한 닉네임을 입력하시면 마스킹된 이메일을 알려드립니다.
      </p>
      <Input
        label="닉네임"
        required
        placeholder="닉네임 입력"
        maxLength={8}
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
      />
      {error && <p className="text-sm text-danger-600">{error}</p>}
      <Button type="submit" isLoading={loading} fullWidth disabled={!nickname.trim()}>
        이메일 찾기
      </Button>
    </form>
  )
}

// ── 비밀번호 재설정 ──────────────────────────────────────────
type Step = 'email' | 'code' | 'password'

function ResetPasswordTab() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const handleSendCode = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!emailValid) { setError('올바른 이메일 형식이 아닙니다.'); return }
    setError('')
    setInfo('')
    setLoading(true)
    try {
      await authApi.sendPasswordResetCode(email)
      setStep('code')
      setInfo('가입된 이메일이라면 인증 코드가 발송되었습니다. (5분 내 입력)')
    } catch (err) {
      setError(errMsg(err, '인증 코드 발송에 실패했습니다. 잠시 후 다시 시도해주세요.'))
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length < 6) return
    setError('')
    setLoading(true)
    try {
      await authApi.verifyPasswordResetCode({ email, code })
      setInfo('')
      setStep('password')
    } catch (err) {
      setError(errMsg(err, '인증 코드가 올바르지 않거나 만료되었습니다.'))
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await authApi.confirmPasswordReset({ email, code, newPassword })
      navigate('/login', { state: { passwordResetSuccess: true } })
    } catch (err) {
      setError(errMsg(err, '비밀번호 재설정에 실패했습니다. 처음부터 다시 시도해주세요.'))
    } finally {
      setLoading(false)
    }
  }

  // 진행 단계 표시
  const stepIndex = step === 'email' ? 0 : step === 'code' ? 1 : 2
  const steps = ['이메일 확인', '코드 입력', '새 비밀번호']

  return (
    <div className="space-y-5">
      {/* Stepper */}
      <div className="flex items-center justify-between">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={[
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold',
                i <= stepIndex ? 'bg-primary-700 text-white' : 'bg-neutral-200 text-neutral-400',
              ].join(' ')}>
                {i + 1}
              </div>
              <span className={[
                'mt-1 text-[10px]',
                i <= stepIndex ? 'text-primary-700 font-medium' : 'text-neutral-400',
              ].join(' ')}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={['h-px flex-1 mx-1', i < stepIndex ? 'bg-primary-700' : 'bg-neutral-200'].join(' ')} />
            )}
          </div>
        ))}
      </div>

      {info && <p className="text-sm text-green-600">{info}</p>}

      {/* Step 1: 이메일 */}
      {step === 'email' && (
        <form onSubmit={handleSendCode} noValidate className="space-y-4">
          <p className="text-sm text-neutral-500 leading-relaxed">
            가입하신 이메일을 입력하시면 인증 코드를 보내드립니다.
          </p>
          <Input
            label="이메일"
            required
            type="email"
            placeholder="example@email.com"
            autoComplete="email"
            maxLength={255}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <p className="text-sm text-danger-600">{error}</p>}
          <Button type="submit" isLoading={loading} fullWidth disabled={!emailValid}>
            인증 코드 받기
          </Button>
        </form>
      )}

      {/* Step 2: 코드 */}
      {step === 'code' && (
        <form onSubmit={handleVerifyCode} noValidate className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-neutral-400 shrink-0">이메일</span>
            <span className="font-medium text-neutral-800 truncate">{email}</span>
          </div>
          <Input
            label="인증 코드"
            required
            placeholder="6자리 코드 입력"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
          <button
            type="button"
            onClick={() => handleSendCode()}
            disabled={loading}
            className="text-xs text-primary-700 hover:underline disabled:opacity-50"
          >
            코드 재발송
          </button>
          {error && <p className="text-sm text-danger-600">{error}</p>}
          <Button type="submit" isLoading={loading} fullWidth disabled={code.length < 6}>
            다음
          </Button>
        </form>
      )}

      {/* Step 3: 새 비밀번호 */}
      {step === 'password' && (
        <form onSubmit={handleConfirm} noValidate className="space-y-4">
          <Input
            label="새 비밀번호"
            required
            type="password"
            placeholder="영문, 숫자, 특수문자 포함 7자 이상"
            autoComplete="new-password"
            maxLength={100}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            label="새 비밀번호 확인"
            required
            type="password"
            placeholder="새 비밀번호 다시 입력"
            autoComplete="new-password"
            maxLength={100}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={confirmPassword && newPassword !== confirmPassword ? '비밀번호가 일치하지 않습니다.' : undefined}
          />
          {error && <p className="text-sm text-danger-600">{error}</p>}
          <Button type="submit" isLoading={loading} fullWidth
            disabled={newPassword.length < 7 || newPassword !== confirmPassword}>
            비밀번호 변경
          </Button>
        </form>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────
export default function AccountRecoveryPage() {
  const [searchParams] = useSearchParams()
  const initialTab: Tab = searchParams.get('tab') === 'password' ? 'password' : 'email'
  const [tab, setTab] = useState<Tab>(initialTab)

  return (
    <div className="min-h-[calc(100vh-9rem)] flex items-center justify-center px-4 py-12">
      <SeoMeta title="계정 찾기" description="CaskByCask 아이디·비밀번호 찾기 페이지." noindex />
      <div className="w-full max-w-sm">

        {/* Branding */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block text-2xl font-bold text-primary-800 tracking-tight">
            CaskByCask
          </Link>
          <h1 className="mt-3 text-xl font-semibold text-neutral-900">계정 찾기</h1>
          <p className="mt-1 text-sm text-neutral-500">아이디 또는 비밀번호를 찾아보세요</p>
        </div>

        {/* Tabs */}
        <div className="flex mb-6 rounded-lg bg-neutral-100 p-1">
          <button
            type="button"
            onClick={() => setTab('email')}
            className={[
              'flex-1 py-2 text-sm font-medium rounded-md transition-colors',
              tab === 'email' ? 'bg-white text-primary-800 shadow-sm' : 'text-neutral-500',
            ].join(' ')}
          >
            아이디 찾기
          </button>
          <button
            type="button"
            onClick={() => setTab('password')}
            className={[
              'flex-1 py-2 text-sm font-medium rounded-md transition-colors',
              tab === 'password' ? 'bg-white text-primary-800 shadow-sm' : 'text-neutral-500',
            ].join(' ')}
          >
            비밀번호 재설정
          </button>
        </div>

        {tab === 'email' ? <FindEmailTab /> : <ResetPasswordTab />}

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-neutral-500">
          <Link to="/login" className="text-primary-800 font-semibold hover:underline">
            로그인으로 돌아가기
          </Link>
        </p>
      </div>
    </div>
  )
}
