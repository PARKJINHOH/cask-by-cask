import type { Map as MapLibreMap } from 'maplibre-gl'

/**
 * 마커 핀 아이콘을 스타일에 등록한다.
 *
 * <p>원형 점 대신 <b>물방울 핀</b>을 쓰는 이유는 앵커가 분명해서다 — 원은 중심이 위치이고
 * 핀은 뾰족한 끝이 위치라, 사람이 "여기"라고 읽는 지점과 실제 좌표가 일치한다.
 * 지도 앱들이 전부 핀을 쓰는 것도 같은 이유다.
 *
 * <p>스프라이트를 받아오지 않고 캔버스로 그린다 — 외부 이미지 요청이 하나 줄고,
 * 선택 상태처럼 색만 다른 변형을 만들기도 쉽다.
 */
export function registerPinIcons(map: MapLibreMap): void {
  const pins: Array<{ name: string; fill: string; stroke: string; scale: number }> = [
    { name: 'cbc-pin', fill: '#d97706', stroke: '#ffffff', scale: 1 },
    { name: 'cbc-pin-selected', fill: '#7c2d12', stroke: '#ffffff', scale: 1.25 },
  ]

  for (const pin of pins) {
    if (map.hasImage(pin.name)) continue
    const image = drawPin(pin.fill, pin.stroke, pin.scale)
    if (image) map.addImage(pin.name, image, { pixelRatio: 2 })
  }
}

/** 물방울 핀 하나를 캔버스에 그려 ImageData 로 돌려준다. */
function drawPin(fill: string, stroke: string, scale: number): ImageData | null {
  const width = Math.round(56 * scale)
  const height = Math.round(72 * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const cx = width / 2
  const headRadius = width * 0.34
  const cy = headRadius + width * 0.09
  const tipY = height - width * 0.06

  // 꼬리가 붙는 지점 — 머리 원의 좌우 아래쪽. 여기서 시작해 여기서 끝나야 도형이 닫힌다.
  const seam = Math.PI * 0.15
  const seamX = headRadius * Math.cos(seam)
  const seamY = headRadius * Math.sin(seam)

  ctx.beginPath()
  // 머리(원) — 왼쪽 이음매에서 위를 돌아 오른쪽 이음매까지. 아래쪽은 열어 두고 꼬리로 잇는다.
  ctx.arc(cx, cy, headRadius, Math.PI - seam, seam, false)
  // 꼬리 — 오른쪽 이음매에서 뾰족한 끝으로 내려갔다가 왼쪽 이음매로 돌아온다.
  ctx.quadraticCurveTo(cx + headRadius * 0.62, cy + headRadius * 1.35, cx, tipY)
  ctx.quadraticCurveTo(cx - headRadius * 0.62, cy + headRadius * 1.35, cx - seamX, cy + seamY)
  ctx.closePath()

  ctx.fillStyle = fill
  ctx.fill()
  ctx.lineWidth = Math.max(2, width * 0.055)
  ctx.strokeStyle = stroke
  ctx.stroke()

  // 가운데 흰 점 — 핀이 작아졌을 때도 형태가 읽히게 한다.
  ctx.beginPath()
  ctx.arc(cx, cy, headRadius * 0.34, 0, Math.PI * 2)
  ctx.fillStyle = stroke
  ctx.fill()

  return ctx.getImageData(0, 0, width, height)
}
