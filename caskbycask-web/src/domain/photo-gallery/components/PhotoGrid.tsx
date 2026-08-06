import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { PostListItem } from '@/domain/community/types/community.types'
import { layoutJustifiedRows } from '../utils/justifiedLayout'

interface Props {
  posts: PostListItem[]
}

/** 크기를 모르는 기존 이미지의 기본 비율 — 갤러리는 4:5(인스타 권장)가 가장 흔하다. */
const FALLBACK = { width: 4, height: 5 }

export default function PhotoGrid({ posts }: Props) {
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

  const rows = useMemo(() => {
    if (containerWidth <= 0) return []
    // 화면이 좁으면 행 높이를 낮춰 한 행에 지나치게 많은 사진이 들어가지 않게 한다.
    const targetRowHeight = containerWidth < 640 ? 170 : containerWidth < 1024 ? 220 : 260
    const items = posts.map((post) => {
      const size = measured[post.id]
        ?? (post.thumbnailWidth && post.thumbnailHeight
          ? { width: post.thumbnailWidth, height: post.thumbnailHeight }
          : FALLBACK)
      return { ...size, post }
    })
    return layoutJustifiedRows(items, { containerWidth, targetRowHeight, gap: 6 })
  }, [containerWidth, measured, posts])

  return (
    <div ref={containerRef} className="flex flex-col gap-1.5">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-1.5">
          {row.cells.map(({ item, width, height }) => {
            const post = item.post
            const tag = post.spiritTags?.[0]
            return (
              <Link
                key={post.id}
                to={`/community/photo/${post.id}`}
                style={{ width, height, flex: 'none' }}
                className="group relative overflow-hidden rounded-md bg-neutral-200"
              >
                {post.thumbnailImageUrl && (
                  <img
                    src={post.thumbnailImageUrl}
                    alt={post.title}
                    loading="lazy"
                    onLoad={(event) => handleLoad(post.id, event.currentTarget)}
                    className="h-full w-full object-cover"
                  />
                )}
                {tag && (
                  <span className="pointer-events-none absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-primary-200 backdrop-blur-sm">
                    {tag.nameKo}
                  </span>
                )}
                <span className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 to-transparent p-2.5 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <span className="truncate text-xs font-bold">{post.title}</span>
                  <span className="mt-0.5 flex gap-2.5 text-[11px] opacity-90">
                    <span>♥ {post.likeCount}</span>
                    <span>💬 {post.commentCount}</span>
                  </span>
                </span>
              </Link>
            )
          })}
        </div>
      ))}
      {rows.length === 0 && posts.length === 0 && (
        <p className="py-16 text-center text-sm text-neutral-400">{t('photoGallery.empty')}</p>
      )}
    </div>
  )
}
