import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SeoMeta from '@/shared/components/SeoMeta'
import PhotoPostView from '@/domain/photo-gallery/components/PhotoPostView'

/**
 * 사진 한 장의 단독 페이지 — 주소를 직접 열거나 공유 링크로 들어왔을 때.
 * 갤러리 목록에서 누르면 같은 화면이 모달(PhotoPostModal)로 뜬다.
 */
export default function PhotoPostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const postId = Number(id)

  if (!Number.isFinite(postId) || postId <= 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-sm text-neutral-500">
        {t('common.notFound')}
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 lg:px-6">
      <SeoMeta
        title={t('photoGallery.title')}
        canonical={`/community/photo/${postId}`}
      />

      <Link
        to="/community/photo"
        className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {t('photoGallery.title')}
      </Link>

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <PhotoPostView postId={postId} />
      </div>
    </div>
  )
}
