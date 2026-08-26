import type { AxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import type { ApiResponse } from '@/shared/types/common.types'

interface TranslationActionProps {
  hasContent: boolean
  showTranslated: boolean
  isLoading: boolean
  error: unknown
  onToggle: () => void | Promise<void>
  className?: string
  compact?: boolean
}

function errorKey(error: unknown): string {
  const code = (error as AxiosError<ApiResponse<unknown>> | undefined)?.response?.data?.code
  if (code === 'TRANSLATION_002') return 'translation.error.monthlyLimit'
  if (code === 'TRANSLATION_003') return 'translation.error.dailyLimit'
  if (code === 'TRANSLATION_001') return 'translation.error.disabled'
  return 'translation.error.unavailable'
}

export default function TranslationAction({
  hasContent,
  showTranslated,
  isLoading,
  error,
  onToggle,
  className,
  compact = false,
}: TranslationActionProps) {
  const { t } = useTranslation()
  if (!hasContent) return null

  const Root = compact ? 'span' : 'div'
  const rootClassName = compact
    ? `ml-1.5 inline-flex flex-wrap items-center gap-x-2 gap-y-1 align-middle ${className ?? ''}`
    : `flex flex-wrap items-center gap-x-3 gap-y-2 ${className ?? ''}`
  const buttonClassName = compact
    ? "relative inline-flex min-h-6 items-center rounded-full border border-primary-200 bg-primary-50 px-2 text-[11px] font-semibold leading-5 text-primary-800 transition-colors after:absolute after:-inset-x-1 after:-inset-y-2.5 after:content-[''] hover:border-primary-300 hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-1 disabled:cursor-wait disabled:opacity-60"
    : 'inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-primary-800 transition-colors hover:bg-primary-50 disabled:cursor-wait disabled:opacity-60'
  const attributionClassName = compact
    ? "relative inline-flex min-h-6 items-center after:absolute after:-inset-x-1 after:-inset-y-2.5 after:content-['']"
    : 'inline-flex min-h-11 items-center'

  return (
    <Root className={rootClassName}>
      <button
        type="button"
        onClick={() => void onToggle()}
        disabled={isLoading}
        aria-busy={isLoading}
        className={buttonClassName}
      >
        {isLoading
          ? t('translation.loading')
          : showTranslated
            ? t('translation.showOriginal')
            : t('translation.translate')}
      </button>

      {showTranslated && (
        <a
          href="https://translate.google.com"
          target="_blank"
          rel="noreferrer"
          aria-label={t('translation.attributionLabel')}
          className={attributionClassName}
        >
          <img
            src="/google-translate-attribution.svg"
            width={176}
            height={16}
            alt={t('translation.attributionLabel')}
            className="h-4 w-auto"
          />
        </a>
      )}

      <span
        role="status"
        aria-live="polite"
        className={error ? 'text-xs text-danger-600' : 'sr-only'}
      >
        {isLoading ? t('translation.loading') : error ? t(errorKey(error)) : ''}
      </span>
    </Root>
  )
}
