import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SeoMeta, { buildCanonical } from '@/shared/components/SeoMeta'
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
      {/*
        canonical 은 절대 주소 + 로케일이어야 한다. `/community/photo/{id}` 로 두면 로케일 없는
        경로를 가리키게 되고, 그 주소는 308 로 `/ko/...` 로 넘어간다 — 리다이렉트되는 주소를
        정본으로 선언하면 색인이 흔들린다. SSR 이 내보내는 canonical 과 정확히 같아야 한다.
      */}
      <SeoMeta
        title={t('photoGallery.title')}
        description={t(
          'photoGallery.seoDesc',
          '오늘의 한 잔, 바에서의 한 컷. 촬영 정보와 주류 정보를 함께 담은 회원들의 사진을 모았습니다.',
        )}
        canonical={buildCanonical(`/ko/community/photo/${postId}`)}
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
