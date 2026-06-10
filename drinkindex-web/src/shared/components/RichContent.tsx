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

  // 렌더 후 본문 이미지에 확대 커서 부여 (라이트박스 진입 가능 안내)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.querySelectorAll('img').forEach((im) => {
      im.style.cursor = 'zoom-in'
    })
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
