import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { copyText } from '@/shared/utils/clipboard'

interface Props {
  url?: string
  className?: string
}

export default function ShareUrlButton({ url, className = '' }: Props) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const target = url ?? window.location.href
    const success = await copyText(target)
    setCopied(success)
    if (success) window.setTimeout(() => setCopied(false), 2200)
  }

  return (
    <button
      type="button"
      onClick={() => { void handleCopy() }}
      aria-label={copied ? t('common.urlCopied') : t('common.copyUrl')}
      title={copied ? t('common.urlCopied') : t('common.copyUrl')}
      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-neutral-200 bg-white text-neutral-400 transition-colors hover:border-amber-500 hover:text-amber-600 ${className}`}
    >
      {copied ? (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m5 12 4 4L19 6" />
        </svg>
      ) : (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" />
        </svg>
      )}
    </button>
  )
}
