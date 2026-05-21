import { Link } from 'react-router-dom'
import { useLegalLatest } from '@/domain/legal/hooks/useLegal'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
import { TermsContent } from './LegalContent'

export default function TermsPage() {
  const { data, isLoading, isError } = useLegalLatest('TERMS')

  return (
    <div className="min-h-[calc(100vh-9rem)] px-4 py-12">
      <SeoMeta
        title="이용약관"
        description="DrinkIndex 서비스 이용약관."
        canonical={buildCanonical('/terms')}
      />
      <div className="w-full max-w-2xl mx-auto">
        <div className="mb-6">
          <Link to="/signup" className="text-sm text-primary-600 hover:underline">← 회원가입으로 돌아가기</Link>
          <div className="flex items-baseline gap-3 mt-3">
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
            <TermsContent />
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
