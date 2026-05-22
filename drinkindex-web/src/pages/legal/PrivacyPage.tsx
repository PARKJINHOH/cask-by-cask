import { Link } from 'react-router-dom'
import { useLegalLatest } from '@/domain/legal/hooks/useLegal'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import { PrivacyContent } from './LegalContent'

export default function PrivacyPage() {
  const { data, isLoading, isError } = useLegalLatest('PRIVACY_POLICY')

  return (
    <div className="min-h-[calc(100vh-9rem)] px-4 py-12">
      <SeoMeta
        title="개인정보 처리방침"
        description="DrinkIndex 개인정보 처리방침. 수집·이용·보관 정책."
        canonical={buildCanonical('/privacy')}
      />
      <div className="w-full max-w-2xl mx-auto">
        <div className="mb-6">
          <Link to="/signup" className="text-sm text-primary-800 hover:underline">← 회원가입으로 돌아가기</Link>
          <div className="flex items-baseline gap-3 mt-3">
            <h1 className="text-2xl font-bold text-neutral-900">개인정보 처리방침</h1>
            {data && (
              <span className="text-sm text-neutral-400">{data.version}</span>
            )}
          </div>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-6">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-neutral-400">불러오는 중...</div>
          ) : isError || !data ? (
            <PrivacyContent />
          ) : (
            <div
              className="prose prose-sm max-w-none text-neutral-700"
              dangerouslySetInnerHTML={{ __html: data.contentSanitized }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
