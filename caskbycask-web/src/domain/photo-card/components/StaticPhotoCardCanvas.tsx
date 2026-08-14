import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react'
import { ensureEditorFontCssLoaded } from '@/shared/components/imageEditorFontCss'
import { getTextFont, type TextFontKey } from '@/shared/components/imageEditorText'
import { PHOTO_CARD_MAX_EDGE } from '../constants/photoCardRatios'
import type { PhotoCardDataContext, PhotoCardLayout } from '../types/photoCard.types'
import {
  frameSizeOf,
  IDENTITY_PHOTO_TRANSFORM,
  shortSideOf,
  type LoadedImages,
} from '../utils/photoCardRender'
import {
  getDrawableLayers,
  resolveLayerImageUrl,
  resolveLayerText,
} from '../utils/resolveBindings'
import PhotoCardCanvas from './PhotoCardCanvas'

interface Props {
  canvasRef: RefObject<HTMLCanvasElement | null>
  layout: PhotoCardLayout
  context: PhotoCardDataContext
  photoUrl: string
  maxEdge?: number
  className?: string
  onReadyChange?: (ready: boolean) => void
}

const loadImage = (src: string): Promise<HTMLImageElement | null> => new Promise((resolve) => {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  image.onload = () => resolve(image)
  image.onerror = () => resolve(null)
  image.src = src
})

/**
 * 편집기와 같은 Canvas 렌더러로 읽기 전용 카드를 그린다.
 * 공유 미리보기·공유 이미지 저장이 이 컴포넌트를 사용하므로 편집기 다운로드와 좌표가 달라질 수 없다.
 */
export default function StaticPhotoCardCanvas({
  canvasRef,
  layout,
  context,
  photoUrl,
  maxEdge = PHOTO_CARD_MAX_EDGE,
  className = '',
  onReadyChange,
}: Props) {
  const size = useMemo(() => frameSizeOf(layout.frame, maxEdge), [layout.frame, maxEdge])
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null)
  const [images, setImages] = useState<LoadedImages>(new Map())
  const [fontsReady, setFontsReady] = useState(false)

  const layerImageUrls = useMemo(() => Array.from(new Set(
    layout.layers
      .filter((layer) => layer.type === 'IMAGE')
      .map((layer) => resolveLayerImageUrl(layer, context))
      .filter((url): url is string => Boolean(url)),
  )), [context, layout.layers])

  useEffect(() => {
    let cancelled = false
    setPhoto(null)
    onReadyChange?.(false)
    void loadImage(photoUrl).then((loaded) => {
      if (!cancelled) setPhoto(loaded)
    })
    return () => { cancelled = true }
  }, [onReadyChange, photoUrl])

  useEffect(() => {
    let cancelled = false
    onReadyChange?.(false)
    if (layerImageUrls.length === 0) {
      setImages(new Map())
      return () => { cancelled = true }
    }
    void Promise.all(layerImageUrls.map(async (url) => [url, await loadImage(url)] as const))
      .then((entries) => {
        if (cancelled) return
        const loaded: LoadedImages = new Map()
        entries.forEach(([url, image]) => { if (image) loaded.set(url, image) })
        setImages(loaded)
      })
    return () => { cancelled = true }
  }, [layerImageUrls, onReadyChange])

  useEffect(() => {
    let cancelled = false
    setFontsReady(false)
    onReadyChange?.(false)
    void (async () => {
      await ensureEditorFontCssLoaded()
      if (typeof document !== 'undefined' && document.fonts) {
        const shortSide = shortSideOf(size)
        await Promise.all(getDrawableLayers(layout.layers, context)
          .filter((layer) => layer.type === 'TEXT')
          .map(async (layer) => {
            const font = getTextFont((layer.fontKey ?? 'pretendardBold') as TextFontKey)
            const px = Math.max(1, Math.round((layer.fontSizeRatio ?? 0.04) * shortSide))
            try {
              await document.fonts.load(
                `${font.weight} ${px}px ${font.family}`,
                resolveLayerText(layer, context),
              )
            } catch {
              // Font Loading API가 실패해도 Canvas 폴백으로 미리보기를 계속 제공한다.
            }
          }))
      }
      if (!cancelled) setFontsReady(true)
    })()
    return () => { cancelled = true }
  }, [context, layout.layers, onReadyChange, size])

  const allLayerImagesReady = layerImageUrls.every((url) => images.has(url))
  const resourcesReady = photo != null && fontsReady && allLayerImagesReady
  const handleRendered = useCallback(() => {
    if (resourcesReady) onReadyChange?.(true)
  }, [onReadyChange, resourcesReady])

  return (
    <div className={`h-full w-full ${className}`}>
      <PhotoCardCanvas
        canvasRef={canvasRef}
        size={size}
        layout={layout}
        context={context}
        photo={photo}
        images={images}
        photoTransform={IDENTITY_PHOTO_TRANSFORM}
        fontsReady={fontsReady}
        watermark={null}
        onRendered={handleRendered}
      />
    </div>
  )
}
