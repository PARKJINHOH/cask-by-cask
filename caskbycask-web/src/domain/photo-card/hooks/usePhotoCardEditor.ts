import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ensureEditorFontCssLoaded } from '@/shared/components/imageEditorFontCss'
import { getTextFont, type TextFontKey } from '@/shared/components/imageEditorText'
import { defaultPhotoCardLayout } from '../constants/builtinLayouts'
import {
  PHOTO_CARD_MAX_EDGE, PHOTO_CARD_NATIVE_MAX_EDGE, PHOTO_CARD_RATIOS, ratioValue,
} from '../constants/photoCardRatios'
import type {
  PhotoCardBinding,
  PhotoCardDataContext,
  PhotoCardLayer,
  PhotoCardLayout,
  PhotoCardPadding,
  PhotoCardPhotoFit,
  PhotoCardPosition,
  PhotoCardRatio,
  PhotoCardReviewInfo,
  PhotoCardSpiritInfo,
  PhotoCardUserInput,
  PhotoExif,
} from '../types/photoCard.types'
import { readPhotoExif } from '../utils/exifReader'
import { CASKBYCASK_TAG, withImageMetadata } from '../utils/imageMetadata'
import {
  createLayerId, normalizeLayer, normalizeLayout, PHOTO_CARD_MAX_LAYERS,
} from '../utils/layoutSchema'
import type { PhotoCardDraft } from '../utils/photoCardDraft'
import {
  drawPhotoCard, drawWatermark, frameSizeOf, photoRectOf,
  reanchorLayersForExtend, reflowLayersForFrame, shortSideOf,
  IDENTITY_PHOTO_TRANSFORM, type LoadedImages, type PhotoTransform,
} from '../utils/photoCardRender'
import {
  getDrawableLayers, isSpiritBinding, resolveBindingValue, resolveLayerImageUrl, resolveLayerText,
} from '../utils/resolveBindings'

const EMPTY_USER_INPUT: PhotoCardUserInput = { place: '', memo: '', date: '' }

/** 사용자가 직접 적은 값 — 템플릿이 바뀌어도 사라지면 안 되는 것들 */
export const USER_BINDINGS: PhotoCardBinding[] = ['USER_PLACE', 'USER_MEMO', 'USER_DATE']

const CARRY_LINE_STEP = 0.035
/** 카드 아래 끝 여유 — 이보다 내려가면 글자가 잘린다 */
const CARRY_BOTTOM_LIMIT = 0.985

/** 되돌리기 깊이. 스냅샷마다 레이아웃 전체를 복사하므로 무제한이면 메모리가 계속 늘어난다. */
const HISTORY_LIMIT = 50

/**
 * 새 템플릿에 자리가 없는 직접 입력값을 카드에 얹는다.
 *
 * 정보 밴드에 남은 줄이 있으면 기존 보조 텍스트 아래에 이어 붙이고,
 * 밴드가 이미 꽉 찬 템플릿(예: 세로 정렬)은 <b>사진 위</b>에 캡션처럼 얹는다.
 * 억지로 밴드에 밀어 넣으면 줄이 서로 겹쳐 읽을 수 없게 된다.
 */
export const placeCarriedLayers = (layout: PhotoCardLayout, bindings: PhotoCardBinding[]) => {
  const texts = layout.layers.filter((layer) => layer.type === 'TEXT')
  // 가장 작은 글씨 = 그 템플릿의 보조 정보 줄. 새로 얹는 값도 같은 격으로 보이게 한다.
  const donor = texts.slice().sort(
    (a, b) => (a.fontSizeRatio ?? 0.04) - (b.fontSizeRatio ?? 0.04),
  )[0]
  const baseY = texts.reduce((max, layer) => Math.max(max, layer.position.y), 0.86)

  // 크기 비율은 '짧은 변' 기준인데 y 는 '높이' 기준이라, 줄 간격을 판단하려면 환산해야 한다.
  // (환산 없이 상수로 비교하면 세로 카드에서 줄이 겹치거나 불필요하게 사진 위로 밀린다)
  const value = ratioValue(layout.frame.ratio)
  const fontHeightInY = (donor?.fontSizeRatio ?? 0.026) * (value <= 1 ? value : 1)
  const minGap = fontHeightInY * 1.15

  // 밴드에 남은 공간에 맞춰 줄 간격을 좁힌다. 글자 높이보다 좁아지면 읽을 수 없으므로 포기한다.
  const available = CARRY_BOTTOM_LIMIT - baseY
  const step = Math.min(CARRY_LINE_STEP, available / bindings.length)
  const fitsInBand = step >= minGap

  // 사진 아래 경계 — 밴드에 자리가 없을 때 캡션을 올릴 기준
  const probe = frameSizeOf(layout.frame, 1000)
  const rect = photoRectOf(layout, probe)
  const photoBottomY = (rect.top + rect.height) / probe.height

  bindings.forEach((binding, index) => {
    const overPhoto = !fitsInBand
    // 사진 위에 얹을 때는 아래에서 위로 쌓아 사진 하단 여백에 붙인다.
    const y = overPhoto
      ? photoBottomY - 0.03 - (bindings.length - 1 - index) * CARRY_LINE_STEP
      : baseY + (index + 1) * step

    layout.layers.push(normalizeLayer({
      id: createLayerId(),
      type: 'TEXT',
      position: { x: donor?.position.x ?? 0.5, y },
      visible: true,
      binding,
      overridden: false,
      text: '',
      fontKey: donor?.fontKey ?? 'pretendardMedium',
      fontSizeRatio: donor?.fontSizeRatio ?? 0.026,
      // 사진 위는 배경이 무엇일지 알 수 없어 흰 글씨 + 검은 외곽선으로 읽히게 한다.
      color: overPhoto ? '#ffffff' : (donor?.color ?? '#555555'),
      outlineEnabled: overPhoto ? true : donor?.outlineEnabled,
      outlineColor: overPhoto ? '#000000' : donor?.outlineColor,
      outlineWidthRatio: overPhoto ? 0.0025 : donor?.outlineWidthRatio,
    }))
  })
}

/** 손으로 고쳐 둔 주류 글자. 주류를 새로 고르면 그 주류의 값으로 되돌려 준다. */
const isOverriddenSpiritText = (layer: PhotoCardLayer) =>
  layer.type === 'TEXT' && layer.overridden === true && isSpiritBinding(layer.binding)

const loadImage = (src: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = src
  })

/**
 * 원본이 출력 상한보다 크면 미리 줄여 둔다.
 *
 * 브라우저가 사진을 열면 파일 크기와 무관하게 <b>가로×세로×4바이트</b>를 통째로 물고 있는다
 * (6000만 화소 = 240MB). 그런데 카드는 아무리 크게 뽑아도 긴 변이 4096px 이라
 * 그보다 큰 원본은 어차피 그리는 순간 줄어든다 — 화질은 그대로인데 메모리만 먹는 셈이다.
 * 모바일 브라우저는 이 지점에서 캔버스가 비거나 탭이 죽는다.
 *
 * @returns 줄일 필요가 없으면 받은 이미지를 그대로 돌려준다.
 */
const downscaleToExportLimit = async (image: HTMLImageElement): Promise<HTMLImageElement> => {
  const longEdge = Math.max(image.naturalWidth, image.naturalHeight)
  if (longEdge <= PHOTO_CARD_NATIVE_MAX_EDGE) return image

  const scale = PHOTO_CARD_NATIVE_MAX_EDGE / longEdge
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return image
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

  // 무손실(PNG)로 되돌린다 — 여기서 또 JPEG 로 압축하면 원본을 두 번 깎는 꼴이 된다.
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return image
  const url = URL.createObjectURL(blob)
  const reduced = await loadImage(url)
  if (!reduced) {
    URL.revokeObjectURL(url)
    return image
  }
  return reduced
}

/**
 * 비회원 저장본에 얹는 브랜드 마크.
 *
 * 파비콘용 512px 판을 쓴다 — 헤더의 logo.png 와 같은 마크인데 그쪽은 100px 이라
 * 2048px 카드에 얹으면 뭉개진다. 한 번 받아서 계속 쓴다(내려받을 때마다 다시 받지 않는다).
 */
const WATERMARK_SRC = '/android-chrome-512x512.png'
let watermarkPromise: Promise<HTMLImageElement | null> | null = null
const loadWatermark = () => {
  if (!watermarkPromise) {
    watermarkPromise = loadImage(WATERMARK_SRC).then((image) => {
      // 못 받아 왔으면 다음 저장 때 다시 시도한다.
      if (!image) watermarkPromise = null
      return image
    })
  }
  return watermarkPromise
}

/**
 * 되돌리기 한 단위. 레이아웃과 사진 확대·이동을 함께 담는다 —
 * 사진을 밀어 놓고 Ctrl+Z 를 눌렀는데 글자만 되돌아가면 사용자는 무엇이 취소됐는지 알 수 없다.
 */
interface EditorDoc {
  layout: PhotoCardLayout
  photoTransform: PhotoTransform
}

const createDoc = (): EditorDoc => ({
  layout: defaultPhotoCardLayout(),
  photoTransform: { ...IDENTITY_PHOTO_TRANSFORM },
})

interface EditorOptions {
  /**
   * 저장본에 브랜드 마크가 얹히는 상태인가(비회원).
   *
   * 켜면 편집 화면에도 같은 자리에 마크를 그린다 — "받고 나서야 알게 되는" 표시가 없도록,
   * 만드는 내내 결과와 같은 모습을 보여 준다.
   */
  watermark?: boolean
}

/**
 * 포토카드 편집 상태.
 *
 * 미리보기와 최종 출력이 같은 렌더 함수를 쓰기 때문에 "보이는 그대로 저장된다".
 * 폰트는 캔버스에 그리기 전에 반드시 로드해야 한다 — 안 그러면 첫 렌더가 폴백 글꼴로 그려진다.
 */
export const usePhotoCardEditor = ({ watermark = false }: EditorOptions = {}) => {
  const [doc, setDoc] = useState<EditorDoc>(createDoc)
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([])
  // 잠금은 편집 보조일 뿐 템플릿 데이터가 아니다 — 저장하지도, 되돌리기에 담지도 않는다.
  const [lockedIds, setLockedIds] = useState<ReadonlySet<string>>(() => new Set())
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoImage, setPhotoImage] = useState<HTMLImageElement | null>(null)
  const [exif, setExif] = useState<PhotoExif | null>(null)
  const [spirit, setSpirit] = useState<PhotoCardSpiritInfo | null>(null)
  const [review, setReview] = useState<PhotoCardReviewInfo | null>(null)
  const [userInput, setUserInput] = useState<PhotoCardUserInput>(EMPTY_USER_INPUT)
  const [images, setImages] = useState<LoadedImages>(() => new Map())
  const [fontsReady, setFontsReady] = useState(false)
  const [history, setHistory] = useState({ canUndo: false, canRedo: false })
  /** 미리보기에 얹을 브랜드 마크. 비회원일 때만 받아 온다. */
  const [watermarkImage, setWatermarkImage] = useState<HTMLImageElement | null>(null)

  const objectUrlRef = useRef<string | null>(null)
  /** 브라우저 권한 없이 편집기 요소만 안전하게 복사하는 내부 클립보드. */
  const layerClipboardRef = useRef<PhotoCardLayer[]>([])

  // ── 되돌리기 ────────────────────────────────────────────
  // 상태 갱신 함수 안에서 ref 를 건드리면 StrictMode 의 이중 호출에 히스토리가 두 번 쌓인다.
  // 현재 문서를 ref 로 따로 들고 있다가 갱신 밖에서 계산한다.
  const docRef = useRef(doc)
  const pastRef = useRef<EditorDoc[]>([])
  const futureRef = useRef<EditorDoc[]>([])
  const gestureRef = useRef<string | null>(null)

  const syncHistory = useCallback(() => {
    setHistory({ canUndo: pastRef.current.length > 0, canRedo: futureRef.current.length > 0 })
  }, [])

  const applyDoc = useCallback((next: EditorDoc) => {
    docRef.current = next
    setDoc(next)
  }, [])

  /**
   * 문서를 바꾸는 유일한 통로.
   *
   * @param gesture 같은 문자열이 이어지는 동안은 되돌리기 단계를 새로 만들지 않는다.
   *   드래그 100 프레임이 되돌리기 100번이 되는 것을 막는다. 제스처가 끝나면 endGesture() 를 부른다.
   */
  const commit = useCallback((
    producer: (current: EditorDoc) => EditorDoc,
    gesture?: string,
  ) => {
    const current = docRef.current
    const next = producer(current)
    if (next === current) return
    if (gesture == null || gesture !== gestureRef.current) {
      pastRef.current = [...pastRef.current, current].slice(-HISTORY_LIMIT)
      futureRef.current = []
    }
    gestureRef.current = gesture ?? null
    applyDoc(next)
    syncHistory()
  }, [applyDoc, syncHistory])

  /** 드래그·슬라이더를 놓았을 때. 다음 변경은 새 되돌리기 단계가 된다. */
  const endGesture = useCallback(() => { gestureRef.current = null }, [])

  /** 없어진 레이어를 선택한 채로 두지 않는다(되돌리기로 추가 이전 상태에 갔을 때). */
  const pruneSelection = useCallback((layout: PhotoCardLayout) => {
    setSelectedLayerIds((current) => {
      const alive = current.filter((id) => layout.layers.some((layer) => layer.id === id))
      return alive.length === current.length ? current : alive
    })
  }, [])

  const undo = useCallback(() => {
    const previous = pastRef.current[pastRef.current.length - 1]
    if (!previous) return
    pastRef.current = pastRef.current.slice(0, -1)
    futureRef.current = [docRef.current, ...futureRef.current].slice(0, HISTORY_LIMIT)
    gestureRef.current = null
    applyDoc(previous)
    syncHistory()
    pruneSelection(previous.layout)
  }, [applyDoc, pruneSelection, syncHistory])

  const redo = useCallback(() => {
    const next = futureRef.current[0]
    if (!next) return
    futureRef.current = futureRef.current.slice(1)
    pastRef.current = [...pastRef.current, docRef.current].slice(-HISTORY_LIMIT)
    gestureRef.current = null
    applyDoc(next)
    syncHistory()
    pruneSelection(next.layout)
  }, [applyDoc, pruneSelection, syncHistory])

  const layout = doc.layout
  const photoTransform = doc.photoTransform

  const dataContext: PhotoCardDataContext = useMemo(
    () => ({ exif, spirit, review, user: userInput }),
    [exif, review, spirit, userInput],
  )

  // ── 선택 ────────────────────────────────────────────────
  const selectedLayers = useMemo(
    () => layout.layers.filter((layer) => selectedLayerIds.includes(layer.id)),
    [layout.layers, selectedLayerIds],
  )
  /** 인스펙터는 하나만 골랐을 때 뜬다 — 서로 다른 속성을 가진 여럿을 한 폼에 담을 수 없다. */
  const selectedLayer = selectedLayers.length === 1 ? selectedLayers[0] : null

  const selectLayer = useCallback((layerId: string | null, additive = false) => {
    setSelectedLayerIds((current) => {
      if (!layerId) return current.length === 0 ? current : []
      if (!additive) return current.length === 1 && current[0] === layerId ? current : [layerId]
      return current.includes(layerId)
        ? current.filter((id) => id !== layerId)
        : [...current, layerId]
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedLayerIds(layout.layers.filter((layer) => !lockedIds.has(layer.id)).map((l) => l.id))
  }, [layout.layers, lockedIds])

  const toggleLock = useCallback((layerId: string) => {
    setLockedIds((current) => {
      const next = new Set(current)
      if (next.has(layerId)) next.delete(layerId)
      else next.add(layerId)
      return next
    })
    // 잠근 요소는 선택에서 뺀다 — 잡히지 않는데 인스펙터만 떠 있으면 조작이 안 먹는 것처럼 보인다.
    setSelectedLayerIds((current) => (
      lockedIds.has(layerId) ? current : current.filter((id) => id !== layerId)
    ))
  }, [lockedIds])

  // ── 사진 ────────────────────────────────────────────────
  /**
   * @param keepExif 이미 읽어 둔 촬영 정보를 유지한다.
   *   사진 보정(크롭·회전)을 거치면 결과가 캔버스에서 나온 PNG 라 EXIF 가 없다.
   *   그대로 다시 읽으면 카드에 넣으려던 촬영 정보가 통째로 사라진다.
   * @returns 브라우저가 디코딩하지 못하면 false (Chrome·Edge 의 HEIC 등)
   */
  const setPhoto = useCallback(async (file: File, keepExif = false): Promise<boolean> => {
    const url = URL.createObjectURL(file)
    const image = await loadImage(url)
    if (!image) {
      URL.revokeObjectURL(url)
      return false
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = url
    setPhotoFile(file)
    // photoUrl 은 사진 보정 모달에 넘기는 값이라 원본 그대로 둔다 —
    // 자르기·회전은 원본에서 하는 편이 결과가 낫다.
    setPhotoUrl(url)
    setPhotoImage(await downscaleToExportLimit(image))
    if (!keepExif) setExif(await readPhotoExif(file))
    // 사진이 바뀌면 이전 사진 기준으로 잡아 둔 확대·이동은 의미가 없다.
    commit((current) => (
      current.photoTransform.scale === 1
        && current.photoTransform.offsetX === 0
        && current.photoTransform.offsetY === 0
        ? current
        : { ...current, photoTransform: { ...IDENTITY_PHOTO_TRANSFORM } }
    ))
    return true
  }, [commit])

  const patchPhotoTransform = useCallback((
    patch: Partial<PhotoTransform>,
    gesture?: string,
  ) => {
    commit((current) => ({
      ...current,
      photoTransform: {
        scale: Math.max(1, Math.min(4, patch.scale ?? current.photoTransform.scale)),
        offsetX: Math.max(-1, Math.min(1, patch.offsetX ?? current.photoTransform.offsetX)),
        offsetY: Math.max(-1, Math.min(1, patch.offsetY ?? current.photoTransform.offsetY)),
      },
    }), gesture)
  }, [commit])

  const resetPhotoTransform = useCallback(() => {
    commit((current) => ({ ...current, photoTransform: { ...IDENTITY_PHOTO_TRANSFORM } }))
  }, [commit])

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
  }, [])

  // ── 워터마크 ────────────────────────────────────────────
  // 비회원일 때만 받는다. 회원은 저장본에도 마크가 없으므로 미리보기에 그릴 것도 없다.
  useEffect(() => {
    if (!watermark) {
      setWatermarkImage(null)
      return
    }
    let cancelled = false
    void loadWatermark().then((image) => { if (!cancelled) setWatermarkImage(image) })
    return () => { cancelled = true }
  }, [watermark])

  // ── 폰트 ────────────────────────────────────────────────
  // 그리기 직전에 실제로 쓰이는 글꼴·글자만 로드한다. 조각 단위 다운로드라 필요한 만큼만 받는다.
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setFontsReady(false)
      await ensureEditorFontCssLoaded()
      const size = frameSizeOf(layout.frame, PHOTO_CARD_MAX_EDGE)
      const shortSide = shortSideOf(size)
      if (typeof document !== 'undefined' && document.fonts) {
        await Promise.all(getDrawableLayers(layout.layers, dataContext)
          .filter((layer) => layer.type === 'TEXT')
          .map(async (layer) => {
            const font = getTextFont((layer.fontKey ?? 'pretendardBold') as TextFontKey)
            const px = Math.max(1, Math.round((layer.fontSizeRatio ?? 0.04) * shortSide))
            try {
              await document.fonts.load(`${font.weight} ${px}px ${font.family}`,
                resolveLayerText(layer, dataContext))
            } catch {
              // Font Loading API 실패 시 캔버스 자체 폴백으로 계속 진행한다.
            }
          }))
      }
      if (!cancelled) setFontsReady(true)
    }
    void load()
    return () => { cancelled = true }
  }, [layout, dataContext])

  // ── 이미지 레이어(로고·주류 이미지·업로드) 프리로드 ─────
  useEffect(() => {
    let cancelled = false
    const urls = Array.from(new Set(
      layout.layers
        .filter((layer) => layer.type === 'IMAGE')
        .map((layer) => resolveLayerImageUrl(layer, dataContext))
        .filter((url): url is string => Boolean(url)),
    ))
    if (urls.length === 0) {
      setImages((prev) => (prev.size === 0 ? prev : new Map()))
      return
    }
    void (async () => {
      const entries = await Promise.all(urls.map(async (url) => [url, await loadImage(url)] as const))
      if (cancelled) return
      const next: LoadedImages = new Map()
      entries.forEach(([url, image]) => { if (image) next.set(url, image) })
      setImages(next)
    })()
    return () => { cancelled = true }
  }, [layout.layers, dataContext])

  // ── 레이아웃 조작 ───────────────────────────────────────
  const withLayout = useCallback((
    producer: (layout: PhotoCardLayout) => PhotoCardLayout,
    gesture?: string,
  ) => {
    commit((current) => {
      const nextLayout = producer(current.layout)
      return nextLayout === current.layout ? current : { ...current, layout: nextLayout }
    }, gesture)
  }, [commit])

  const patchLayer = useCallback((
    layerId: string,
    patch: Partial<PhotoCardLayer>,
    gesture?: string,
  ) => {
    withLayout((current) => ({
      ...current,
      layers: current.layers.map((layer) => (
        layer.id === layerId ? normalizeLayer({ ...layer, ...patch }) : layer
      )),
    }), gesture)
  }, [withLayout])

  /** 정렬·분배 결과처럼 여러 요소를 한 번에 옮긴다. 되돌리기도 한 단계다. */
  const moveLayersTo = useCallback((
    positions: Map<string, PhotoCardPosition>,
    gesture?: string,
  ) => {
    if (positions.size === 0) return
    withLayout((current) => ({
      ...current,
      layers: current.layers.map((layer) => {
        const position = positions.get(layer.id)
        return position ? normalizeLayer({ ...layer, position }) : layer
      }),
    }), gesture)
  }, [withLayout])

  /** 선택한 요소 전부를 같은 거리만큼 민다(드래그·방향키). */
  const nudgeLayers = useCallback((
    layerIds: string[],
    dx: number,
    dy: number,
    gesture?: string,
  ) => {
    if (layerIds.length === 0 || (dx === 0 && dy === 0)) return
    withLayout((current) => ({
      ...current,
      layers: current.layers.map((layer) => (
        layerIds.includes(layer.id)
          ? normalizeLayer({
            ...layer,
            position: { x: layer.position.x + dx, y: layer.position.y + dy },
          })
          : layer
      )),
    }), gesture)
  }, [withLayout])

  /**
   * @param overrides 기본값 위에 덮어쓸 값.
   *   이미지 레이어는 가리킬 그림이 정해져야 화면에 나타나므로, 올린 파일 주소를 여기로 받는다.
   */
  const addLayer = useCallback((
    type: PhotoCardLayer['type'],
    overrides: Partial<PhotoCardLayer> = {},
  ) => {
    if (docRef.current.layout.layers.length >= PHOTO_CARD_MAX_LAYERS) return
    const layer = normalizeLayer({
      id: createLayerId(),
      type,
      position: { x: 0.5, y: 0.9 },
      visible: true,
      ...(type === 'TEXT' ? { binding: 'NONE' as const, text: '', fontSizeRatio: 0.032, color: '#111111' } : {}),
      ...(type === 'IMAGE' ? { source: 'PRODUCER_LOGO' as const, widthRatio: 0.12 } : {}),
      ...(type === 'DIVIDER' ? { widthRatio: 0.8, thicknessRatio: 0.002, fill: '#dddddd' } : {}),
      ...(type === 'BOX' ? { widthRatio: 0.5, heightRatio: 0.18, radius: 0.01, fill: '#00000080', opacity: 1 } : {}),
      ...overrides,
    })
    withLayout((current) => ({ ...current, layers: [...current.layers, layer] }))
    setSelectedLayerIds([layer.id])
  }, [withLayout])

  /**
   * EXIF·주류 값을 카드에 바로 얹는다 (목록의 ＋ 버튼).
   * 새 요소는 카드 아래쪽부터 한 줄씩 내려 쌓아 서로 겹치지 않게 한다.
   */
  const addBoundText = useCallback((binding: PhotoCardBinding) => {
    const current = docRef.current.layout
    if (current.layers.length >= PHOTO_CARD_MAX_LAYERS) return
    // 같은 값을 두 번 얹지 않는다 — 이미 있으면 그 요소를 고르기만 한다.
    const existing = current.layers.find(
      (layer) => layer.type === 'TEXT' && layer.binding === binding && !layer.overridden,
    )
    if (existing) {
      setSelectedLayerIds([existing.id])
      return
    }
    const textCount = current.layers.filter((layer) => layer.type === 'TEXT').length
    const layer = normalizeLayer({
      id: createLayerId(),
      type: 'TEXT',
      position: { x: 0.5, y: Math.min(0.96, 0.86 + (textCount % 4) * 0.035) },
      visible: true,
      binding,
      overridden: false,
      text: '',
      fontKey: 'pretendardMedium',
      fontSizeRatio: 0.026,
      color: '#555555',
    })
    withLayout((layoutNow) => ({ ...layoutNow, layers: [...layoutNow.layers, layer] }))
    setSelectedLayerIds([layer.id])
  }, [withLayout])

  /** 아이콘 버튼 — 카드 중앙 아래쪽에 얹는다. */
  const addIcon = useCallback((iconKey: string) => {
    const current = docRef.current.layout
    if (current.layers.length >= PHOTO_CARD_MAX_LAYERS) return
    const iconCount = current.layers.filter((layer) => layer.type === 'ICON').length
    const layer = normalizeLayer({
      id: createLayerId(),
      type: 'ICON',
      position: { x: Math.min(0.94, 0.5 + iconCount * 0.08), y: 0.9 },
      visible: true,
      iconKey,
      widthRatio: 0.06,
      fill: '#111111',
      opacity: 1,
    })
    withLayout((layoutNow) => ({ ...layoutNow, layers: [...layoutNow.layers, layer] }))
    setSelectedLayerIds([layer.id])
  }, [withLayout])

  const duplicateLayer = useCallback((layerId: string) => {
    const source = docRef.current.layout.layers.find((layer) => layer.id === layerId)
    if (!source || docRef.current.layout.layers.length >= PHOTO_CARD_MAX_LAYERS) return
    // 원본 위에 정확히 겹쳐 두면 복제됐는지 알 수 없다. 살짝 밀어 둔다.
    const copy = normalizeLayer({
      ...JSON.parse(JSON.stringify(source)) as PhotoCardLayer,
      id: createLayerId(),
      position: { x: source.position.x + 0.02, y: source.position.y + 0.02 },
    })
    withLayout((current) => ({ ...current, layers: [...current.layers, copy] }))
    setSelectedLayerIds([copy.id])
  }, [withLayout])

  const copyLayers = useCallback((layerIds: string[]) => {
    if (layerIds.length === 0) return false
    const ids = new Set(layerIds)
    const copies = docRef.current.layout.layers
      .filter((layer) => ids.has(layer.id))
      .map((layer) => JSON.parse(JSON.stringify(layer)) as PhotoCardLayer)
    if (copies.length === 0) return false
    layerClipboardRef.current = copies
    return true
  }, [])

  const pasteLayers = useCallback(() => {
    const sources = layerClipboardRef.current
    const current = docRef.current.layout
    if (sources.length === 0 || current.layers.length + sources.length > PHOTO_CARD_MAX_LAYERS) return false

    // 붙여넣은 요소를 다시 버퍼 기준으로 삼아 연속 Ctrl+V 때마다 조금씩 어긋나게 보이도록 한다.
    const copies = sources.map((source) => normalizeLayer({
      ...JSON.parse(JSON.stringify(source)) as PhotoCardLayer,
      id: createLayerId(),
      position: { x: source.position.x + 0.02, y: source.position.y + 0.02 },
    }))
    withLayout((layoutNow) => ({ ...layoutNow, layers: [...layoutNow.layers, ...copies] }))
    layerClipboardRef.current = copies.map(
      (layer) => JSON.parse(JSON.stringify(layer)) as PhotoCardLayer,
    )
    setSelectedLayerIds(copies.map((layer) => layer.id))
    return true
  }, [withLayout])

  const removeLayers = useCallback((layerIds: string[]) => {
    if (layerIds.length === 0) return
    withLayout((current) => ({
      ...current,
      layers: current.layers.filter((layer) => !layerIds.includes(layer.id)),
    }))
    setSelectedLayerIds((current) => current.filter((id) => !layerIds.includes(id)))
  }, [withLayout])

  const removeLayer = useCallback((layerId: string) => removeLayers([layerId]), [removeLayers])

  /** 배열 순서가 곧 겹침 순서다 — 뒤에 있을수록 위에 그려진다. */
  const reorderLayer = useCallback((layerId: string, to: 'up' | 'down' | 'front' | 'back') => {
    withLayout((current) => {
      const index = current.layers.findIndex((layer) => layer.id === layerId)
      if (index < 0) return current
      const target = to === 'up' ? index + 1
        : to === 'down' ? index - 1
          : to === 'front' ? current.layers.length - 1 : 0
      if (target === index || target < 0 || target >= current.layers.length) return current
      const layers = current.layers.slice()
      const [moved] = layers.splice(index, 1)
      layers.splice(target, 0, moved)
      return { ...current, layers }
    })
  }, [withLayout])

  // ── 프레임 ──────────────────────────────────────────────
  const patchFrame = useCallback((
    patch: Partial<PhotoCardLayout['frame']>,
    gesture?: string,
  ) => {
    withLayout((current) => ({ ...current, frame: { ...current.frame, ...patch } }), gesture)
  }, [withLayout])

  const setFrameRadius = useCallback((radius: number) => {
    patchFrame({ radius }, 'frame:radius')
  }, [patchFrame])

  const setBackgroundColor = useCallback((backgroundColor: string) => {
    patchFrame({ backgroundColor }, 'frame:background')
  }, [patchFrame])

  /**
   * 카드 비율 변경.
   *
   * 요소도 같이 옮긴다 — 좌표는 프레임 대비 비율이라 그대로 두면 밴드에 앉아 있던 글이
   * 사진 위로 올라가거나(세로로 긴 비율) 줄끼리 겹친다(정사각·가로 비율).
   */
  const changeRatio = useCallback((ratio: PhotoCardRatio) => {
    withLayout((current) => {
      if (current.frame.ratio === ratio) return current
      const frame = { ...current.frame, ratio }
      return { ...current, frame, layers: reflowLayersForFrame(current, frame) }
    })
  }, [withLayout])

  /** 사진 여백 — 이 값이 곧 사진 아래 정보 밴드의 높이가 된다. */
  const setFramePadding = useCallback((patch: Partial<PhotoCardPadding>, gesture?: string) => {
    withLayout((current) => ({
      ...current,
      frame: { ...current.frame, padding: { ...current.frame.padding, ...patch } },
    }), gesture ?? 'frame:padding')
  }, [withLayout])

  /**
   * 카드 확장 — 비율 프리셋 바깥으로 각 변을 넓힌다(짧은 변 대비 비율).
   *
   * 늘어난 자리는 배경색이 되고 사진·글자 크기는 그대로다. 캔버스가 커지면 요소 좌표가
   * 가리키는 자리가 달라지므로, 늘린 만큼 좌표를 다시 계산해 맞춰 둔 자리를 지킨다.
   */
  const setFrameExtend = useCallback((patch: Partial<PhotoCardPadding>, gesture?: string) => {
    withLayout((current) => {
      const before: PhotoCardPadding = {
        top: 0, right: 0, bottom: 0, left: 0, ...current.frame.extend,
      }
      const after: PhotoCardPadding = { ...before, ...patch }
      if ((['top', 'right', 'bottom', 'left'] as const).every((side) => after[side] === before[side])) {
        return current
      }
      const frame = { ...current.frame, extend: after }
      return { ...current, frame, layers: reanchorLayersForExtend(current, frame) }
    }, gesture ?? 'frame:extend')
  }, [withLayout])

  const patchPhoto = useCallback((
    patch: Partial<PhotoCardLayout['frame']['photo']>,
    gesture?: string,
  ) => {
    withLayout((current) => ({
      ...current,
      frame: { ...current.frame, photo: { ...current.frame.photo, ...patch } },
    }), gesture)
  }, [withLayout])

  const setPhotoRadius = useCallback((radius: number) => {
    patchPhoto({ radius }, 'photo:radius')
  }, [patchPhoto])

  const setPhotoFit = useCallback((fit: PhotoCardPhotoFit) => {
    patchPhoto({ fit })
  }, [patchPhoto])

  /**
   * 사진 비율에 맞춰 액자를 다시 잡는다 — 위·좌·우 여백을 없애고 남는 자리를 아래 밴드로 몬다.
   *
   * '전체 보기'는 사진을 다 보여 주는 대신 액자와 비율이 다르면 사방에 빈 띠가 생긴다.
   * 여백 슬라이더로는 이 띠를 없앨 수 없다 — 띠는 여백이 아니라 <b>액자와 사진의 비율 차이</b>라서다.
   * 액자 자체를 사진 비율로 맞춰야 사라진다.
   */
  const fitPhotoArea = useCallback(() => {
    const image = photoImage
    if (!image || image.naturalWidth === 0 || image.naturalHeight === 0) return
    const aspect = image.naturalWidth / image.naturalHeight

    commit((current) => {
      // 가로는 언제나 꽉 채운다 — 좌우 여백을 없애는 것이 이 기능의 목적이다.
      // 카드 확장은 빼고 잰다 — 여백·사진 값은 전부 기준 프레임 기준이고,
      // 늘려 둔 바깥 여백은 사진 액자와 아무 상관이 없다(그대로 유지된다).
      let ratio = current.layout.frame.ratio
      let size = frameSizeOf({ ratio }, PHOTO_CARD_MAX_EDGE)
      let height = size.width / aspect

      // 지금 카드가 사진보다 낮으면 가로를 꽉 채울 수 없다(사진이 카드 밖으로 나간다).
      // 사진보다 홀쭉한 비율 중 가장 가까운 것으로 카드를 바꿔 준다 — 밑에 밴드 자리도 이때 생긴다.
      if (height > size.height) {
        const taller = PHOTO_CARD_RATIOS
          .filter((option) => ratioValue(option.value) <= aspect)
          .sort((a, b) => ratioValue(b.value) - ratioValue(a.value))[0]
        if (taller) {
          ratio = taller.value
          size = frameSizeOf({ ratio }, PHOTO_CARD_MAX_EDGE)
          height = size.width / aspect
        }
      }

      // 16:9 보다도 세로로 긴 사진은 어느 비율에도 가로를 꽉 채워 담을 수 없다.
      // 이때만 높이에 맞추고 좌우 여백을 받아들인다(자르지 않는 것이 '전체 보기'다).
      let width = size.width
      if (height > size.height) {
        height = size.height
        width = height * aspect
      }

      // 사진을 얹고 남은 세로 공간이 곧 아래 정보 밴드다.
      const shortSide = shortSideOf(size)
      const bottom = Math.max(0, Math.min(0.5, (size.height - height) / shortSide))
      const innerHeight = size.height - bottom * shortSide
      if (innerHeight <= 0) return current

      const frame = {
        ...current.layout.frame,
        ratio,
        padding: { top: 0, right: 0, bottom, left: 0 },
        photo: {
          ...current.layout.frame.photo,
          fit: 'CONTAIN' as const,
          w: Math.min(1, width / size.width),
          h: Math.min(1, height / innerHeight),
          x: 0.5,
          // 위에 붙인다 — 남는 세로 공간이 아래로 모이게.
          y: Math.min(1, height / 2 / innerHeight),
        },
      }
      return {
        ...current,
        layout: {
          ...current.layout,
          frame,
          // 액자가 통째로 바뀌었다. 요소도 새 사진 자리에 맞춰 따라와야 밴드 글이 사진 위에 남지 않는다.
          layers: reflowLayersForFrame(current.layout, frame),
        },
      }
    })
  }, [commit, photoImage])

  // ── 주류 ────────────────────────────────────────────────
  /**
   * 검색으로 고른 주류를 카드에 얹는다.
   *
   * 손으로 적어 둔 주류 글자(overridden)는 이때 풀어 준다 — 검색으로 고르는 것은
   * "이 주류로 하겠다"는 뜻인데, 적어 둔 글이 그대로 남으면 방금 고른 이름이 칸에도 카드에도
   * 나타나지 않아 검색이 먹지 않은 것처럼 보인다. 지난 주류를 보고 고쳐 둔 도수·용량이
   * 새 주류 이름 옆에 그대로 남는 것도 막는다.
   * (직접 적어 둔 값으로 되돌리려면 고른 뒤 다시 적으면 된다 — 그 편집이 다시 overridden 이 된다)
   */
  const pickSpirit = useCallback((info: PhotoCardSpiritInfo) => {
    if (spirit?.spiritId !== info.spiritId) setReview(null)
    setSpirit(info)
    withLayout((current) => (
      current.layers.some(isOverriddenSpiritText)
        ? {
          ...current,
          layers: current.layers.map((layer) => (
            isOverriddenSpiritText(layer) ? { ...layer, overridden: false } : layer
          )),
        }
        : current
    ))
  }, [spirit?.spiritId, withLayout])

  /**
   * 템플릿 적용.
   *
   * 템플릿마다 쓰는 항목이 달라서(장소는 어느 기본 템플릿에도 자리가 없고, 메모는 폴라로이드에만 있다)
   * 레이어를 통째로 갈아 끼우면 **사용자가 적어 둔 글이 조용히 사라진다.**
   * 새 템플릿에 자리가 없는 직접 입력값은 아래쪽에 이어 붙여, 바꿔도 쓴 내용이 남게 한다.
   * 글꼴·색은 새 템플릿의 보조 텍스트에서 물려받는다 — 어두운 템플릿에서 검은 글씨가 묻히지 않게.
   */
  const applyLayout = useCallback((next: PhotoCardLayout) => {
    const incoming = JSON.parse(JSON.stringify(next)) as PhotoCardLayout
    const missing = USER_BINDINGS.filter((binding) => {
      if (!resolveBindingValue(binding, dataContext).trim()) return false
      return !incoming.layers.some(
        (layer) => layer.type === 'TEXT' && layer.binding === binding && layer.visible !== false,
      )
    })

    if (missing.length > 0) {
      placeCarriedLayers(incoming, missing)
    }

    withLayout(() => incoming)
    setSelectedLayerIds([])
    setLockedIds(new Set())
  }, [dataContext, withLayout])

  /**
   * 임시저장해 둔 작업을 그대로 되살린다(비회원 → 로그인 후 복귀).
   *
   * applyLayout 과 달리 <b>손대지 않고</b> 얹는다 — 저장한 그 순간의 배치가 정답이라,
   * 자동 채움이나 이월 규칙이 끼어들면 사용자가 맞춰 둔 자리가 달라진다.
   * 되돌리기 기록은 여기서 새로 시작한다(복원 자체를 Ctrl+Z 로 취소할 일은 없다).
   *
   * @returns 사진을 다시 열지 못하면 false — 그때는 임시저장을 지우지 말아야 한다.
   */
  const restoreDraft = useCallback(async (draft: PhotoCardDraft): Promise<boolean> => {
    if (draft.photo) {
      const file = draft.photo instanceof File
        ? draft.photo
        : new File([draft.photo], draft.photoName ?? 'photo.jpg', { type: draft.photo.type })
      // 촬영 정보는 임시저장에 담아 뒀다 — 다시 읽으면 보정본에서 사라진 값까지 날아간다.
      const ok = await setPhoto(file, true)
      if (!ok) return false
    }
    setExif(draft.exif)
    setSpirit(draft.spirit)
    setReview(draft.review ?? null)
    setUserInput(draft.user)
    pastRef.current = []
    futureRef.current = []
    gestureRef.current = null
    applyDoc({
      layout: normalizeLayout(draft.layout),
      photoTransform: { ...IDENTITY_PHOTO_TRANSFORM, ...draft.photoTransform },
    })
    syncHistory()
    setSelectedLayerIds([])
    setLockedIds(new Set())
    return true
  }, [applyDoc, setPhoto, syncHistory])

  // ── 출력 ────────────────────────────────────────────────
  /**
   * 원본 사진이 1:1 픽셀로 들어가는 프레임 긴 변(px).
   * <p>이보다 크게 뽑으면 사진을 늘려 흐려지고, 작게 뽑으면 원본 화질을 버린다.
   * 사진 영역이 프레임에서 차지하는 비율은 레이아웃 여백에 따라 달라지므로 실제로 계산한다.
   */
  const nativeMaxEdge = useMemo(() => {
    if (!photoImage) return PHOTO_CARD_MAX_EDGE
    const probe = frameSizeOf(layout.frame, 1000)
    const rect = photoRectOf(layout, probe)
    if (rect.width <= 0 || rect.height <= 0) return PHOTO_CARD_MAX_EDGE
    const longEdge = Math.max(probe.width, probe.height)
    // 확대하면 사진이 그만큼 크게 그려지므로, 원본 화질을 지키는 데 필요한 프레임은 오히려 작아진다.
    const needed = Math.max(
      (photoImage.naturalWidth / rect.width) * longEdge,
      (photoImage.naturalHeight / rect.height) * longEdge,
    ) / Math.max(photoTransform.scale, 1)
    // 상한 — 모바일에서 이보다 큰 캔버스를 toBlob 하면 메모리 부족으로 탭이 죽는다.
    return Math.round(Math.min(Math.max(needed, 640), PHOTO_CARD_NATIVE_MAX_EDGE))
  }, [layout, photoImage, photoTransform.scale])

  /**
   * 미리보기와 같은 코드로 최종 이미지를 만든다.
   * @param format image/png 는 무손실이라 글자 경계가 깨지지 않지만 용량이 크다.
   * @param quality JPEG 품질(0~1). 기본은 최고 품질 — 사진 위 글자에 링잉이 생기지 않게.
   * @param maxEdge 출력 긴 변(px). 생략하면 원본 화질이 유지되는 크기.
   */
  const renderToBlob = useCallback(async (
    format: 'image/jpeg' | 'image/png' = 'image/jpeg',
    quality = 1,
    maxEdge?: number,
    watermark = false,
  ): Promise<Blob | null> => {
    if (!photoImage) return null
    const size = frameSizeOf(layout.frame, maxEdge ?? nativeMaxEdge)
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    // 글꼴이 아직 안 붙은 상태로 그리면 결과만 폴백 글꼴이 된다.
    await ensureEditorFontCssLoaded()
    if (typeof document !== 'undefined' && document.fonts) {
      try { await document.fonts.ready } catch { /* 구형 브라우저는 그대로 진행 */ }
    }
    // 카드 모서리를 둥글게 깎으면 잘린 바깥은 투명하게 남는다. PNG 는 그대로가 맞지만
    // JPEG 는 투명을 담지 못해 그 자리가 검게 나온다 — 배경색으로 먼저 칠해 두면 카드 색이 이어진다.
    if (format === 'image/jpeg') {
      ctx.fillStyle = layout.frame.backgroundColor ?? '#ffffff'
      ctx.fillRect(0, 0, size.width, size.height)
    }
    drawPhotoCard(ctx, size, layout, dataContext, photoImage, images, photoTransform)
    // 비회원 저장본에만 얹는다. 마크를 못 받아 왔다고 저장 자체를 막지는 않는다.
    if (watermark) {
      const mark = await loadWatermark()
      if (mark) drawWatermark(ctx, size, mark)
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (result) => resolve(result),
        format,
        format === 'image/jpeg' ? quality : undefined,
      )
    })
    if (!blob) return null

    // Canvas 출력에는 메타데이터가 하나도 없다. 어디서 만든 이미지인지 남긴다 —
    // 윈도우 탐색기의 '태그', 사진 관리 프로그램의 키워드 검색에 잡힌다.
    const keywords = [CASKBYCASK_TAG]
    if (spirit?.nameKo) keywords.push(spirit.nameKo)
    if (spirit?.producerNameKo) keywords.push(spirit.producerNameKo)
    return withImageMetadata(blob, {
      keywords,
      creatorTool: CASKBYCASK_TAG,
      description: spirit?.nameKo || undefined,
    })
  }, [dataContext, images, layout, nativeMaxEdge, photoImage, photoTransform, spirit])

  return {
    layout, applyLayout, changeRatio, restoreDraft,
    selectedLayer, selectedLayers, selectedLayerIds, selectLayer, selectAll,
    lockedIds, toggleLock,
    patchLayer, moveLayersTo, nudgeLayers,
    addLayer, addBoundText, addIcon, duplicateLayer, copyLayers, pasteLayers,
    removeLayer, removeLayers, reorderLayer,
    setFrameRadius, setPhotoRadius, setFramePadding, setFrameExtend,
    setBackgroundColor, setPhotoFit, patchPhoto,
    fitPhotoArea,
    photoFile, photoUrl, photoImage, setPhoto,
    photoTransform, patchPhotoTransform, resetPhotoTransform,
    exif, setExif, spirit, setSpirit, pickSpirit, review, setReview, userInput, setUserInput,
    dataContext, images, fontsReady, renderToBlob, nativeMaxEdge, watermarkImage,
    undo, redo, canUndo: history.canUndo, canRedo: history.canRedo, endGesture,
  }
}

export type PhotoCardEditor = ReturnType<typeof usePhotoCardEditor>
