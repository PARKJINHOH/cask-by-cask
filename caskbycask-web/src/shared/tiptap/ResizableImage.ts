import Image from '@tiptap/extension-image'
import { mergeAttributes } from '@tiptap/core'
import { NodeSelection } from '@tiptap/pm/state'
import { Fragment, Slice } from '@tiptap/pm/model'
import { Plugin } from '@tiptap/pm/state'
import { dropPoint } from '@tiptap/pm/transform'
import i18n from '@/shared/utils/i18n'

const INTERNAL_IMAGE_DRAG = 'application/x-caskbycask-image-pos'
const activeImageDragPositions = new WeakMap<object, number>()
const DEFAULT_PAIR_WIDTH = 50
const MIN_PAIR_WIDTH = 25
const MAX_PAIR_WIDTH = 75
const DEFAULT_PAIR_HEIGHT = 0.36
const MIN_IMAGE_WIDTH_PX = 40
// 더블탭(이미지 편집)으로 인정할 손가락 흔들림 허용치. 이보다 크면 스크롤 제스처로 본다.
const TOUCH_TAP_SLOP_PX = 10

type ImageWidth = { unit: 'percent' | 'pixel'; value: number }

function parseImageWidth(value: unknown): ImageWidth | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const raw = String(value).trim()
  const percent = raw.match(/^(\d+(?:\.\d+)?)%$/)
  if (percent) {
    return { unit: 'percent', value: Math.min(100, Math.max(1, Number(percent[1]))) }
  }
  const pixel = raw.match(/^(\d+(?:\.\d+)?)(?:px)?$/)
  if (pixel) {
    return { unit: 'pixel', value: Math.max(1, Number(pixel[1])) }
  }
  return null
}

function clampPairWidth(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed)
    ? Math.min(MAX_PAIR_WIDTH, Math.max(MIN_PAIR_WIDTH, parsed))
    : DEFAULT_PAIR_WIDTH
}

function clampPairHeight(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed)
    ? Math.min(1.2, Math.max(0.12, parsed))
    : DEFAULT_PAIR_HEIGHT
}

function imageAspect(element: Element | null) {
  const image = element?.querySelector('img') as HTMLImageElement | null
  if (!image) return 1
  if (image.naturalWidth > 0 && image.naturalHeight > 0) {
    return image.naturalWidth / image.naturalHeight
  }
  const rect = image.getBoundingClientRect()
  return rect.height > 0 ? rect.width / rect.height : 1
}

function calculatePairHeight(sourceElement: Element | null, targetElement: Element | null) {
  const leftHeight = 0.5 / imageAspect(sourceElement)
  const rightHeight = 0.5 / imageAspect(targetElement)
  return clampPairHeight(Math.min(leftHeight, rightHeight))
}

function createPairId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `image-pair-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * 공통 이미지 확장 (사용자/관리자 Tiptap 에디터 공용)
 * - width 속성 지원 (toolbar % 버튼 + 드래그 리사이즈)
 * - NodeView: 이미지 선택 시 테두리 + 모서리 핸들 드래그로 크기 조절
 *
 * 선택 테두리는 ProseMirror가 선택된 노드의 최상위 DOM에 부여하는
 * `.ProseMirror-selectednode` 클래스를 CSS(editor css)에서 스타일링한다.
 */
export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute('width'),
        renderHTML: (attributes) => {
          if (!attributes.width) return {}
          return { width: attributes.width }
        },
      },
      layout: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-image-layout'),
        renderHTML: (attributes) => attributes.layout
          ? { 'data-image-layout': attributes.layout }
          : {},
      },
      pairId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-image-pair'),
        renderHTML: (attributes) => attributes.pairId
          ? { 'data-image-pair': attributes.pairId }
          : {},
      },
      pairWidth: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-image-pair-width'),
        renderHTML: (attributes) => attributes.pairWidth != null
          ? { 'data-image-pair-width': String(attributes.pairWidth) }
          : {},
      },
      pairHeight: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-image-pair-height'),
        renderHTML: (attributes) => attributes.pairHeight != null
          ? { 'data-image-pair-height': String(attributes.pairHeight) }
          : {},
      },
      source: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-image-source'),
        renderHTML: (attributes) => {
          const source = typeof attributes.source === 'string' ? attributes.source.trim() : ''
          return source ? { 'data-image-source': source } : {}
        },
      },
    }
  },

  renderHTML({ HTMLAttributes }) {
    const layout = HTMLAttributes['data-image-layout'] as string | undefined
    if (layout !== 'half-left' && layout !== 'half-right') {
      return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)]
    }

    const leftWidth = clampPairWidth(HTMLAttributes['data-image-pair-width'])
    const ownWidth = layout === 'half-right' ? 100 - leftWidth : leftWidth
    const pairHeight = clampPairHeight(HTMLAttributes['data-image-pair-height'])
    const pairStyle = `width:${ownWidth}%;height:${pairHeight * 100}cqi;object-fit:cover`
    const style = HTMLAttributes.style
      ? `${HTMLAttributes.style};${pairStyle}`
      : pairStyle

    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { style })]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleDrop: (view, event) => {
            const rawSourcePos = event.dataTransfer?.getData(INTERNAL_IMAGE_DRAG)
            const fallbackSourcePos = activeImageDragPositions.get(view)
            if (!rawSourcePos && fallbackSourcePos == null) return false

            event.preventDefault()
            activeImageDragPositions.delete(view)
            const sourcePos = rawSourcePos ? Number(rawSourcePos) : fallbackSourcePos!
            const state = view.state
            const sourceNode = state.doc.nodeAt(sourcePos)
            if (!Number.isInteger(sourcePos) || sourceNode?.type.name !== this.name) return true

            const targetElement = (event.target as HTMLElement | null)?.closest('.di-image')
            let targetPos: number | null = null
            if (targetElement && view.dom.contains(targetElement)) {
              state.doc.descendants((candidate, pos) => {
                if (targetPos == null
                  && candidate.type.name === this.name
                  && view.nodeDOM(pos) === targetElement) targetPos = pos
              })
            }

            const tr = state.tr
            const clearPair = (pairId: string | null | undefined, exceptPos?: number) => {
              if (!pairId) return
              const matches: number[] = []
              state.doc.descendants((node, pos) => {
                if (node.type.name === this.name && node.attrs.pairId === pairId && pos !== exceptPos) {
                  matches.push(pos)
                }
              })
              matches.forEach((pos) => {
                const mapped = tr.mapping.map(pos)
                const node = tr.doc.nodeAt(mapped)
                if (node?.type.name === this.name) {
                  tr.setNodeMarkup(mapped, undefined, {
                    ...node.attrs,
                    layout: null,
                    pairId: null,
                    pairWidth: null,
                    pairHeight: null,
                  })
                }
              })
            }

            clearPair(sourceNode.attrs.pairId, sourcePos)

            const targetNode = targetPos != null ? state.doc.nodeAt(targetPos) : null
            const targetRect = targetElement?.getBoundingClientRect()
            const isPairDrop = targetPos != null
              && targetPos !== sourcePos
              && targetNode?.type.name === this.name
              && targetRect

            if (isPairDrop && targetPos != null && targetNode && targetRect) {
              clearPair(targetNode.attrs.pairId, targetPos)
              const placeLeft = event.clientX < targetRect.left + targetRect.width / 2
              const pairId = createPairId()
              const sourceElement = view.nodeDOM(sourcePos) as Element | null
              const pairHeight = calculatePairHeight(sourceElement, targetElement ?? null)

              tr.delete(sourcePos, sourcePos + sourceNode.nodeSize)
              const mappedTargetPos = tr.mapping.map(targetPos)
              const currentTarget = tr.doc.nodeAt(mappedTargetPos)
              if (!currentTarget || currentTarget.type.name !== this.name) return true

              const sourceAttrs = {
                ...sourceNode.attrs,
                width: null,
                layout: placeLeft ? 'half-left' : 'half-right',
                pairId,
                pairWidth: DEFAULT_PAIR_WIDTH,
                pairHeight,
              }
              const targetAttrs = {
                ...currentTarget.attrs,
                width: null,
                layout: placeLeft ? 'half-right' : 'half-left',
                pairId,
                pairWidth: DEFAULT_PAIR_WIDTH,
                pairHeight,
              }
              tr.setNodeMarkup(mappedTargetPos, undefined, targetAttrs)
              const insertPos = placeLeft ? mappedTargetPos : mappedTargetPos + currentTarget.nodeSize
              tr.insert(insertPos, sourceNode.type.create(sourceAttrs))
              tr.setSelection(NodeSelection.create(tr.doc, insertPos))
              view.dispatch(tr)
              return true
            }

            const movedNode = sourceNode.type.create({
              ...sourceNode.attrs,
              layout: null,
              pairId: null,
              pairWidth: null,
              pairHeight: null,
            })
            const slice = new Slice(Fragment.from(movedNode), 0, 0)
            const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
            tr.delete(sourcePos, sourcePos + sourceNode.nodeSize)
            const requestedPos = tr.mapping.map(coords?.pos ?? sourcePos)
            const insertPos = dropPoint(tr.doc, requestedPos, slice)
            if (insertPos == null) return true
            tr.insert(insertPos, movedNode)
            tr.setSelection(NodeSelection.create(tr.doc, insertPos))
            view.dispatch(tr)
            return true
          },
        },
      }),
    ]
  },

  addNodeView() {
    return ({ editor, node, getPos }) => {
      let currentNode = node
      let activeResizeCleanup: (() => void) | null = null

      // wrapper(블록, 정렬 담당) > frame(인라인블록) > img + 투명 드래그 표면
      const wrapper = document.createElement('div')
      wrapper.className = 'di-image'

      const media = document.createElement('span')
      media.className = 'di-image__media'
      wrapper.appendChild(media)

      const frame = document.createElement('span')
      frame.className = 'di-image__frame'
      media.appendChild(frame)

      const img = document.createElement('img')
      // crxMouse의 이미지 Super Drag와 겹치지 않도록 실제 img의 네이티브 드래그는 끈다.
      img.draggable = false
      img.src = currentNode.attrs.src
      if (currentNode.attrs.alt) img.alt = currentNode.attrs.alt
      if (currentNode.attrs.title) img.title = currentNode.attrs.title
      if (currentNode.attrs.width) img.setAttribute('width', currentNode.attrs.width)
      frame.appendChild(img)

      const sourceInput = document.createElement('input')
      sourceInput.type = 'text'
      sourceInput.className = 'di-image__source'
      sourceInput.maxLength = 500
      sourceInput.value = currentNode.attrs.source ?? ''
      sourceInput.contentEditable = 'false'
      const updateSourceInputLabels = () => {
        sourceInput.placeholder = i18n.t('editor.imageSourcePlaceholder')
        sourceInput.setAttribute('aria-label', i18n.t('editor.imageSourceLabel'))
      }
      updateSourceInputLabels()
      i18n.on('languageChanged', updateSourceInputLabels)
      media.appendChild(sourceInput)

      sourceInput.addEventListener('input', () => {
        const pos = getPos()
        if (typeof pos !== 'number') return
        const imageNode = editor.state.doc.nodeAt(pos)
        if (imageNode?.type.name !== currentNode.type.name) return
        editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, {
          ...imageNode.attrs,
          source: sourceInput.value,
        }))
      })

      // 이미지 더블클릭 (데스크톱) / 더블탭 (모바일) 시 편집 이벤트 발생
      const dispatchImageEdit = () => {
        const pos = getPos()
        if (typeof pos === 'number') {
          const event = new CustomEvent('image-edit-request', {
            detail: {
              src: img.src,
              pos: pos,
            },
            bubbles: true,
          })
          editor.view.dom.dispatchEvent(event)
        }
      }

      // 정렬(TextAlign이 image에 적용된 경우) 반영
      const applyAlign = () => {
        const align = (currentNode.attrs as Record<string, unknown>).textAlign as string | undefined
        wrapper.style.textAlign = align && align !== 'left' ? align : ''
      }
      applyAlign()

      const applyLayout = () => {
        const layout = currentNode.attrs.layout as string | null
        const isPair = layout === 'half-left' || layout === 'half-right'
        const pairWidth = clampPairWidth(currentNode.attrs.pairWidth)
        const ownWidth = layout === 'half-right' ? 100 - pairWidth : pairWidth
        const editorWidth = Math.max(1, editor.view.dom.clientWidth - 32)
        const pairHeight = clampPairHeight(currentNode.attrs.pairHeight)
        wrapper.dataset.imageLayout = layout ?? ''
        wrapper.classList.toggle('di-image--half-left', layout === 'half-left')
        wrapper.classList.toggle('di-image--half-right', layout === 'half-right')
        const imageWidth = isPair ? null : parseImageWidth(currentNode.attrs.width)
        wrapper.style.width = isPair ? `${ownWidth}%` : ''
        media.style.width = isPair
          ? '100%'
          : imageWidth?.unit === 'percent'
            ? `${imageWidth.value}%`
            : imageWidth?.unit === 'pixel'
              ? `${Math.min(imageWidth.value, editorWidth)}px`
              : ''
        frame.style.width = isPair || imageWidth ? '100%' : ''
        frame.style.height = isPair ? `${Math.round(editorWidth * pairHeight)}px` : ''
        img.style.width = isPair || imageWidth ? '100%' : ''
        img.style.height = isPair ? '100%' : ''
        img.style.objectFit = isPair ? 'cover' : ''
      }
      applyLayout()

      const layoutObserver = typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => applyLayout())
        : null
      layoutObserver?.observe(editor.view.dom)

      // 이미지 전체를 잡고 이동하되 이벤트 대상은 img가 아닌 투명 표면으로 둔다.
      // crxMouse가 왼쪽 드래그를 이미지 Super Drag로 오인하는 가능성을 줄인다.
      const dragSurface = document.createElement('span')
      dragSurface.className = 'di-image__drag-surface'
      dragSurface.draggable = true
      frame.appendChild(dragSurface)

      dragSurface.addEventListener('dblclick', (e) => {
        e.preventDefault()
        e.stopPropagation()
        dispatchImageEdit()
      })

      // 터치 기기에서는 이미지 위 스와이프를 항상 페이지 스크롤에 양보한다.
      // touchstart/touchmove 는 passive 로 등록해 브라우저 스크롤을 어떤 경우에도 막지 않고,
      // 손가락이 움직였는지만 기록해 더블탭(이미지 편집)과 스크롤 제스처를 구분한다.
      let lastTap = 0
      let touchMoved = false
      let touchStartPoint: { x: number; y: number } | null = null

      dragSurface.addEventListener('touchstart', (e) => {
        touchMoved = e.touches.length !== 1
        touchStartPoint = e.touches.length === 1
          ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
          : null
      }, { passive: true })

      dragSurface.addEventListener('touchmove', (e) => {
        if (touchMoved) return
        if (e.touches.length !== 1 || !touchStartPoint) {
          touchMoved = true
          return
        }
        const touch = e.touches[0]
        const distance = Math.hypot(
          touch.clientX - touchStartPoint.x,
          touch.clientY - touchStartPoint.y,
        )
        if (distance > TOUCH_TAP_SLOP_PX) touchMoved = true
      }, { passive: true })

      dragSurface.addEventListener('touchcancel', () => {
        touchMoved = true
        lastTap = 0
      }, { passive: true })

      dragSurface.addEventListener('touchend', (e) => {
        if (touchMoved) {
          lastTap = 0
          return
        }
        const currentTime = Date.now()
        const tapLength = currentTime - lastTap
        if (tapLength < 300 && tapLength > 0) {
          e.preventDefault()
          e.stopPropagation()
          dispatchImageEdit()
        }
        lastTap = currentTime
      })

      const dividerHandle = document.createElement('span')
      dividerHandle.className = 'di-image__pair-divider'
      dividerHandle.setAttribute('role', 'separator')
      dividerHandle.setAttribute('aria-orientation', 'vertical')
      dividerHandle.setAttribute('aria-valuemin', String(MIN_PAIR_WIDTH))
      dividerHandle.setAttribute('aria-valuemax', String(MAX_PAIR_WIDTH))
      dividerHandle.setAttribute('aria-valuenow', String(DEFAULT_PAIR_WIDTH))
      dividerHandle.tabIndex = 0
      frame.appendChild(dividerHandle)

      const commitPairWidth = (nextWidth: number) => {
        const leftPos = getPos()
        if (typeof leftPos !== 'number' || !currentNode.attrs.pairId) return
        const state = editor.view.state
        let partnerPos: number | null = null
        state.doc.descendants((candidate, pos) => {
          if (candidate.type.name === currentNode.type.name
            && candidate.attrs.pairId === currentNode.attrs.pairId
            && pos !== leftPos) partnerPos = pos
        })
        if (partnerPos == null) return
        const leftNode = state.doc.nodeAt(leftPos)
        const rightNode = state.doc.nodeAt(partnerPos)
        if (!leftNode || !rightNode) return
        const width = clampPairWidth(nextWidth)
        const tr = state.tr
        tr.setNodeMarkup(leftPos, undefined, { ...leftNode.attrs, pairWidth: width })
        tr.setNodeMarkup(partnerPos, undefined, { ...rightNode.attrs, pairWidth: width })
        editor.view.dispatch(tr)
      }

      const resizePair = (event: PointerEvent) => {
        if (event.pointerType === 'touch') return
        if (currentNode.attrs.layout !== 'half-left' || !currentNode.attrs.pairId) return
        event.preventDefault()
        event.stopPropagation()

        const currentPos = getPos()
        if (typeof currentPos !== 'number') return
        const state = editor.view.state
        let partnerPos: number | null = null
        state.doc.descendants((candidate, pos) => {
          if (candidate.type.name === currentNode.type.name
            && candidate.attrs.pairId === currentNode.attrs.pairId
            && pos !== currentPos) partnerPos = pos
        })
        if (partnerPos == null) return

        const partnerElement = editor.view.nodeDOM(partnerPos) as HTMLElement | null
        if (!partnerElement) return
        const leftRect = wrapper.getBoundingClientRect()
        const rightRect = partnerElement.getBoundingClientRect()
        const rowLeft = Math.min(leftRect.left, rightRect.left)
        const rowWidth = leftRect.width + rightRect.width
        if (rowWidth <= 0) return

        const preview = (clientX: number) => {
          const leftWidth = clampPairWidth(((clientX - rowLeft) / rowWidth) * 100)
          wrapper.style.width = `${leftWidth}%`
          partnerElement.style.width = `${100 - leftWidth}%`
          dividerHandle.setAttribute('aria-valuenow', String(Math.round(leftWidth)))
          return leftWidth
        }

        const handle = event.currentTarget as HTMLElement
        handle.setPointerCapture(event.pointerId)
        wrapper.classList.add('di-image--resizing-pair')
        let finalWidth = clampPairWidth(currentNode.attrs.pairWidth)
        const onMove = (moveEvent: PointerEvent) => {
          finalWidth = preview(moveEvent.clientX)
        }
        const onUp = (upEvent: PointerEvent) => {
          handle.removeEventListener('pointermove', onMove)
          handle.removeEventListener('pointerup', onUp)
          handle.removeEventListener('pointercancel', onUp)
          if (handle.hasPointerCapture(upEvent.pointerId)) handle.releasePointerCapture(upEvent.pointerId)
          commitPairWidth(finalWidth)
          wrapper.classList.remove('di-image--resizing-pair')
        }

        handle.addEventListener('pointermove', onMove)
        handle.addEventListener('pointerup', onUp)
        handle.addEventListener('pointercancel', onUp)
      }
      dividerHandle.addEventListener('pointerdown', resizePair)
      dividerHandle.addEventListener('keydown', (event) => {
        if (currentNode.attrs.layout !== 'half-left') return
        const direction = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
        if (direction === 0) return
        event.preventDefault()
        event.stopPropagation()
        commitPairWidth(clampPairWidth(currentNode.attrs.pairWidth) + direction * 2)
      })

      // 데스크톱 마우스 드래그 시작 시 노드 선택
      dragSurface.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return
        const pos = getPos()
        if (typeof pos === 'number') {
          editor.view.dispatch(
            editor.view.state.tr.setSelection(NodeSelection.create(editor.view.state.doc, pos))
          )
        }
      })

      const startImageDrag = (e: DragEvent) => {
        const pos = getPos()
        if (typeof pos !== 'number' || !e.dataTransfer) return
        editor.view.dispatch(
          editor.view.state.tr.setSelection(NodeSelection.create(editor.view.state.doc, pos))
        )
        // ProseMirror 기본 dragstart가 dataTransfer.clearData()로 내부 식별자를
        // 지우지 않도록 이 커스텀 이미지 드래그는 NodeView에서 끝까지 처리한다.
        e.stopPropagation()
        activeImageDragPositions.set(editor.view, pos)
        e.dataTransfer.setData(INTERNAL_IMAGE_DRAG, String(pos))
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setDragImage(img, Math.min(40, img.width / 2), Math.min(40, img.height / 2))
      }
      const endImageDrag = () => {
        activeImageDragPositions.delete(editor.view)
      }
      dragSurface.addEventListener('dragstart', startImageDrag)
      dragSurface.addEventListener('dragend', endImageDrag)

      // 모서리 리사이즈 핸들 4개
      const handlePositions = ['nw', 'ne', 'sw', 'se'] as const
      handlePositions.forEach((pos) => {
        const handle = document.createElement('span')
        handle.className = `di-image__handle di-image__handle--${pos}`
        handle.addEventListener('pointerdown', (event) => startResize(event, pos))
        frame.appendChild(handle)
      })

      function startResize(event: PointerEvent, pos: (typeof handlePositions)[number]) {
        if (event.pointerType === 'touch') return
        if (currentNode.attrs.layout === 'half-left' || currentNode.attrs.layout === 'half-right') return
        activeResizeCleanup?.()
        activeResizeCleanup = null
        event.preventDefault()
        event.stopPropagation()

        const startX = event.clientX
        const rect = img.getBoundingClientRect()
        const startWidth = rect.width
        const wrapperRect = wrapper.getBoundingClientRect()
        const maxWidth = wrapperRect.width || startWidth
        const textAlign = window.getComputedStyle(wrapper).textAlign
        const growsRight = pos === 'ne' || pos === 'se'
        const minWidth = Math.min(MIN_IMAGE_WIDTH_PX, maxWidth)
        let finalPercent = Math.round((startWidth / maxWidth) * 100)
        let nextWidth = startWidth
        let animationFrame: number | null = null
        const handle = event.currentTarget as HTMLElement
        const preview = document.createElement('span')
        const previewImage = img.cloneNode(false) as HTMLImageElement
        const scrollContainer = editor.view.dom.closest<HTMLElement>('.di-richtext')
          ?? editor.view.dom.parentElement
        const lockedScrollTop = scrollContainer?.scrollTop ?? 0
        const lockedScrollLeft = scrollContainer?.scrollLeft ?? 0
        const lockedBottomGap = scrollContainer
          ? Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight - lockedScrollTop)
          : 0
        const keepBottomAnchored = lockedBottomGap <= 2
        const previousOverflowAnchor = scrollContainer?.style.overflowAnchor ?? ''

        // crxMouse는 document_start 시점부터 window 전역 mouse/drag 이벤트를 관찰한다.
        // 해당 이벤트를 막으면 확장 기능도 함께 깨지므로, 리사이즈 미리보기만 fixed 레이어로
        // 분리한다. 드래그 중 편집기 레이아웃과 scrollHeight가 변하지 않아 서로 스크롤을
        // 보정하는 루프가 발생하지 않고, pointerup 때 실제 문서 폭을 한 번만 반영한다.
        preview.className = 'di-image-resize-preview'
        preview.setAttribute('aria-hidden', 'true')
        previewImage.className = 'di-image-resize-preview__image'
        previewImage.draggable = false
        previewImage.removeAttribute('width')
        preview.appendChild(previewImage)
        handlePositions.forEach((previewPos) => {
          const previewHandle = document.createElement('span')
          previewHandle.className = `di-image-resize-preview__handle di-image-resize-preview__handle--${previewPos}`
          preview.appendChild(previewHandle)
        })
        // 미리보기는 body 위 레이어라 그대로 두면 편집 영역 밖(글자수 표시줄·페이지 본문)까지
        // 넘쳐 보인다. 편집 영역 크기의 클리핑 레이어 안에 넣어 실제 이미지와 같은 범위에서만 보이게 한다.
        const previewClip = document.createElement('span')
        previewClip.className = 'di-image-resize-clip'
        const clipRect = scrollContainer?.getBoundingClientRect()
        const clipOriginLeft = clipRect?.left ?? 0
        const clipOriginTop = clipRect?.top ?? 0
        previewClip.style.left = `${clipOriginLeft}px`
        previewClip.style.top = `${clipOriginTop}px`
        previewClip.style.width = `${clipRect?.width ?? window.innerWidth}px`
        previewClip.style.height = `${clipRect?.height ?? window.innerHeight}px`
        previewClip.appendChild(preview)
        document.body.appendChild(previewClip)

        wrapper.classList.add('di-image--resizing')
        media.style.visibility = 'hidden'
        if (scrollContainer) {
          scrollContainer.classList.add('di-richtext--image-resizing')
          scrollContainer.style.overflowAnchor = 'none'
        }
        handle.setPointerCapture(event.pointerId)

        const restoreEditorScroll = () => {
          if (!scrollContainer) return
          const maxScrollTop = Math.max(0, scrollContainer.scrollHeight - scrollContainer.clientHeight)
          // 이미지가 에디터 하단 근처에 있을 때 높이가 줄면 예전 scrollTop은 더 이상
          // 유효하지 않다. 그 값을 계속 강제하면 브라우저 보정과 충돌해 이미지가 떨린다.
          scrollContainer.scrollTop = keepBottomAnchored
            ? Math.max(0, maxScrollTop - lockedBottomGap)
            : Math.min(lockedScrollTop, maxScrollTop)
          scrollContainer.scrollLeft = lockedScrollLeft
        }

        const renderPreview = () => {
          animationFrame = null
          finalPercent = Math.min(100, Math.max(1, Math.round((nextWidth / maxWidth) * 100)))
          const previewWidth = (finalPercent / 100) * maxWidth
          const previewLeft = textAlign === 'center'
            ? wrapperRect.left + (maxWidth - previewWidth) / 2
            : textAlign === 'right' || textAlign === 'end'
              ? wrapperRect.right - previewWidth
              : wrapperRect.left
          // 좌표는 클리핑 레이어(편집 영역) 기준으로 환산한다.
          preview.style.left = `${previewLeft - clipOriginLeft}px`
          preview.style.top = `${rect.top - clipOriginTop}px`
          preview.style.width = `${previewWidth}px`
        }

        renderPreview()

        const onMove = (moveEvent: PointerEvent) => {
          const dx = moveEvent.clientX - startX
          const delta = growsRight ? dx : -dx
          nextWidth = Math.min(Math.max(minWidth, Math.round(startWidth + delta)), Math.round(maxWidth))
          if (animationFrame == null) animationFrame = requestAnimationFrame(renderPreview)
        }

        const onUp = (upEvent: PointerEvent) => {
          handle.removeEventListener('pointermove', onMove)
          handle.removeEventListener('pointerup', onUp)
          handle.removeEventListener('pointercancel', onUp)
          if (handle.hasPointerCapture(upEvent.pointerId)) handle.releasePointerCapture(upEvent.pointerId)
          if (animationFrame != null) cancelAnimationFrame(animationFrame)
          renderPreview()
          if (typeof getPos === 'function') {
            editor
              .chain()
              .command(({ tr }) => {
                const pos2 = getPos()
                if (pos2 == null) return false
                tr.setNodeMarkup(pos2, undefined, {
                  ...currentNode.attrs,
                  width: `${finalPercent}%`,
                })
                return true
              })
              .run()
          }
          activeResizeCleanup = null
          previewClip.remove()
          media.style.visibility = ''
          restoreEditorScroll()
          wrapper.classList.remove('di-image--resizing')
          requestAnimationFrame(() => {
            restoreEditorScroll()
            requestAnimationFrame(() => {
              restoreEditorScroll()
              if (scrollContainer) {
                scrollContainer.classList.remove('di-richtext--image-resizing')
                scrollContainer.style.overflowAnchor = previousOverflowAnchor
              }
            })
          })
        }

        handle.addEventListener('pointermove', onMove)
        handle.addEventListener('pointerup', onUp)
        handle.addEventListener('pointercancel', onUp)
        activeResizeCleanup = () => {
          handle.removeEventListener('pointermove', onMove)
          handle.removeEventListener('pointerup', onUp)
          handle.removeEventListener('pointercancel', onUp)
          if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId)
          if (animationFrame != null) cancelAnimationFrame(animationFrame)
          previewClip.remove()
          media.style.visibility = ''
          wrapper.classList.remove('di-image--resizing')
          if (scrollContainer) {
            scrollContainer.classList.remove('di-richtext--image-resizing')
            scrollContainer.style.overflowAnchor = previousOverflowAnchor
          }
        }
      }

      return {
        dom: wrapper,
        update(updatedNode) {
          if (updatedNode.type.name !== currentNode.type.name) return false
          currentNode = updatedNode
          img.src = updatedNode.attrs.src
          if (sourceInput.value !== (updatedNode.attrs.source ?? '')) {
            sourceInput.value = updatedNode.attrs.source ?? ''
          }
          if (updatedNode.attrs.width) {
            img.setAttribute('width', updatedNode.attrs.width)
          } else {
            img.removeAttribute('width')
          }
          img.style.width = ''
          applyAlign()
          applyLayout()
          dividerHandle.setAttribute('aria-valuenow', String(Math.round(clampPairWidth(updatedNode.attrs.pairWidth))))
          return true
        },
        destroy() {
          activeResizeCleanup?.()
          layoutObserver?.disconnect()
          i18n.off('languageChanged', updateSourceInputLabels)
        },
        stopEvent(event) {
          const target = event.target as Node | null
          return event.target === sourceInput
            || (target != null && dividerHandle.contains(target))
            || (target instanceof HTMLElement && target.classList.contains('di-image__handle'))
        },
        ignoreMutation(mutation) {
          return mutation.target === sourceInput
            || (mutation.type === 'attributes' && wrapper.contains(mutation.target))
        },
      }
    }
  },
})
