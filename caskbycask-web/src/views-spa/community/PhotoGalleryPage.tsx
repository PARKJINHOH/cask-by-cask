import { useCallback, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SeoMeta from '@/shared/components/SeoMeta'
import type { PostSort } from '@/domain/community/types/community.types'
import InfiniteSentinel from '@/domain/photo-gallery/components/InfiniteSentinel'
import PhotoGrid from '@/domain/photo-gallery/components/PhotoGrid'
import PhotoPostModal from '@/domain/photo-gallery/components/PhotoPostModal'
import {
  flattenPhotoPosts,
  useInfinitePhotoPosts,
} from '@/domain/photo-gallery/hooks/useInfinitePhotoPosts'

/**
 * 이미지 갤러리 — 커뮤니티 PHOTO 게시판을 이미지형 목록으로 보여 준다.
 * 댓글·좋아요·스크랩·신고는 기존 게시글 API 를 그대로 쓴다.
 *
 * 사진을 누르면 목록 위에 모달로 상세가 뜨고 주소에 `?post=<id>` 가 붙는다 —
 * 뒤로가기로 닫히고, 그 주소를 그대로 공유해도 같은 사진이 열린다.
 */
export default function PhotoGalleryPage() {
  const { t } = useTranslation()
  const [sort, setSort] = useState<PostSort | undefined>(undefined)
  const [searchParams, setSearchParams] = useSearchParams()

  const query = useMemo(() => ({ sort }), [sort])
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfinitePhotoPosts(query)

  const posts = useMemo(() => flattenPhotoPosts(data?.pages), [data?.pages])

  const openedId = Number(searchParams.get('post')) || null
  const openedIndex = useMemo(
    () => (openedId === null ? -1 : posts.findIndex((post) => post.id === openedId)),
    [openedId, posts],
  )

  const openPost = useCallback((postId: number) => {
    // push — 뒤로가기가 곧 닫기가 된다.
    setSearchParams({ post: String(postId) })
  }, [setSearchParams])

  const closePost = useCallback(() => {
    // replace — 닫은 뒤 뒤로가기로 같은 사진이 다시 열리지 않게 한다.
    setSearchParams({}, { replace: true })
  }, [setSearchParams])

  const moveTo = useCallback((index: number) => {
    const target = posts[index]
    if (target) setSearchParams({ post: String(target.id) }, { replace: true })
  }, [posts, setSearchParams])

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-6">
      <SeoMeta
        title={t('photoGallery.title')}
        description={t('photoGallery.description')}
        canonical="/community/photo"
        alternateKo="/ko/community/photo"
        alternateEn="/en/community/photo"
      />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 lg:text-2xl">{t('photoGallery.title')}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t('photoGallery.description')}</p>
        </div>
        <Link
          to="/photo-card"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary-600 px-4 text-sm font-bold text-white hover:bg-primary-500"
        >
          ＋ {t('photoGallery.createCta')}
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {([
          [undefined, t('photoGallery.sortLatest')],
          ['POPULAR' as PostSort, t('photoGallery.sortPopular')],
        ] as const).map(([value, label]) => (
          <button
            key={label}
            type="button"
            onClick={() => setSort(value)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              sort === value
                ? 'border-neutral-900 bg-neutral-900 text-white'
                : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="py-20 text-center text-sm text-neutral-400">···</p>
      ) : (
        <PhotoGrid posts={posts} onSelect={(post) => openPost(post.id)} />
      )}

      <InfiniteSentinel
        enabled={Boolean(hasNextPage) && !isFetchingNextPage}
        onReach={() => { void fetchNextPage() }}
      >
        {isFetchingNextPage
          ? t('photoGallery.loadingMore')
          : hasNextPage ? '' : posts.length > 0 ? t('photoGallery.end') : ''}
      </InfiniteSentinel>

      <PhotoPostModal
        postId={openedId}
        onClose={closePost}
        onPrev={openedIndex > 0 ? () => moveTo(openedIndex - 1) : undefined}
        onNext={
          openedIndex >= 0 && openedIndex < posts.length - 1
            ? () => moveTo(openedIndex + 1)
            : undefined
        }
        onDeleted={closePost}
      />
    </div>
  )
}
