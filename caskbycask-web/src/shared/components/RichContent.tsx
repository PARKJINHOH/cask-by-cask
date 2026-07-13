import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sanitizeHtml } from '@/shared/utils/sanitize'
import ImageLightbox from './ImageLightbox'

interface Props {
  html: string
  className?: string
}

// 게시글/공지 등 TipTap 본문을 읽기 화면에 렌더링.
//   - sanitizeHtml 로 2차 정제 후 출력
//   - 본문 내 술 임베드 칩(.di-spirit-embed[data-spirit-id]) 클릭 시 SPA 이동
//     (href 는 sanitize 단계에서 제거되므로 data-spirit-id 로 위임)
//   - 본문 내 이미지(<img>) 클릭 시 라이트박스(확대/줌/이전·다음) 표시
export default function RichContent({ html, className }: Props) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [images, setImages] = useState<string[]>([])
  const [lightbox, setLightbox] = useState({ open: false, index: 0 })

  // 렌더 후 이미지 확대 커서와 좌우 이미지 묶음의 저장된 비율/동일 높이를 적용한다.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const imageElements = Array.from(el.querySelectorAll('img'))
    imageElements.forEach((im) => {
      im.style.cursor = 'zoom-in'
    })

    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
    const applyPairLayout = () => {
      const pairs = new Map<string, HTMLImageElement[]>()
      imageElements.forEach((image) => {
        const pairId = image.dataset.imagePair
        if (!pairId) return
        const pair = pairs.get(pairId) ?? []
        pair.push(image)
        pairs.set(pairId, pair)
      })

      pairs.forEach((pair) => {
        if (pair.length !== 2) return
        const left = pair.find((image) => image.dataset.imageLayout === 'half-left')
        const right = pair.find((image) => image.dataset.imageLayout === 'half-right')
        if (!left || !right) return

        const savedWidth = Number(left.dataset.imagePairWidth ?? right.dataset.imagePairWidth)
        const leftWidth = Number.isFinite(savedWidth) ? clamp(savedWidth, 25, 75) : 50
        const savedHeight = Number(left.dataset.imagePairHeight ?? right.dataset.imagePairHeight)
        const leftAspect = left.naturalWidth > 0 && left.naturalHeight > 0
          ? left.naturalWidth / left.naturalHeight
          : 1
        const rightAspect = right.naturalWidth > 0 && right.naturalHeight > 0
          ? right.naturalWidth / right.naturalHeight
          : 1
        const fallbackHeight = Math.min((leftWidth / 100) / leftAspect, ((100 - leftWidth) / 100) / rightAspect)
        const heightRatio = Number.isFinite(savedHeight) ? clamp(savedHeight, 0.12, 1.2) : fallbackHeight
        const rowHeight = Math.round(el.clientWidth * heightRatio)

        left.style.width = `${leftWidth}%`
        right.style.width = `${100 - leftWidth}%`
        left.style.height = `${rowHeight}px`
        right.style.height = `${rowHeight}px`
      })
    }

    applyPairLayout()
    const onImageLoad = () => applyPairLayout()
    imageElements.forEach((image) => image.addEventListener('load', onImageLoad))
    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(applyPairLayout)
      : null
    observer?.observe(el)

    return () => {
      imageElements.forEach((image) => image.removeEventListener('load', onImageLoad))
      observer?.disconnect()
    }
  }, [html])

  const collectImages = useCallback(() => {
    const el = containerRef.current
    if (!el) return [] as HTMLImageElement[]
    return Array.from(el.querySelectorAll('img'))
  }, [])

  const onClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement

      // 술 임베드 칩 → SPA 이동
      const chip = target.closest('a.di-spirit-embed')
      if (chip) {
        const id = chip.getAttribute('data-spirit-id')
        if (id) {
          e.preventDefault()
          navigate(`/spirits/${id}`)
        }
        return
      }

      // 이미지 클릭 → 라이트박스
      const imgEl = target.closest('img')
      if (imgEl) {
        const imgs = collectImages()
        const idx = imgs.indexOf(imgEl as HTMLImageElement)
        if (idx >= 0) {
          e.preventDefault()
          setImages(imgs.map((im) => im.currentSrc || im.src))
          setLightbox({ open: true, index: idx })
        }
      }
    },
    [navigate, collectImages],
  )

  return (
    <>
      <div
        ref={containerRef}
        className={className}
        onClick={onClick}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
      />
      <ImageLightbox
        images={images}
        initialIndex={lightbox.index}
        open={lightbox.open}
        onClose={() => setLightbox((s) => ({ ...s, open: false }))}
      />
    </>
  )
}
