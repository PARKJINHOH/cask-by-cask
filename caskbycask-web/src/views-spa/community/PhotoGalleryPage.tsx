import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import SeoMeta from '@/shared/components/SeoMeta'
import { buildCanonical } from '@/shared/config/site'
import { isBoardListNoindex, metadataSearchParamsFromUrl } from '@/shared/utils/seoIndexing'
import type { PostSort } from '@/domain/community/types/community.types'
import { useRequireLogin } from '@/domain/auth/hooks/useRequireLogin'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import PhotoCardSpiritPicker from '@/domain/photo-card/components/PhotoCardSpiritPicker'
import InfiniteSentinel from '@/domain/photo-gallery/components/InfiniteSentinel'
import PhotoGrid from '@/domain/photo-gallery/components/PhotoGrid'
import PhotoPostModal from '@/domain/photo-gallery/components/PhotoPostModal'
import PhotoUploadDialog from '@/domain/photo-gallery/components/PhotoUploadDialog'
import {
  flattenPhotoPosts,
  useInfinitePhotoPosts,
} from '@/domain/photo-gallery/hooks/useInfinitePhotoPosts'

/**
 * 이미지 갤러리 — 커뮤니티 PHOTO 게시판을 이미지형 목록으로 보여 준다.
 * 댓글·좋아요·스크랩·신고는 기존 게시글 API 를 그대로 쓴다.
 *
 * 화면 상태는 모두 주소에 담는다 — 사진 모달 `?post=<id>`, 검색어 `?q=`, 주류 필터 `?spirit=<id>`.
 * 뒤로가기로 되돌릴 수 있고, 그 주소를 그대로 공유해도 같은 화면이 열린다.
 * (그래서 로그인이 필요한 동작도 이 주소째로 복귀해야 한다 — useRequireLogin 참고)
 */
export default function PhotoGalleryPage() {
  const { t, i18n } = useTranslation()
  const requireLogin = useRequireLogin()
  const [sort, setSort] = useState<PostSort | undefined>(undefined)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [spiritPickerOpen, setSpiritPickerOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  const isEn = i18n.language === 'en'

  const openedId = Number(searchParams.get('post')) || null
  const keywordParam = searchParams.get('q') ?? ''
  const spiritTagId = Number(searchParams.get('spirit')) || undefined

  // 입력은 즉시 반영하되 요청은 눌러 담는다 — 한 글자마다 목록을 새로 부르지 않는다.
  const [keywordDraft, setKeywordDraft] = useState(keywordParam)
  const debouncedKeyword = useDebouncedValue(keywordDraft)

  /** 다른 파라미터를 지우지 않고 일부만 바꾼다 — ?post= 모달 상태와 필터가 공존해야 한다. */
  const patchParams = useCallback((
    patch: Record<string, string | undefined>,
    options?: { replace?: boolean },
  ) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      Object.entries(patch).forEach(([key, value]) => {
        if (value) next.set(key, value)
        else next.delete(key)
      })
      return next
    }, options)
  }, [setSearchParams])

  // 디바운스가 끝난 검색어만 주소에 반영한다. 검색어가 바뀌면 열려 있던 사진은 닫는다
  // (걸러진 목록에 없는 사진이 모달로 남아 있으면 좌우 이동이 어긋난다).
  useEffect(() => {
    if (debouncedKeyword === keywordParam) return
    patchParams({ q: debouncedKeyword || undefined, post: undefined }, { replace: true })
  }, [debouncedKeyword, keywordParam, patchParams])

  // 반대 방향 — 뒤로가기·링크로 ?q= 가 바뀌면 입력칸도 따라간다.
  // (안 맞추면 주소는 검색 해제인데 입력칸에는 지난 검색어가 남는다)
  useEffect(() => {
    setKeywordDraft((current) => (current === keywordParam ? current : keywordParam))
  }, [keywordParam])

  const query = useMemo(
    () => ({ sort, keyword: keywordParam || undefined, spiritTagId }),
    [sort, keywordParam, spiritTagId],
  )
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfinitePhotoPosts(query)

  const posts = useMemo(() => flattenPhotoPosts(data?.pages), [data?.pages])

  /**
   * 필터 칩에 쓸 주류 이름.
   * 주소로 바로 들어온 경우(`?spirit=123`) 이름을 모르는데, 걸러진 글은 모두 그 주류를 달고 있으므로
   * 목록에서 되찾을 수 있다 — 이름 하나 때문에 상세 API 를 더 부르지 않는다.
   */
  const spiritTagLabel = useMemo(() => {
    if (!spiritTagId) return null
    for (const post of posts) {
      const tag = post.spiritTags?.find((item) => item.spiritId === spiritTagId)
      if (tag) return (isEn ? tag.nameEn || tag.nameKo : tag.nameKo)
    }
    return null
  }, [isEn, posts, spiritTagId])

  const openedIndex = useMemo(
    () => (openedId === null ? -1 : posts.findIndex((post) => post.id === openedId)),
    [openedId, posts],
  )

  const openPost = useCallback((postId: number) => {
    // push — 뒤로가기가 곧 닫기가 된다.
    patchParams({ post: String(postId) })
  }, [patchParams])

  const closePost = useCallback(() => {
    // replace — 닫은 뒤 뒤로가기로 같은 사진이 다시 열리지 않게 한다.
    patchParams({ post: undefined }, { replace: true })
  }, [patchParams])

  const moveTo = useCallback((index: number) => {
    const target = posts[index]
    if (target) patchParams({ post: String(target.id) }, { replace: true })
  }, [posts, patchParams])

  const hasFilter = Boolean(keywordParam || spiritTagId)
  // 하이드레이션 이후에도 SSR 이 내린 색인 판정을 유지해야 한다.
  // 이 값을 넘기지 않으면 SeoMeta 기본값이 robots 를 index 로 되돌려 SSR 신호를 덮어쓴다.
  const seoNoindex = isBoardListNoindex('photo', metadataSearchParamsFromUrl(searchParams))
  // SSR(seoHelpers 의 BOARD_LIST_CONFIG.photo)과 같은 문구를 쓴다 — 하이드레이션 전후로
  // description 이 바뀌거나 사라지면 크롤러가 보는 요약이 흔들린다.
  const seoDescription = t(
    'photoGallery.seoDesc',
    '오늘의 한 잔, 바에서의 한 컷. 촬영 정보와 주류 정보를 함께 담은 회원들의 사진을 모았습니다.',
  )

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-6">
      <SeoMeta
        title={t('photoGallery.title')}
        description={seoDescription}
        canonical={buildCanonical('/ko/community/photo')}
        noindex={seoNoindex}
      />

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 lg:text-2xl">{t('photoGallery.title')}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* 사진만 올리는 짧은 길 — 포토카드 편집기를 거치지 않는다 */}
          <button
            type="button"
            onClick={() => requireLogin(() => setUploadOpen(true))}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-4 text-sm font-bold text-neutral-700 hover:border-primary-400 hover:text-primary-700"
          >
            {t('photoGallery.uploadCta')}
          </button>
          <Link
            to="/photo-card"
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary-600 px-4 text-sm font-bold text-white hover:bg-primary-500"
          >
            {t('photoGallery.createCta')}
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
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

        <span className="mx-1 hidden h-4 w-px bg-neutral-200 sm:inline-block" aria-hidden="true" />

        {spiritTagId ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-300 bg-primary-50 py-1.5 pl-3.5 pr-1.5 text-xs font-semibold text-primary-800">
            {spiritTagLabel ?? t('photoGallery.filterBySpirit')}
            <button
              type="button"
              onClick={() => patchParams({ spirit: undefined, post: undefined })}
              aria-label={t('photoGallery.clearSpiritFilter')}
              className="flex size-5 items-center justify-center rounded-full text-primary-600 hover:bg-primary-200/60"
            >
              ×
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setSpiritPickerOpen(true)}
            className="rounded-full border border-dashed border-neutral-300 px-3.5 py-1.5 text-xs font-semibold text-neutral-500 hover:border-primary-400 hover:text-primary-700"
          >
            ＋ {t('photoGallery.filterBySpirit')}
          </button>
        )}

        <div className="ml-auto w-full sm:w-56">
          <input
            type="search"
            value={keywordDraft}
            onChange={(event) => setKeywordDraft(event.target.value)}
            placeholder={t('photoGallery.searchPlaceholder')}
            aria-label={t('photoGallery.searchLabel')}
            className="h-9 w-full rounded-full border border-neutral-200 bg-white px-4 text-xs text-neutral-700 focus:border-primary-400 focus:outline-none"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="py-20 text-center text-sm text-neutral-400">···</p>
      ) : posts.length === 0 && hasFilter ? (
        <p className="py-16 text-center text-sm text-neutral-400">{t('photoGallery.filterEmpty')}</p>
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
        posts={posts}
        onClose={closePost}
        onPrev={openedIndex > 0 ? () => moveTo(openedIndex - 1) : undefined}
        onNext={
          openedIndex >= 0 && openedIndex < posts.length - 1
            ? () => moveTo(openedIndex + 1)
            : undefined
        }
        onDeleted={closePost}
      />

      <PhotoUploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />

      <PhotoCardSpiritPicker
        open={spiritPickerOpen}
        onClose={() => setSpiritPickerOpen(false)}
        onSelect={(info) => {
          if (info.spiritId) patchParams({ spirit: String(info.spiritId), post: undefined })
        }}
      />
    </div>
  )
}
