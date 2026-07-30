import { useLegalLatest } from '@/domain/legal/hooks/useLegal'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import { sanitizeHtml } from '@/shared/utils/sanitize'
import { useTranslation } from 'react-i18next'

export default function TermsPage() {
  const { i18n } = useTranslation()
  const { data, isLoading, isError } = useLegalLatest('TERMS')
  const langPrefix = i18n.language === 'en' ? '/en' : '/ko'

  return (
    <div className="min-h-[calc(100vh-9rem)] px-4 py-12">
      <SeoMeta
        title="이용약관"
        description="CaskByCask 서비스 이용약관."
        canonical={buildCanonical(`${langPrefix}/terms`)}
      />
      <div className="w-full max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold text-neutral-900">이용약관</h1>
            {data && (
              <span className="text-sm text-neutral-400">{data.version}</span>
            )}
          </div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-6">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-neutral-400">불러오는 중...</div>
          ) : isError || !data ? (
            <div className="py-12 text-center">
              <p className="text-sm text-neutral-500">약관을 불러오지 못했습니다.</p>
              <p className="mt-1 text-xs text-neutral-400">잠시 후 다시 시도해주세요.</p>
            </div>
          ) : (
            <div
              className="notice-content"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.contentSanitized ?? '') }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
