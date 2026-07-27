import { Fragment, useState, useEffect, useRef } from 'react'
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react'
import { useTranslation } from 'react-i18next'

interface ImageEditorModalProps {
  open: boolean
  onClose: () => void
  imageSrc: string
  onSave: (editedFile: File) => Promise<void>
  isSaving: boolean
  fixedRatio?: string
  initialCropRatio?: string
  initialMode?: EditMode
  outputSize?: {
    width: number
    height: number
  }
  fitOutputSize?: {
    width: number
    height: number
  }
  recommendedResolution?: string
  showInstagramCropPreset?: boolean
}

type EditMode = 'paint' | 'crop' | 'rotate' | 'resize'
type PaintType = 'mosaic' | 'blur'

interface CropBox {
  x: number // 0 ~ 1
  y: number // 0 ~ 1
  w: number // 0 ~ 1
  h: number // 0 ~ 1
}

interface CropRatioOption {
  label: string
  value: string
  instagram?: boolean
}

export default function ImageEditorModal({
  open,
  onClose,
  imageSrc,
  onSave,
  isSaving,
  fixedRatio,
  initialCropRatio,
  initialMode = 'paint',
  outputSize,
  fitOutputSize,
  recommendedResolution,
  showInstagramCropPreset = false,
}: ImageEditorModalProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<EditMode>('paint')
  const [paintType, setPaintType] = useState<PaintType>('mosaic')
  const [brushSize, setBrushSize] = useState<number>(30)

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mosaicCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'))
  const blurCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'))
  const containerRef = useRef<HTMLDivElement>(null)

  // Drawing state
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })

  // History state
  const [history, setHistory] = useState<ImageData[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)

  // Crop Box state
  const [cropBox, setCropBox] = useState<CropBox>({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 })
  // Crop Ratio state
  const [cropRatio, setCropRatio] = useState<string>('free')
  const [customRatioW, setCustomRatioW] = useState<string>('1')
  const [customRatioH, setCustomRatioH] = useState<string>('1')

  // Rotation / Tilt state
  const tiltBaseCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const [tiltAngle, setTiltAngle] = useState<number>(0)

  // Resize resolution state
  const [resizeW, setResizeW] = useState<string>('')
  const [resizeH, setResizeH] = useState<string>('')
  const [keepAspectRatio, setKeepAspectRatio] = useState<boolean>(true)

  const getRatioVal = (ratioStr: string): number | null => {
    if (ratioStr === 'free') return null
    if (ratioStr === 'custom') {
      const w = parseFloat(customRatioW)
      const h = parseFloat(customRatioH)
      if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return null
      return w / h
    }
    const parts = ratioStr.split(':')
    const rWidth = parseFloat(parts[0])
    const rHeight = parseFloat(parts[1])
    if (isNaN(rWidth) || isNaN(rHeight)) return null
    return rWidth / rHeight
  }

  const getInitialCropBoxForRatio = (ratioStr: string, customW?: string, customH?: string): CropBox => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0.1, y: 0.1, w: 0.8, h: 0.8 }

    if (ratioStr === 'free') {
      return { x: 0.1, y: 0.1, w: 0.8, h: 0.8 }
    }

    let ratioVal: number | null = null
    if (ratioStr === 'custom') {
      const w = parseFloat(customW ?? customRatioW)
      const h = parseFloat(customH ?? customRatioH)
      if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
        ratioVal = w / h
      }
    } else {
      ratioVal = getRatioVal(ratioStr)
    }

    if (!ratioVal) return { x: 0.1, y: 0.1, w: 0.8, h: 0.8 }

    const R = ratioVal
    const A_canvas = canvas.width / canvas.height

    if (R >= A_canvas) {
      const w = 0.8
      const h = (w * A_canvas) / R
      return {
        x: (1 - w) / 2,
        y: (1 - h) / 2,
        w,
        h,
      }
    } else {
      const h = 0.8
      const w = (h * R) / A_canvas
      return {
        x: (1 - w) / 2,
        y: (1 - h) / 2,
        w,
        h,
      }
    }
  }

  // Canvas scale state for dynamic brush cursor size
  const [canvasScale, setCanvasScale] = useState<number>(1)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const updateScale = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width > 0 && canvas.width > 0) {
        setCanvasScale(rect.width / canvas.width)
      }
    }

    // Update on load
    updateScale()

    const observer = new ResizeObserver(() => {
      updateScale()
    })
    observer.observe(canvas)

    window.addEventListener('resize', updateScale)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateScale)
    }
  }, [historyIndex, mode, open])

  // Helper: push state to history
  const pushState = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    
    const nextHistory = history.slice(0, historyIndex + 1)
    nextHistory.push(imgData)
    setHistory(nextHistory)
    setHistoryIndex(nextHistory.length - 1)
  }

  // Pre-generate mosaic and blur canvases
  const regenerateEffects = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const w = canvas.width
    const h = canvas.height

    // 1. Mosaic Effect
    const mCanvas = mosaicCanvasRef.current
    mCanvas.width = w
    mCanvas.height = h
    const mCtx = mCanvas.getContext('2d')!

    const scale = 0.04 // Mosaic pixelation factor
    const sw = Math.max(1, Math.round(w * scale))
    const sh = Math.max(1, Math.round(h * scale))

    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = sw
    tempCanvas.height = sh
    const tCtx = tempCanvas.getContext('2d')!
    tCtx.drawImage(canvas, 0, 0, sw, sh)

    mCtx.imageSmoothingEnabled = false
    mCtx.drawImage(tempCanvas, 0, 0, sw, sh, 0, 0, w, h)

    // 2. Blur Effect
    const bCanvas = blurCanvasRef.current
    bCanvas.width = w
    bCanvas.height = h
    const bCtx = bCanvas.getContext('2d')!
    if ('filter' in (bCtx as any)) {
      (bCtx as any).filter = 'blur(16px)'
      bCtx.drawImage(canvas, 0, 0)
    } else {
      // Fallback: scale down and scale up with smoothing
      const bScale = 0.1
      const bw = Math.max(1, Math.round(w * bScale))
      const bh = Math.max(1, Math.round(h * bScale))
      const bTemp = document.createElement('canvas')
      bTemp.width = bw
      bTemp.height = bh
      const btCtx = bTemp.getContext('2d')!
      btCtx.imageSmoothingEnabled = true
      btCtx.drawImage(canvas, 0, 0, bw, bh)

      bCtx.imageSmoothingEnabled = true
      bCtx.drawImage(bTemp, 0, 0, bw, bh, 0, 0, w, h)
    }
  }

  // Load image on mount/src change
  useEffect(() => {
    if (!open || !imageSrc) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      ctx.drawImage(img, 0, 0)

      regenerateEffects()

      // Set initial history state
      const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      setHistory([initialData])
      setHistoryIndex(0)

      const startingRatio = fixedRatio ?? initialCropRatio
      if (startingRatio) {
        setCropBox(getInitialCropBoxForRatio(startingRatio))
      }
    }
    img.src = imageSrc
    setMode(initialMode)
    if (fixedRatio ?? initialCropRatio) {
      setCropRatio((fixedRatio ?? initialCropRatio)!)
    } else {
      setCropRatio('free')
    }
    setTiltAngle(0)
    tiltBaseCanvasRef.current = null
  }, [open, imageSrc, fixedRatio, initialCropRatio, initialMode])

  const handleCustomRatioChange = (w: string, h: string) => {
    setCustomRatioW(w)
    setCustomRatioH(h)
    setCropRatio('custom')
    setCropBox(getInitialCropBoxForRatio('custom', w, h))
  }

  const initTiltBase = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const baseCanvas = document.createElement('canvas')
    baseCanvas.width = canvas.width
    baseCanvas.height = canvas.height
    const baseCtx = baseCanvas.getContext('2d')
    if (baseCtx) {
      baseCtx.drawImage(canvas, 0, 0)
      tiltBaseCanvasRef.current = baseCanvas
    }
  }

  const applyTiltAngle = (angleDegrees: number) => {
    const canvas = canvasRef.current
    const baseCanvas = tiltBaseCanvasRef.current
    if (!canvas || !baseCanvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const angleRad = (angleDegrees * Math.PI) / 180
    const cos = Math.abs(Math.cos(angleRad))
    const sin = Math.abs(Math.sin(angleRad))
    const w = baseCanvas.width
    const h = baseCanvas.height
    const newWidth = Math.round(w * cos + h * sin)
    const newHeight = Math.round(w * sin + h * cos)

    canvas.width = newWidth
    canvas.height = newHeight

    ctx.clearRect(0, 0, newWidth, newHeight)
    ctx.save()
    ctx.translate(newWidth / 2, newHeight / 2)
    ctx.rotate(angleRad)
    ctx.drawImage(baseCanvas, -w / 2, -h / 2)
    ctx.restore()

    regenerateEffects()
  }

  const restorePreTilt = () => {
    const canvas = canvasRef.current
    const baseCanvas = tiltBaseCanvasRef.current
    if (canvas && baseCanvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        canvas.width = baseCanvas.width
        canvas.height = baseCanvas.height
        ctx.drawImage(baseCanvas, 0, 0)
        regenerateEffects()
      }
    }
  }

  const handleApplyTilt = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    setHistory((prev) => {
      const next = prev.slice(0, historyIndex + 1)
      next.push(imgData)
      return next
    })
    setHistoryIndex((prev) => prev + 1)

    initTiltBase()
    setTiltAngle(0)
  }

  const handleTiltSliderChange = (angle: number) => {
    setTiltAngle(angle)
    applyTiltAngle(angle)
  }

  const handleModeChange = (newMode: EditMode) => {
    if (mode === 'rotate' && tiltAngle !== 0) {
      restorePreTilt()
    }
    setMode(newMode)
  }

  // Manage rotation & tilt base canvas state
  useEffect(() => {
    if (mode === 'rotate') {
      initTiltBase()
      setTiltAngle(0)
    } else {
      tiltBaseCanvasRef.current = null
    }
  }, [mode])

  // Sync resize dimensions when canvas changes or mode changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      setResizeW(canvas.width.toString())
      setResizeH(canvas.height.toString())
    }
  }, [historyIndex, mode, open])

  const handleResizeWChange = (val: string) => {
    setResizeW(val)
    const canvas = canvasRef.current
    if (!canvas || !keepAspectRatio) return
    const w = parseFloat(val)
    if (isNaN(w) || w <= 0) return
    const ratio = canvas.width / canvas.height
    setResizeH(Math.round(w / ratio).toString())
  }

  const handleResizeHChange = (val: string) => {
    setResizeH(val)
    const canvas = canvasRef.current
    if (!canvas || !keepAspectRatio) return
    const h = parseFloat(val)
    if (isNaN(h) || h <= 0) return
    const ratio = canvas.width / canvas.height
    setResizeW(Math.round(h * ratio).toString())
  }

  const handleApplyResize = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const targetW = Math.round(parseFloat(resizeW))
    const targetH = Math.round(parseFloat(resizeH))

    if (isNaN(targetW) || isNaN(targetH) || targetW <= 0 || targetH <= 0) return

    pushState()

    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = targetW
    tempCanvas.height = targetH
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.imageSmoothingEnabled = true
    tempCtx.imageSmoothingQuality = 'high'
    tempCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, targetW, targetH)

    canvas.width = targetW
    canvas.height = targetH
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(tempCanvas, 0, 0)

    regenerateEffects()

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    setHistory((prev) => {
      const next = [...prev]
      next[historyIndex + 1] = imgData
      return next
    })
    setHistoryIndex((prev) => prev + 1)
  }

  // Canvas drawing event handlers (Unified touch/mouse)
  const getCanvasCoords = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = (clientX - rect.left) * (canvas.width / rect.width)
    const y = (clientY - rect.top) * (canvas.height / rect.height)
    return { x, y }
  }

  const startDrawing = (clientX: number, clientY: number) => {
    if (mode !== 'paint') return
    const coords = getCanvasCoords(clientX, clientY)
    if (!coords) return

    pushState() // Save history before drawing
    isDrawingRef.current = true
    lastPosRef.current = coords

    // Draw single dot on click/tap
    drawDot(coords.x, coords.y)
  }

  const drawDot = (x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const effectCanvas = paintType === 'mosaic' ? mosaicCanvasRef.current : blurCanvasRef.current
    const pattern = ctx.createPattern(effectCanvas, 'no-repeat')
    if (pattern) {
      ctx.save()
      ctx.fillStyle = pattern
      ctx.beginPath()
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  }

  const drawStroke = (x: number, y: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const effectCanvas = paintType === 'mosaic' ? mosaicCanvasRef.current : blurCanvasRef.current
    const pattern = ctx.createPattern(effectCanvas, 'no-repeat')
    if (pattern) {
      ctx.save()
      ctx.strokeStyle = pattern
      ctx.lineWidth = brushSize
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
      ctx.lineTo(x, y)
      ctx.stroke()
      ctx.restore()
    }

    lastPosRef.current = { x, y }
  }

  const handleDrawingMove = (clientX: number, clientY: number) => {
    if (!isDrawingRef.current) return
    const coords = getCanvasCoords(clientX, clientY)
    if (!coords) return
    drawStroke(coords.x, coords.y)
  }

  const endDrawing = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false
      // Push the finished stroke to history and update effects
      regenerateEffects()
      // Overwrite the current history state with the updated canvas
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')!
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        setHistory((prev) => {
          const next = [...prev]
          next[historyIndex] = imgData
          return next
        })
      }
    }
  }

  // Rotation: 90 degrees clockwise
  const handleRotate = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    pushState()

    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = canvas.height
    tempCanvas.height = canvas.width
    const tempCtx = tempCanvas.getContext('2d')!

    tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2)
    tempCtx.rotate((90 * Math.PI) / 180)
    tempCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2)

    canvas.width = tempCanvas.width
    canvas.height = tempCanvas.height
    ctx.drawImage(tempCanvas, 0, 0)

    regenerateEffects()

    // Overwrite the updated rotation back into history
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    setHistory((prev) => {
      const next = [...prev]
      next[historyIndex + 1] = imgData
      return next
    })
    setHistoryIndex((prev) => prev + 1)

    // If we're in rotate mode, re-init the tilt base and angle!
    if (mode === 'rotate') {
      initTiltBase()
      setTiltAngle(0)
    }
  }

  // Apply Crop
  const handleApplyCrop = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    pushState()

    const cropX = Math.round(cropBox.x * canvas.width)
    const cropY = Math.round(cropBox.y * canvas.height)
    const cropW = Math.round(cropBox.w * canvas.width)
    const cropH = Math.round(cropBox.h * canvas.height)

    if (cropW <= 10 || cropH <= 10) return // Avoid zero/tiny crops

    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = cropW
    tempCanvas.height = cropH
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)

    canvas.width = cropW
    canvas.height = cropH
    ctx.drawImage(tempCanvas, 0, 0)

    regenerateEffects()

    // Overwrite crop state back into history
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    setHistory((prev) => {
      const next = [...prev]
      next[historyIndex + 1] = imgData
      return next
    })
    setHistoryIndex((prev) => prev + 1)

    // Reset crop box
    setCropRatio('free')
    setCropBox({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 })
    setMode('paint')
  }

  // Undo/Redo logic
  const handleUndo = () => {
    if (historyIndex <= 0) return
    const prevIndex = historyIndex - 1
    setHistoryIndex(prevIndex)
    restoreHistoryState(prevIndex)
  }

  const handleRedo = () => {
    if (historyIndex >= history.length - 1) return
    const nextIndex = historyIndex + 1
    setHistoryIndex(nextIndex)
    restoreHistoryState(nextIndex)
  }

  const restoreHistoryState = (index: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const imgData = history[index]
    if (!imgData) return

    canvas.width = imgData.width
    canvas.height = imgData.height
    ctx.putImageData(imgData, 0, 0)

    regenerateEffects()
  }

  // Crop Dragging handlers (Unified mouse/touch)
  const handleCropBoxDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    const startX = clientX
    const startY = clientY
    const startBox = { ...cropBox }

    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY

      const dx = (currentX - startX) / rect.width
      const dy = (currentY - startY) / rect.height

      let nextX = startBox.x + dx
      let nextY = startBox.y + dy

      nextX = Math.max(0, Math.min(1 - startBox.w, nextX))
      nextY = Math.max(0, Math.min(1 - startBox.h, nextY))

      setCropBox((prev) => ({ ...prev, x: nextX, y: nextY }))
    }

    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onUp)
  }

  const handleHandleDragStart = (e: React.MouseEvent | React.TouchEvent, handle: string) => {
    e.preventDefault()
    e.stopPropagation()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    const startX = clientX
    const startY = clientY
    const startBox = { ...cropBox }

    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY

      const dx = (currentX - startX) / rect.width
      const dy = (currentY - startY) / rect.height

      let x = startBox.x
      let y = startBox.y
      let w = startBox.w
      let h = startBox.h

      const minSize = 0.08

      const canvas = canvasRef.current
      const ratioVal = getRatioVal(cropRatio)

      if (canvas && ratioVal !== null) {
        const A_canvas = canvas.width / canvas.height
        const r_rel = ratioVal / A_canvas
        if (handle === 'e' || handle === 's' || handle === 'se') {
          let dw = 0
          if (handle === 'e') {
            dw = dx
          } else if (handle === 's') {
            dw = dy * r_rel
          } else {
            dw = Math.abs(dx) > Math.abs(dy * r_rel) ? dx : dy * r_rel
          }
          const maxW = Math.min(1 - startBox.x, (1 - startBox.y) * r_rel)
          w = Math.max(minSize, Math.min(maxW, startBox.w + dw))
          h = w / r_rel
        } else if (handle === 'w' || handle === 'n' || handle === 'nw') {
          let dw = 0
          if (handle === 'w') {
            dw = -dx
          } else if (handle === 'n') {
            dw = -dy * r_rel
          } else {
            dw = Math.abs(dx) > Math.abs(dy * r_rel) ? -dx : -dy * r_rel
          }
          const right = startBox.x + startBox.w
          const bottom = startBox.y + startBox.h
          const maxW = Math.min(right, bottom * r_rel)
          w = Math.max(minSize, Math.min(maxW, startBox.w + dw))
          h = w / r_rel
          x = right - w
          y = bottom - h
        } else if (handle === 'ne') {
          const dw = Math.abs(dx) > Math.abs(dy * r_rel) ? dx : -dy * r_rel
          const bottom = startBox.y + startBox.h
          const maxW = Math.min(1 - startBox.x, bottom * r_rel)
          w = Math.max(minSize, Math.min(maxW, startBox.w + dw))
          h = w / r_rel
          y = bottom - h
        } else if (handle === 'sw') {
          const dw = Math.abs(dx) > Math.abs(dy * r_rel) ? -dx : dy * r_rel
          const right = startBox.x + startBox.w
          const maxW = Math.min(right, (1 - startBox.y) * r_rel)
          w = Math.max(minSize, Math.min(maxW, startBox.w + dw))
          h = w / r_rel
          x = right - w
        }
      } else {
        if (handle.includes('e')) {
          w = Math.max(minSize, Math.min(1 - x, startBox.w + dx))
        }
        if (handle.includes('w')) {
          const newX = Math.max(0, Math.min(startBox.x + startBox.w - minSize, startBox.x + dx))
          w = startBox.w + (startBox.x - newX)
          x = newX
        }
        if (handle.includes('s')) {
          h = Math.max(minSize, Math.min(1 - y, startBox.h + dy))
        }
        if (handle.includes('n')) {
          const newY = Math.max(0, Math.min(startBox.y + startBox.h - minSize, startBox.y + dy))
          h = startBox.h + (startBox.y - newY)
          y = newY
        }
      }

      setCropBox({ x, y, w, h })
    }

    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onUp)
  }

  // Dynamic cursor style representing current brush size
  const getCursorStyle = () => {
    if (mode !== 'paint') return 'default'
    const visualSize = Math.max(10, Math.round(brushSize * canvasScale))
    if (visualSize > 120) {
      return 'crosshair'
    }
    const half = visualSize / 2
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${visualSize}" height="${visualSize}" viewBox="0 0 ${visualSize} ${visualSize}"><circle cx="${half}" cy="${half}" r="${half - 1.5}" fill="rgba(255, 255, 255, 0.2)" stroke="white" stroke-width="1"/><circle cx="${half}" cy="${half}" r="${half - 0.5}" fill="none" stroke="black" stroke-width="0.75"/></svg>`
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}") ${half} ${half}, crosshair`
  }

  // Handle Save
  const handleSaveClick = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    let outputCanvas = canvas

    if (outputSize) {
      const targetRatio = outputSize.width / outputSize.height
      const sourceRatio = canvas.width / canvas.height
      let sourceX = 0
      let sourceY = 0
      let sourceWidth = canvas.width
      let sourceHeight = canvas.height

      if (sourceRatio > targetRatio) {
        sourceWidth = canvas.height * targetRatio
        sourceX = (canvas.width - sourceWidth) / 2
      } else if (sourceRatio < targetRatio) {
        sourceHeight = canvas.width / targetRatio
        sourceY = (canvas.height - sourceHeight) / 2
      }

      outputCanvas = document.createElement('canvas')
      outputCanvas.width = outputSize.width
      outputCanvas.height = outputSize.height
      const outputContext = outputCanvas.getContext('2d')
      if (!outputContext) return

      outputContext.imageSmoothingEnabled = true
      outputContext.imageSmoothingQuality = 'high'
      outputContext.drawImage(
        canvas,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        outputSize.width,
        outputSize.height,
      )
    } else if (fitOutputSize) {
      const scale = Math.min(
        1,
        fitOutputSize.width / canvas.width,
        fitOutputSize.height / canvas.height,
      )
      if (scale < 1) {
        outputCanvas = document.createElement('canvas')
        outputCanvas.width = Math.max(1, Math.round(canvas.width * scale))
        outputCanvas.height = Math.max(1, Math.round(canvas.height * scale))
        const outputContext = outputCanvas.getContext('2d')
        if (!outputContext) return
        outputContext.imageSmoothingEnabled = true
        outputContext.imageSmoothingQuality = 'high'
        outputContext.drawImage(
          canvas,
          0,
          0,
          canvas.width,
          canvas.height,
          0,
          0,
          outputCanvas.width,
          outputCanvas.height,
        )
      }
    }

    outputCanvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], 'edited_image.png', { type: 'image/png' })
      onSave(file)
    }, 'image/png')
  }

  const cropRatioOptions: CropRatioOption[] = [
    { label: t('imageEditor.free'), value: 'free' },
    { label: '1:1', value: '1:1' },
    { label: '21:5', value: '21:5' },
    { label: '16:9', value: '16:9' },
    { label: '4:3', value: '4:3' },
    { label: '3:4', value: '3:4' },
    { label: '9:16', value: '9:16' },
    ...(showInstagramCropPreset
      ? [{ label: '4:5', value: '4:5', instagram: true }]
      : []),
    { label: t('imageEditor.custom'), value: 'custom' },
  ]

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => {}}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-neutral-950/90 backdrop-blur-[4px]" aria-hidden="true" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto flex items-center justify-center p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel className="w-full max-w-5xl bg-neutral-900 text-neutral-100 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh] md:h-[85vh]">
              
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur">
                <DialogTitle className="text-base font-semibold text-neutral-100">
                  {t('imageEditor.title')}
                </DialogTitle>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 disabled:opacity-30 transition-all duration-150"
                    title={t('imageEditor.undo')}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 disabled:opacity-30 transition-all duration-150"
                    title={t('imageEditor.redo')}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a8 8 0 00-8 8v2m18-8l-6 6m6-6l-6-6" />
                    </svg>
                  </button>
                  <div className="h-4 w-px bg-neutral-800 mx-1" />
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-all duration-150"
                    title={t('imageEditor.close')}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                
                {/* Left Sidebar Toolbar (for Desktop/Large screens) */}
                <div className="hidden md:flex flex-col gap-6 w-60 border-r border-neutral-800 p-6 bg-neutral-900/30">
                  <div className="space-y-4">
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{t('imageEditor.tools')}</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleModeChange('paint')}
                        className={`flex flex-col items-center justify-center py-3 rounded-xl border text-xs gap-1.5 transition-all duration-150 ${
                          mode === 'paint'
                            ? 'bg-primary-600 border-primary-500 text-white font-medium shadow-lg shadow-primary-900/20'
                            : 'bg-neutral-800/50 border-neutral-700 hover:bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        {t('imageEditor.brush')}
                      </button>
                      <button
                        onClick={() => handleModeChange('crop')}
                        className={`flex flex-col items-center justify-center py-3 rounded-xl border text-xs gap-1.5 transition-all duration-150 ${
                          mode === 'crop'
                            ? 'bg-primary-600 border-primary-500 text-white font-medium shadow-lg shadow-primary-900/20'
                            : 'bg-neutral-800/50 border-neutral-700 hover:bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v14a2 2 0 002 2h14M18 22V10a2 2 0 00-2-2H2" />
                        </svg>
                        {t('imageEditor.crop')}
                      </button>
                      <button
                        onClick={() => handleModeChange('rotate')}
                        className={`flex flex-col items-center justify-center py-3 rounded-xl border text-xs gap-1.5 transition-all duration-150 ${
                          mode === 'rotate'
                            ? 'bg-primary-600 border-primary-500 text-white font-medium shadow-lg shadow-primary-900/20'
                            : 'bg-neutral-800/50 border-neutral-700 hover:bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3" />
                        </svg>
                        {t('imageEditor.rotate')}
                      </button>
                      <button
                        onClick={() => handleModeChange('resize')}
                        className={`flex flex-col items-center justify-center py-3 rounded-xl border text-xs gap-1.5 transition-all duration-150 ${
                          mode === 'resize'
                            ? 'bg-primary-600 border-primary-500 text-white font-medium shadow-lg shadow-primary-900/20'
                            : 'bg-neutral-800/50 border-neutral-700 hover:bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                        </svg>
                        {t('imageEditor.resize')}
                      </button>
                    </div>
                  </div>

                  <div className="h-px bg-neutral-800" />

                  {/* Mode Specific Controls */}
                  <div className="flex-1 space-y-5 overflow-y-auto pr-1">
                    {mode === 'paint' && (
                      <>
                        <div className="space-y-3">
                          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{t('imageEditor.effectType')}</span>
                          <div className="flex rounded-lg overflow-hidden bg-neutral-800 p-1 border border-neutral-700">
                            <button
                              onClick={() => setPaintType('mosaic')}
                              className={`flex-1 py-1.5 text-xs rounded-md transition-all duration-150 ${
                                paintType === 'mosaic' ? 'bg-neutral-700 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
                              }`}
                            >
                              {t('imageEditor.mosaic')}
                            </button>
                            <button
                              onClick={() => setPaintType('blur')}
                              className={`flex-1 py-1.5 text-xs rounded-md transition-all duration-150 ${
                                paintType === 'blur' ? 'bg-neutral-700 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
                              }`}
                            >
                              {t('imageEditor.blur')}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{t('imageEditor.brushSize')}</span>
                            <span className="text-xs font-mono text-neutral-300">{brushSize}px</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="100"
                            value={brushSize}
                            onChange={(e) => setBrushSize(Number(e.target.value))}
                            className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                          />
                          <div className="flex justify-center items-center h-16 bg-neutral-950/40 rounded-xl border border-neutral-800/60">
                            <div
                              className="bg-neutral-100 rounded-full opacity-60 transition-all duration-75"
                              style={{ width: `${brushSize}px`, height: `${brushSize}px` }}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {mode === 'crop' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{t('imageEditor.cropRatio')}</span>
                          {fixedRatio ? (
                            <div className="text-xs text-neutral-300 bg-neutral-800 p-3 rounded-xl border border-neutral-700 font-medium">
                              {t('imageEditor.fixedRatio', { ratio: fixedRatio })}
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              {cropRatioOptions.map((opt) => (
                                <div key={opt.value} className="group relative">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCropRatio(opt.value)
                                      setCropBox(getInitialCropBoxForRatio(opt.value))
                                    }}
                                    aria-label={opt.instagram
                                      ? `${opt.label}, ${t('imageEditor.instagramResolution')}`
                                      : opt.label}
                                    className={`w-full py-2 px-3 text-xs rounded-xl border transition-all duration-150 ${
                                      cropRatio === opt.value
                                        ? 'bg-neutral-700 border-neutral-600 text-white font-medium shadow-md shadow-neutral-950/20'
                                        : 'bg-neutral-800/50 border-neutral-700 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                  {opt.instagram && (
                                    <span
                                      role="tooltip"
                                      className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-semibold text-neutral-800 opacity-0 shadow-lg transition-opacity after:absolute after:left-1/2 after:top-full after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-white group-hover:opacity-100 group-focus-within:opacity-100"
                                    >
                                      {t('imageEditor.instagramResolution')}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {recommendedResolution && (
                            <div className="text-xs leading-relaxed text-amber-200 bg-amber-950/30 p-3 rounded-xl border border-amber-800/60">
                              {recommendedResolution}
                            </div>
                          )}

                          {cropRatio === 'custom' && (
                            <div className="flex items-center gap-2 mt-2 p-2 bg-neutral-950/40 rounded-xl border border-neutral-800">
                              <div className="flex-1 flex flex-col gap-1">
                                <label className="text-[10px] text-neutral-400 font-medium">{t('imageEditor.widthRatio')}</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={customRatioW}
                                  onChange={(e) => handleCustomRatioChange(e.target.value, customRatioH)}
                                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-primary-500"
                                />
                              </div>
                              <span className="text-neutral-500 self-end mb-1.5">:</span>
                              <div className="flex-1 flex flex-col gap-1">
                                <label className="text-[10px] text-neutral-400 font-medium">{t('imageEditor.heightRatio')}</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={customRatioH}
                                  onChange={(e) => handleCustomRatioChange(customRatioW, e.target.value)}
                                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-primary-500"
                                />
                              </div>
                            </div>
                          )}
                          {showInstagramCropPreset && (
                            <p className="text-xs leading-relaxed text-amber-200">
                              {t('imageEditor.instagramRecommendedRatio')}
                            </p>
                          )}
                        </div>

                        <div className="h-px bg-neutral-800" />

                        <div className="space-y-3">
                          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{t('imageEditor.cropAction')}</span>
                          <p className="text-xs text-neutral-400 leading-relaxed">
                            {t('imageEditor.cropHint')}
                          </p>
                          <button
                            onClick={handleApplyCrop}
                            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white text-xs font-semibold shadow-lg shadow-amber-950/20 transition-all duration-150"
                          >
                            {t('imageEditor.applyCrop')}
                          </button>
                        </div>
                      </div>
                    )}

                    {mode === 'rotate' && (
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{t('imageEditor.tilt')}</span>
                            <span className="text-xs font-mono text-neutral-300">{tiltAngle}°</span>
                          </div>
                          <input
                            type="range"
                            min="-45"
                            max="45"
                            value={tiltAngle}
                            onChange={(e) => handleTiltSliderChange(Number(e.target.value))}
                            className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleTiltSliderChange(0)}
                              disabled={tiltAngle === 0}
                              className="flex-1 py-1.5 text-xs rounded-lg border border-neutral-700 bg-neutral-800/40 hover:bg-neutral-800 text-neutral-300 disabled:opacity-30 disabled:hover:bg-transparent transition-all duration-150"
                            >
                              {t('imageEditor.resetTilt')}
                            </button>
                            <button
                              onClick={handleApplyTilt}
                              disabled={tiltAngle === 0}
                              className="flex-1 py-1.5 text-xs rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold disabled:opacity-30 transition-all duration-150"
                            >
                              {t('imageEditor.applyTilt')}
                            </button>
                          </div>
                        </div>

                        <div className="h-px bg-neutral-800" />

                        <div className="space-y-3">
                          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{t('imageEditor.rotate90')}</span>
                          <button
                            onClick={handleRotate}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-neutral-700 bg-neutral-800/40 hover:bg-neutral-800 text-neutral-200 text-xs font-medium transition-all duration-150"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3" />
                            </svg>
                            {t('imageEditor.rotateClockwise')}
                          </button>
                        </div>
                      </div>
                    )}

                    {mode === 'resize' && (
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{t('imageEditor.resizeAction')}</span>
                          <div className="flex items-center gap-2 p-2 bg-neutral-950/40 rounded-xl border border-neutral-800">
                            <div className="flex-1 flex flex-col gap-1">
                              <label className="text-[10px] text-neutral-400 font-medium">{t('imageEditor.widthPx')}</label>
                              <input
                                type="number"
                                min="1"
                                value={resizeW}
                                onChange={(e) => handleResizeWChange(e.target.value)}
                                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary-500"
                              />
                            </div>
                            <span className="text-neutral-500 self-end mb-2">×</span>
                            <div className="flex-1 flex flex-col gap-1">
                              <label className="text-[10px] text-neutral-400 font-medium">{t('imageEditor.heightPx')}</label>
                              <input
                                type="number"
                                min="1"
                                value={resizeH}
                                onChange={(e) => handleResizeHChange(e.target.value)}
                                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary-500"
                              />
                            </div>
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-neutral-300">
                            <input
                              type="checkbox"
                              checked={keepAspectRatio}
                              onChange={(e) => setKeepAspectRatio(e.target.checked)}
                              className="rounded border-neutral-700 bg-neutral-800 text-primary-600 focus:ring-primary-500/30 font-sans"
                            />
                            {t('imageEditor.keepRatio')}
                          </label>
                        </div>

                        <button
                          onClick={handleApplyResize}
                          className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-950/20 transition-all duration-150"
                        >
                          {t('imageEditor.applyResize')}
                        </button>
                      </div>
                    )}
                  </div>

                </div>
                
                {/* Canvas Viewport (Center) */}
                <div className="flex-1 flex items-center justify-center p-6 bg-neutral-950/20 overflow-hidden relative">
                  <div
                    ref={containerRef}
                    className="relative inline-block overflow-hidden max-w-full max-h-full border border-neutral-800 rounded-lg shadow-xl"
                  >
                    <canvas
                      ref={canvasRef}
                      className="block max-w-full max-h-[50vh] md:max-h-[60vh] h-auto w-auto object-contain select-none bg-neutral-900"
                      onMouseDown={(e) => startDrawing(e.clientX, e.clientY)}
                      onMouseMove={(e) => handleDrawingMove(e.clientX, e.clientY)}
                      onMouseUp={endDrawing}
                      onMouseLeave={endDrawing}
                      onTouchStart={(e) => {
                        const touch = e.touches[0]
                        startDrawing(touch.clientX, touch.clientY)
                      }}
                      onTouchMove={(e) => {
                        const touch = e.touches[0]
                        handleDrawingMove(touch.clientX, touch.clientY)
                      }}
                      onTouchEnd={endDrawing}
                      style={{
                        touchAction: mode === 'paint' ? 'none' : 'auto',
                        cursor: getCursorStyle(),
                      }}
                    />

                    {/* Crop Overlay */}
                    {mode === 'crop' && (
                      <div className="absolute inset-0 select-none overflow-hidden bg-transparent">
                        <div
                          className="absolute border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] cursor-move transition-shadow"
                          style={{
                            left: `${cropBox.x * 100}%`,
                            top: `${cropBox.y * 100}%`,
                            width: `${cropBox.w * 100}%`,
                            height: `${cropBox.h * 100}%`,
                          }}
                          onMouseDown={handleCropBoxDragStart}
                          onTouchStart={handleCropBoxDragStart}
                        >
                          {/* Grid Lines */}
                          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                            <div className="border-r border-dashed border-white/30 border-b border-white/30" />
                            <div className="border-r border-dashed border-white/30 border-b border-white/30" />
                            <div className="border-b border-white/30" />
                            <div className="border-r border-dashed border-white/30 border-b border-white/30" />
                            <div className="border-r border-dashed border-white/30 border-b border-white/30" />
                            <div className="border-b border-white/30" />
                            <div className="border-r border-dashed border-white/30" />
                            <div className="border-r border-dashed border-white/30" />
                            <div />
                          </div>

                          {/* Handles */}
                          {/* NW */}
                          <div
                            className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-white border border-neutral-900 rounded-sm cursor-nwse-resize z-10 flex items-center justify-center active:scale-125 transition-transform"
                            onMouseDown={(e) => handleHandleDragStart(e, 'nw')}
                            onTouchStart={(e) => handleHandleDragStart(e, 'nw')}
                          />
                          {/* NE */}
                          <div
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white border border-neutral-900 rounded-sm cursor-nesw-resize z-10 flex items-center justify-center active:scale-125 transition-transform"
                            onMouseDown={(e) => handleHandleDragStart(e, 'ne')}
                            onTouchStart={(e) => handleHandleDragStart(e, 'ne')}
                          />
                          {/* SW */}
                          <div
                            className="absolute -bottom-1.5 -left-1.5 w-4 h-4 bg-white border border-neutral-900 rounded-sm cursor-nesw-resize z-10 flex items-center justify-center active:scale-125 transition-transform"
                            onMouseDown={(e) => handleHandleDragStart(e, 'sw')}
                            onTouchStart={(e) => handleHandleDragStart(e, 'sw')}
                          />
                          {/* SE */}
                          <div
                            className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-white border border-neutral-900 rounded-sm cursor-nwse-resize z-10 flex items-center justify-center active:scale-125 transition-transform"
                            onMouseDown={(e) => handleHandleDragStart(e, 'se')}
                            onTouchStart={(e) => handleHandleDragStart(e, 'se')}
                          />
                          {/* N */}
                          <div
                            className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-3 bg-white border border-neutral-900 rounded-sm cursor-ns-resize z-10 active:scale-110 transition-transform"
                            onMouseDown={(e) => handleHandleDragStart(e, 'n')}
                            onTouchStart={(e) => handleHandleDragStart(e, 'n')}
                          />
                          {/* S */}
                          <div
                            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-3 bg-white border border-neutral-900 rounded-sm cursor-ns-resize z-10 active:scale-110 transition-transform"
                            onMouseDown={(e) => handleHandleDragStart(e, 's')}
                            onTouchStart={(e) => handleHandleDragStart(e, 's')}
                          />
                          {/* W */}
                          <div
                            className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-6 bg-white border border-neutral-900 rounded-sm cursor-ew-resize z-10 active:scale-110 transition-transform"
                            onMouseDown={(e) => handleHandleDragStart(e, 'w')}
                            onTouchStart={(e) => handleHandleDragStart(e, 'w')}
                          />
                          {/* E */}
                          <div
                            className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-6 bg-white border border-neutral-900 rounded-sm cursor-ew-resize z-10 active:scale-110 transition-transform"
                            onMouseDown={(e) => handleHandleDragStart(e, 'e')}
                            onTouchStart={(e) => handleHandleDragStart(e, 'e')}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Toolbar for Mobile (Hidden on Desktop) */}
                <div className="flex md:hidden flex-col border-t border-neutral-800 bg-neutral-900/60 p-4 gap-4">
                  
                  {/* Tool Swapper */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleModeChange('paint')}
                      className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                        mode === 'paint' ? 'bg-primary-600 border-primary-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      {t('imageEditor.brush')}
                    </button>
                    <button
                      onClick={() => handleModeChange('crop')}
                      className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                        mode === 'crop' ? 'bg-primary-600 border-primary-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v14a2 2 0 002 2h14M18 22V10a2 2 0 00-2-2H2" />
                      </svg>
                      {t('imageEditor.crop')}
                    </button>
                    <button
                      onClick={() => handleModeChange('rotate')}
                      className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                        mode === 'rotate' ? 'bg-primary-600 border-primary-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3" />
                      </svg>
                      {t('imageEditor.rotate')}
                    </button>
                    <button
                      onClick={() => handleModeChange('resize')}
                      className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 ${
                        mode === 'resize' ? 'bg-primary-600 border-primary-500 text-white' : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                      </svg>
                      {t('imageEditor.resize')}
                    </button>
                  </div>

                  {/* Mode Specific settings for Mobile */}
                  {mode === 'paint' && (
                    <div className="flex items-center gap-3">
                      {/* Selector */}
                      <div className="flex rounded-lg overflow-hidden bg-neutral-800 p-0.5 border border-neutral-700 shrink-0">
                        <button
                          onClick={() => setPaintType('mosaic')}
                          className={`px-3 py-1.5 text-xs rounded-md ${
                            paintType === 'mosaic' ? 'bg-neutral-700 text-white font-medium' : 'text-neutral-400'
                          }`}
                        >
                          {t('imageEditor.mosaic')}
                        </button>
                        <button
                          onClick={() => setPaintType('blur')}
                          className={`px-3 py-1.5 text-xs rounded-md ${
                            paintType === 'blur' ? 'bg-neutral-700 text-white font-medium' : 'text-neutral-400'
                          }`}
                        >
                          {t('imageEditor.blur')}
                        </button>
                      </div>
                      {/* Slider */}
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="range"
                          min="10"
                          max="80"
                          value={brushSize}
                          onChange={(e) => setBrushSize(Number(e.target.value))}
                          className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                        />
                        <span className="text-[10px] font-mono text-neutral-400 shrink-0">{brushSize}px</span>
                      </div>
                    </div>
                  )}

                  {mode === 'crop' && (
                    <div className="flex flex-col gap-3">
                      {/* Crop Ratio Selector (horizontal scroll) */}
                      {fixedRatio ? (
                        <div className="text-xs text-neutral-300 bg-neutral-800 p-2.5 rounded-lg border border-neutral-700 font-medium">
                          {t('imageEditor.fixedRatio', { ratio: fixedRatio })}
                        </div>
                      ) : (
                        <div className="flex gap-2 overflow-x-auto pb-1 pt-8 scrollbar-none">
                          {cropRatioOptions.map((opt) => (
                            <div key={opt.value} className="group relative shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setCropRatio(opt.value)
                                  setCropBox(getInitialCropBoxForRatio(opt.value))
                                }}
                                aria-label={opt.instagram
                                  ? `${opt.label}, ${t('imageEditor.instagramResolution')}`
                                  : opt.label}
                                className={`py-1.5 px-3 text-xs rounded-lg border transition-all duration-150 ${
                                  cropRatio === opt.value
                                    ? 'bg-neutral-700 border-neutral-600 text-white font-medium shadow-md shadow-neutral-950/20'
                                    : 'bg-neutral-800/50 border-neutral-700 hover:bg-neutral-800 text-neutral-400'
                                }`}
                              >
                                {opt.label}
                              </button>
                              {opt.instagram && (
                                <span
                                  role="tooltip"
                                  className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-semibold text-neutral-800 opacity-0 shadow-lg transition-opacity after:absolute after:left-1/2 after:top-full after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-white group-hover:opacity-100 group-focus-within:opacity-100"
                                >
                                  {t('imageEditor.instagramResolution')}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {recommendedResolution && (
                        <div className="text-[11px] leading-relaxed text-amber-200 bg-amber-950/30 p-2.5 rounded-lg border border-amber-800/60">
                          {recommendedResolution}
                        </div>
                      )}

                      {!fixedRatio && cropRatio === 'custom' && (
                        <div className="flex items-center gap-2 p-1.5 bg-neutral-950/40 rounded-lg border border-neutral-800">
                          <div className="flex-1 flex items-center gap-1">
                            <span className="text-[10px] text-neutral-400 whitespace-nowrap">{t('imageEditor.widthRatio')}</span>
                            <input
                              type="number"
                              min="1"
                              value={customRatioW}
                              onChange={(e) => handleCustomRatioChange(e.target.value, customRatioH)}
                              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-1.5 py-0.5 text-xs text-white"
                            />
                          </div>
                          <span className="text-neutral-500">:</span>
                          <div className="flex-1 flex items-center gap-1">
                            <span className="text-[10px] text-neutral-400 whitespace-nowrap">{t('imageEditor.heightRatio')}</span>
                            <input
                              type="number"
                              min="1"
                              value={customRatioH}
                              onChange={(e) => handleCustomRatioChange(customRatioW, e.target.value)}
                              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-1.5 py-0.5 text-xs text-white"
                            />
                          </div>
                        </div>
                      )}
                      {showInstagramCropPreset && (
                        <p className="text-[11px] leading-relaxed text-amber-200">
                          {t('imageEditor.instagramRecommendedRatio')}
                        </p>
                      )}

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[11px] text-neutral-400">{t('imageEditor.cropHintMobile')}</span>
                        <button
                          onClick={handleApplyCrop}
                          className="py-1.5 px-4 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shrink-0 shadow-lg shadow-amber-950/20"
                        >
                          {t('imageEditor.applyCrop')}
                        </button>
                      </div>
                    </div>
                  )}

                  {mode === 'rotate' && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-neutral-400 shrink-0">{t('imageEditor.tilt')}</span>
                        <input
                          type="range"
                          min="-45"
                          max="45"
                          value={tiltAngle}
                          onChange={(e) => handleTiltSliderChange(Number(e.target.value))}
                          className="flex-1 h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                        />
                        <span className="text-xs font-mono text-neutral-300 w-10 text-right">{tiltAngle}°</span>
                      </div>
                      
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={handleRotate}
                          className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800/40 text-neutral-300 text-xs font-medium"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3" />
                          </svg>
                          {t('imageEditor.rotate90')}
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleTiltSliderChange(0)}
                            disabled={tiltAngle === 0}
                            className="px-3 py-1.5 text-xs rounded-lg border border-neutral-700 bg-neutral-800/40 text-neutral-300 disabled:opacity-30"
                          >
                            {t('imageEditor.reset')}
                          </button>
                          <button
                            onClick={handleApplyTilt}
                            disabled={tiltAngle === 0}
                            className="px-4 py-1.5 text-xs rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold disabled:opacity-30"
                          >
                            {t('imageEditor.applyTilt')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {mode === 'resize' && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 p-1.5 bg-neutral-950/40 rounded-lg border border-neutral-800">
                        <div className="flex-1 flex items-center gap-1.5">
                          <span className="text-[10px] text-neutral-400">{t('imageEditor.width')}</span>
                          <input
                            type="number"
                            min="1"
                            value={resizeW}
                            onChange={(e) => handleResizeWChange(e.target.value)}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-1.5 py-0.5 text-xs text-white"
                          />
                        </div>
                        <span className="text-neutral-500">×</span>
                        <div className="flex-1 flex items-center gap-1.5">
                          <span className="text-[10px] text-neutral-400">{t('imageEditor.height')}</span>
                          <input
                            type="number"
                            min="1"
                            value={resizeH}
                            onChange={(e) => handleResizeHChange(e.target.value)}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-1.5 py-0.5 text-xs text-white"
                          />
                        </div>
                        <label className="flex items-center gap-1 cursor-pointer select-none text-[10px] text-neutral-300 whitespace-nowrap ml-1">
                          <input
                            type="checkbox"
                            checked={keepAspectRatio}
                            onChange={(e) => setKeepAspectRatio(e.target.checked)}
                            className="rounded border-neutral-700 bg-neutral-800 text-primary-600 focus:ring-primary-500/30"
                          />
                          {t('imageEditor.keepRatioShort')}
                        </label>
                      </div>

                      <button
                        onClick={handleApplyResize}
                        className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-amber-950/20"
                      >
                        {t('imageEditor.applyResize')}
                      </button>
                    </div>
                  )}

                </div>

              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-neutral-800 flex items-center justify-end gap-3 bg-neutral-900/80">
                <button
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl border border-neutral-700 hover:bg-neutral-800 text-neutral-200 text-xs font-medium transition-all duration-150 disabled:opacity-50"
                >
                  {t('imageEditor.cancel')}
                </button>
                <button
                  onClick={handleSaveClick}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 active:bg-primary-700 disabled:bg-primary-700 text-white text-xs font-semibold shadow-lg shadow-primary-900/20 flex items-center gap-2 transition-all duration-150"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {t('imageEditor.saving')}
                    </>
                  ) : (
                    t('imageEditor.apply')
                  )}
                </button>
              </div>

            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  )
}
