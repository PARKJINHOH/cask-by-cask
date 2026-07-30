import { useLegalLatest } from '@/domain/legal/hooks/useLegal'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import { sanitizeHtml } from '@/shared/utils/sanitize'
import { useTranslation } from 'react-i18next'

export default function OperationPolicyPage() {
  const { i18n } = useTranslation()
  const { data, isLoading, isError } = useLegalLatest('OPERATION_POLICY')
  const langPrefix = i18n.language === 'en' ? '/en' : '/ko'

  return (
    <div className="min-h-[calc(100vh-9rem)] px-4 py-12">
      <SeoMeta
        title="커뮤니티 운영정책"
        description="CaskByCask 커뮤니티 게시판 운영정책 및 닉네임 가이드라인."
        canonical={buildCanonical(`${langPrefix}/operation-policy`)}
      />
      <div className="w-full max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900">커뮤니티 운영정책</h1>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-6">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-neutral-400">불러오는 중...</div>
          ) : isError || !data ? (
            <div className="py-12 text-center">
              <p className="text-sm text-neutral-500">운영정책을 불러오지 못했습니다.</p>
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
