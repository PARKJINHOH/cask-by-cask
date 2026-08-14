import { useCallback, useEffect, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import type { PhotoCardDataContext, PhotoCardLayout } from '../types/photoCard.types'
import {
  drawPhotoCard,
  drawWatermark,
  type LoadedImages,
  type PhotoCardCanvasSize,
  type PhotoTransform,
} from '../utils/photoCardRender'

interface Props {
  canvasRef: RefObject<HTMLCanvasElement | null>
  size: PhotoCardCanvasSize
  layout: PhotoCardLayout
  context: PhotoCardDataContext
  photo: HTMLImageElement | null
  images: LoadedImages
  photoTransform: PhotoTransform
  fontsReady: boolean
  /** 비회원 저장본에 얹히는 브랜드 마크. 있으면 미리보기에도 같은 자리에 그린다. */
  watermark: HTMLImageElement | null
  /** 실제 캔버스 그리기가 끝난 뒤 호출한다. 공유 미리보기의 저장 버튼 준비 상태에 쓴다. */
  onRendered?: () => void
}

/**
 * 미리보기 캔버스.
 *
 * 캔버스의 내부 해상도는 최종 출력과 동일하다(CSS 로만 크기를 바꿔 보여 준다) —
 * 미리보기에서 보이는 배치가 저장 결과와 어긋나지 않는다.
 *
 * 선택 표시·가이드선·핸들은 여기서 그리지 않는다. 캔버스 좌표계(2048px)에 그리면
 * 확대할 때 점선까지 같이 굵어진다. 화면용 표시는 PhotoCardOverlay 가 SVG 로 얹는다.
 */
export default function PhotoCardCanvas({
  canvasRef, size, layout, context, photo, images, photoTransform, fontsReady, watermark,
  onRendered,
}: Props) {
  const { t } = useTranslation()

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (canvas.width !== size.width || canvas.height !== size.height) {
      canvas.width = size.width
      canvas.height = size.height
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    drawPhotoCard(ctx, size, layout, context, photo, images, photoTransform)
    // 요소가 아니라 저장본에 찍히는 표시라 레이어 목록에도, 선택에도 잡히지 않는다.
    if (watermark) drawWatermark(ctx, size, watermark)
    onRendered?.()
  }, [canvasRef, context, images, layout, onRendered, photo, photoTransform, size, watermark])

  // fontsReady 는 그리기 인자가 아니지만, 글꼴이 붙은 뒤 한 번 더 그려야 폴백 글꼴이 남지 않는다.
  useEffect(() => { render() }, [render, fontsReady])

  // 캔버스에 배경색을 주지 않는다 — 모서리를 둥글게 깎은 자리가 흰색으로 채워져
  // 실제 출력(PNG 는 투명, JPEG 는 카드 배경색)과 다르게 보인다. 뒤에 깔린 체커보드가 비쳐야 맞다.
  return (
    <canvas
      ref={canvasRef}
      aria-label={t('photoCard.title')}
      className="block h-full w-full select-none"
      style={{ touchAction: 'none' }}
    />
  )
}
