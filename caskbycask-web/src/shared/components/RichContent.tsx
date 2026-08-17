import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { sanitizeHtml } from '@/shared/utils/sanitize'
import ImageLightbox from './ImageLightbox'

interface Props {
  html: string
  className?: string
}

// 게시글/공지 등 TipTap 본문을 읽기 화면에 렌더링.
//   - sanitizeHtml 로 2차 정제 후 출력
//   - 본문 내 술 임베드 칩(.di-spirit-embed[data-spirit-id]) 클릭 시 SPA 이동
//     (href 는 sanitize 단계에서 제거되므로 data-spirit-id 로 위임 — 대신 렌더 후 다시 채운다.
//      크롤러는 클릭하지 않으므로 href 가 없으면 글 → 주류 링크가 아예 없는 셈이 된다)
//   - 본문 내 이미지(<img>) 클릭 시 라이트박스(확대/줌/이전·다음) 표시
export default function RichContent({ html, className }: Props) {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [images, setImages] = useState<string[]>([])
  const [lightbox, setLightbox] = useState({ open: false, index: 0 })

  /**
   * 본문 주류 카드에 실제 href 를 채운다.
   *
   * sanitize 단계가 href 를 제거하므로 임베드는 클릭 이동만 가능한 상태로 남는다. 그러면
   * 크롤러에게는 막다른 길이 된다 — 크롤러는 클릭하지 않고 href 만 따라가기 때문이다.
   * SSR(SeoFallback)은 canonical slug 로 href 를 채우지만 하이드레이션 때 이 컴포넌트로
   * 교체되므로, 구글이 최종적으로 보는 DOM 에서는 글 → 주류 링크가 사라진다.
   *
   * 정본 slug 는 서버만 알기에 여기서는 id 경로를 쓴다 — 주류 라우트가 301 로 canonical 로
   * 넘겨 주므로 신호는 같은 곳에 모인다. 클릭 시 SPA 이동은 onClick 이 그대로 가로챈다.
   */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const localePrefix = i18n.language === 'en' ? '/en' : '/ko'
    el.querySelectorAll('a[data-spirit-id]').forEach((anchor) => {
      const spiritId = anchor.getAttribute('data-spirit-id')
      if (!spiritId || anchor.getAttribute('href')) return
      anchor.setAttribute('href', `${localePrefix}/spirits/${spiritId}`)
    })
  }, [html, i18n.language])

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

        const leftFigure = left.closest<HTMLElement>('.di-image-with-source--paired')
        const rightFigure = right.closest<HTMLElement>('.di-image-with-source--paired')

        // 출처가 있는 반반 이미지는 각각 figure 안에 들어간다. 이때 폭은 바깥 figure에
        // 적용하고 내부 이미지는 figure를 가득 채워야 절반 폭이 이중 적용되지 않는다.
        if (leftFigure) {
          leftFigure.style.width = `${leftWidth}%`
          left.style.setProperty('width', '100%', 'important')
        } else {
          left.style.width = `${leftWidth}%`
        }
        if (rightFigure) {
          rightFigure.style.width = `${100 - leftWidth}%`
          right.style.setProperty('width', '100%', 'important')
        } else {
          right.style.width = `${100 - leftWidth}%`
        }
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

  // 리뷰 카드는 저장 당시 언어와 무관하게 현재 UI 언어로 술 이름과 라벨을 표시한다.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const formatDecimal = (value: string | null) => {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed.toFixed(1) : '-'
    }
    const formatAbv = (value: string) => {
      const parsed = Number(value)
      if (!Number.isFinite(parsed)) return value
      return Number.isInteger(parsed) ? String(parsed) : parsed.toFixed(1)
    }

    container.querySelectorAll<HTMLElement>('a.di-review-embed[data-review-id]').forEach((card) => {
      const isEn = i18n.language === 'en'
      const nameKo = card.dataset.spiritNameKo ?? ''
      const nameEn = card.dataset.spiritNameEn || nameKo
      const identifierKo = card.dataset.spiritIdentifierKo ?? ''
      const identifierEn = card.dataset.spiritIdentifierEn || identifierKo
      const primaryName = isEn ? nameEn : nameKo
      const secondaryName = isEn ? nameKo : nameEn
      const primaryIdentifier = isEn ? identifierEn : identifierKo
      const secondaryIdentifier = isEn ? identifierKo : identifierEn
      const join = (name: string, identifier: string) => identifier ? `${name} — ${identifier}` : name

      const setText = (role: string, value: string) => {
        const element = card.querySelector<HTMLElement>(`[data-review-role='${role}']`)
        if (element) element.textContent = value
        return element
      }

      setText('title', join(primaryName, primaryIdentifier))
      const subtitle = setText('subtitle', join(secondaryName, secondaryIdentifier))
      if (subtitle) subtitle.hidden = !secondaryName || secondaryName === primaryName

      const abv = card.querySelector<HTMLElement>("[data-review-role='abv']")
      if (abv) {
        const value = card.dataset.spiritAbv
        abv.hidden = !value
        if (value) abv.textContent = t('editor.reviewCard.abv', { value: formatAbv(value) })
      }
      setText('review-count', t('editor.reviewCard.reviewCount', {
        count: Number(card.dataset.spiritReviewCount ?? 0),
      }))
      setText('total-label', t('editor.reviewCard.total'))
      setText('total-score', formatDecimal(card.dataset.reviewTotalScore ?? null))

      const sections = {
        nose: {
          label: t('editor.reviewCard.nose'),
          score: card.dataset.reviewNoseScore,
          note: card.dataset.reviewNoseNote,
        },
        taste: {
          label: t('editor.reviewCard.taste'),
          score: card.dataset.reviewTasteScore,
          note: card.dataset.reviewTasteNote,
        },
        finish: {
          label: t('editor.reviewCard.finish'),
          score: card.dataset.reviewFinishScore,
          note: card.dataset.reviewFinishNote,
        },
        overall: {
          label: t('editor.reviewCard.overall'),
          score: undefined,
          note: card.dataset.reviewComment,
        },
      }

      Object.entries(sections).forEach(([sectionName, values]) => {
        const section = card.querySelector<HTMLElement>(`[data-review-section='${sectionName}']`)
        if (!section) return
        const label = section.querySelector<HTMLElement>("[data-review-role='label']")
        const score = section.querySelector<HTMLElement>("[data-review-role='section-score']")
        const note = section.querySelector<HTMLElement>("[data-review-role='note']")
        if (label) label.textContent = values.label
        if (score) {
          score.hidden = values.score == null
          score.textContent = values.score == null ? '' : formatDecimal(values.score)
        }
        if (note) note.textContent = values.note || t('editor.reviewCard.noNote')
      })
    })
  }, [html, i18n.language, t])

  const collectImages = useCallback(() => {
    const el = containerRef.current
    if (!el) return [] as HTMLImageElement[]
    return Array.from(el.querySelectorAll('img'))
  }, [])

  const onClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement

      // 술 임베드 칩 → SPA 이동
      const chip = target.closest('a.di-spirit-embed, a.di-review-embed')
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
