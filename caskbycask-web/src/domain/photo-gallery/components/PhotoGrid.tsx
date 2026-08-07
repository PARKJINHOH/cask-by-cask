import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { PostListItem } from '@/domain/community/types/community.types'
import { columnCountFor, columnWidthFor, layoutPhotoColumns } from '../utils/columnLayout'

interface Props {
  posts: PostListItem[]
  /** 사진을 눌렀을 때 — 인스타처럼 그 자리에서 상세를 연다 */
  onSelect?: (post: PostListItem) => void
}

/** 크기를 모르는 기존 이미지의 기본 비율 — 갤러리는 4:5(인스타 권장)가 가장 흔하다. */
const FALLBACK = { width: 4, height: 5 }
/** 사진 사이 간격(px) */
const GAP = 8

export default function PhotoGrid({ posts, onSelect }: Props) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  /**
   * 서버가 크기를 모르는 이미지(마이그레이션 이전 업로드)는 브라우저가 로드한 뒤
   * naturalWidth/Height 로 보정한다. 보정 전에는 4:5 로 가정해 레이아웃이 비지 않게 한다.
   */
  const [measured, setMeasured] = useState<Record<number, { width: number; height: number }>>({})

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const update = () => setContainerWidth(element.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const handleLoad = useCallback((postId: number, image: HTMLImageElement) => {
    if (!image.naturalWidth || !image.naturalHeight) return
    setMeasured((current) => (
      current[postId]
        ? current
        : { ...current, [postId]: { width: image.naturalWidth, height: image.naturalHeight } }
    ))
  }, [])

  const columns = useMemo(() => {
    if (containerWidth <= 0) return []
    const columnCount = columnCountFor(containerWidth)
    const columnWidth = columnWidthFor(containerWidth, columnCount, GAP)
    const items = posts.map((post) => {
      const size = measured[post.id]
        ?? (post.thumbnailWidth && post.thumbnailHeight
          ? { width: post.thumbnailWidth, height: post.thumbnailHeight }
          : FALLBACK)
      return { ...size, post }
    })
    return layoutPhotoColumns(items, { columnCount, columnWidth, gap: GAP })
  }, [containerWidth, measured, posts])

  /**
   * 좌클릭은 모달로 연다. 새 탭/새 창(⌘·Ctrl·Shift·가운데 버튼)은 브라우저에 맡겨
   * 주소를 그대로 열 수 있게 둔다 — 그래서 타일은 계속 진짜 링크(<a>)다.
   */
  const handleClick = useCallback((event: MouseEvent<HTMLAnchorElement>, post: PostListItem) => {
    if (!onSelect) return
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    event.preventDefault()
    onSelect(post)
  }, [onSelect])

  // 컨테이너는 항상 그린다 — 폭을 재는 ResizeObserver 가 붙을 자리라
  // 사진이 없는 동안 걷어 내면 사진이 채워져도 폭이 0 으로 남는다.
  return (
    <div ref={containerRef} className="flex items-start" style={{ gap: GAP }}>
      {posts.length === 0 && (
        <p className="w-full py-16 text-center text-sm text-neutral-400">{t('photoGallery.empty')}</p>
      )}
      {columns.map((column, columnIndex) => (
        <div
          key={columnIndex}
          className="flex min-w-0 flex-1 flex-col"
          style={{ gap: GAP }}
        >
          {column.cells.map(({ item, aspectRatio }) => {
            const post = item.post
            return (
              <Link
                key={post.id}
                to={`/community/photo/${post.id}`}
                onClick={(event) => handleClick(event, post)}
                style={{ aspectRatio }}
                className="group relative block w-full overflow-hidden rounded-lg bg-neutral-200"
              >
                {post.thumbnailImageUrl && (
                  <img
                    src={post.thumbnailImageUrl}
                    alt={post.title}
                    loading="lazy"
                    onLoad={(event) => handleLoad(post.id, event.currentTarget)}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                )}
                <span className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 to-transparent p-3 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <span className="truncate text-sm font-bold">{post.title}</span>
                  <span className="mt-0.5 flex gap-3 text-xs opacity-90">
                    <span>♥ {post.likeCount}</span>
                    <span>💬 {post.commentCount}</span>
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
      ))}
    </div>
  )
}
