import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useMessageStore } from '../store/messageStore'
import { useMessageActions } from '../hooks/useMessages'
import axiosInstance from '@/shared/api/axiosInstance'
import type { ApiResponse } from '@/shared/types/common.types'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import FormFieldLabel, { RequiredFieldsNotice } from '@/shared/components/FormFieldLabel'
import AutoGrowTextarea from '@/shared/components/AutoGrowTextarea'

interface UserSuggestion {
  id: number
  nickname: string
}

export default function MessagePopup() {
  const { t } = useTranslation()
  const { isOpen, receiverNickname: prefilledNickname, closePopup } = useMessageStore()
  const { sendMutation } = useMessageActions()
  const { user } = useAuthStore()

  const [receiver, setReceiver] = useState('')
  const [content, setContent] = useState('')
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [inlineError, setInlineError] = useState('')
  const [sendStatus, setSendStatus] = useState<'idle' | 'success'>('idle')
  const debouncedReceiver = useDebouncedValue(receiver)
  const isPrefilled = Boolean(prefilledNickname)
  const suggestRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setReceiver(prefilledNickname)
      setContent('')
      setInlineError('')
      setSuggestions([])
      setSendStatus('idle')
    }
  }, [isOpen, prefilledNickname])

  useEffect(() => {
    if (isPrefilled || !debouncedReceiver.trim() || debouncedReceiver.length < 1) {
      setSuggestions([])
      return
    }
    axiosInstance
      .get<ApiResponse<UserSuggestion[]>>('/api/users/search', {
        params: { nickname: debouncedReceiver, limit: 5 },
      })
      .then((r) => {
        setSuggestions(r.data.data ?? [])
        setShowSuggestions(true)
      })
      .catch(() => setSuggestions([]))
  }, [debouncedReceiver, isPrefilled])

  const handleSend = useCallback(async () => {
    setInlineError('')
    const r = receiver.trim()
    const c = content.trim()

    if (!r || !c) return

    if (user?.nickname === r) {
      setInlineError(t('messages.selfError', '본인에게는 쪽지를 보낼 수 없습니다'))
      return
    }

    try {
      await sendMutation.mutateAsync({ receiverNickname: r, content: c })
      setSendStatus('success')
      setTimeout(() => {
        closePopup()
        setSendStatus('idle')
      }, 2000)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 403) setInlineError(t('messages.blockedError', '쪽지를 보낼 수 없는 사용자입니다'))
      else if (status === 404) setInlineError(t('messages.notFoundError', '존재하지 않는 사용자입니다'))
      else if (status === 400) setInlineError(t('messages.badWordError', '욕설이 포함되어 있습니다'))
      else setInlineError(t('common.error', '오류가 발생했습니다. 다시 시도해주세요.'))
    }
  }, [receiver, content, user, sendMutation, closePopup])

  if (!isOpen) return null

  const canSend = receiver.trim().length > 0 && content.trim().length > 0 && !sendMutation.isPending

  return (
    <div className="fixed top-4 left-4 z-50 w-72 bg-white rounded-xl shadow-xl border border-neutral-200 overflow-visible">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-100">
        <span className="text-xs font-medium text-neutral-500">({t('messages.newMessage', '쪽지')})</span>
        <button
          onClick={closePopup}
          className="text-neutral-400 hover:text-neutral-600 text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* 성공 오버레이 */}
      {sendStatus === 'success' ? (
        <div className="flex flex-col items-center justify-center px-4 py-10 gap-3">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-neutral-800">{t('messages.sentSuccess')}</p>
          <p className="text-xs text-neutral-400">{t('messages.closingSoon')}</p>
        </div>
      ) : (
        <>
        <div className="px-4 py-3 space-y-3">
          <RequiredFieldsNotice />
          {/* 받는 사람 */}
          <div>
            <FormFieldLabel required className="mb-1 text-xs">{t('messages.to')}</FormFieldLabel>
            <div className="relative">
              <input
                type="text"
                required
                aria-required="true"
                value={receiver}
                onChange={(e) => {
                  setReceiver(e.target.value)
                  setInlineError('')
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                disabled={isPrefilled}
                placeholder={t('messages.recipientPlaceholder')}
                className={[
                  'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400',
                  isPrefilled ? 'bg-neutral-100 text-neutral-500 cursor-default' : 'bg-white',
                ].join(' ')}
              />
              {/* 자동완성 드롭다운 */}
              {!isPrefilled && showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestRef}
                  className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10 overflow-hidden"
                >
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 text-neutral-700"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        setReceiver(s.nickname)
                        setSuggestions([])
                        setShowSuggestions(false)
                      }}
                    >
                      {s.nickname}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 내용 */}
          <div>
            <FormFieldLabel required className="mb-1 text-xs">{t('messages.content')}</FormFieldLabel>
            <AutoGrowTextarea
              required
              aria-required="true"
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 100))}
              rows={4}
              maxLength={100}
              placeholder={t('messages.contentPlaceholder')}
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
          </div>

          {/* 인라인 에러 */}
          {inlineError && (
            <p className="text-xs text-red-500">{inlineError}</p>
          )}
        </div>

        {/* 버튼 */}
        <div className="flex gap-2 px-4 pb-3">
          <button
            onClick={closePopup}
            className="flex-1 py-2 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="flex-1 py-2 text-sm font-medium text-white bg-primary-800 rounded-lg hover:bg-primary-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendMutation.isPending ? t('common.loading') : t('messages.send')}
          </button>
        </div>
        </>
      )}
    </div>
  )
}
