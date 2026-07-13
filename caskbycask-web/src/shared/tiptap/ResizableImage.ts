import Image from '@tiptap/extension-image'
import { mergeAttributes } from '@tiptap/core'
import { NodeSelection, Selection } from '@tiptap/pm/state'
import { Fragment, Slice } from '@tiptap/pm/model'
import { Plugin } from '@tiptap/pm/state'
import { dropPoint } from '@tiptap/pm/transform'

const INTERNAL_IMAGE_DRAG = 'application/x-caskbycask-image-pos'
const activeImageDragPositions = new WeakMap<object, number>()
const DEFAULT_PAIR_WIDTH = 50
const MIN_PAIR_WIDTH = 25
const MAX_PAIR_WIDTH = 75
const DEFAULT_PAIR_HEIGHT = 0.36

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

      // wrapper(블록, 정렬 담당) > frame(인라인블록) > img + 투명 드래그 표면
      const wrapper = document.createElement('div')
      wrapper.className = 'di-image'

      const frame = document.createElement('span')
      frame.className = 'di-image__frame'
      wrapper.appendChild(frame)

      const img = document.createElement('img')
      // crxMouse의 이미지 Super Drag와 겹치지 않도록 실제 img의 네이티브 드래그는 끈다.
      img.draggable = false
      img.src = currentNode.attrs.src
      if (currentNode.attrs.alt) img.alt = currentNode.attrs.alt
      if (currentNode.attrs.title) img.title = currentNode.attrs.title
      if (currentNode.attrs.width) img.setAttribute('width', currentNode.attrs.width)
      frame.appendChild(img)

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
        wrapper.style.width = isPair ? `${ownWidth}%` : ''
        frame.style.height = isPair ? `${Math.round(editorWidth * pairHeight)}px` : ''
        img.style.width = isPair ? '100%' : ''
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

      let lastTap = 0
      dragSurface.addEventListener('touchend', (e) => {
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
      wrapper.appendChild(dividerHandle)

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

        let finalWidth = clampPairWidth(currentNode.attrs.pairWidth)
        const onMove = (moveEvent: PointerEvent) => {
          finalWidth = preview(moveEvent.clientX)
        }
        const onUp = () => {
          document.removeEventListener('pointermove', onMove)
          document.removeEventListener('pointerup', onUp)
          commitPairWidth(finalWidth)
        }

        document.addEventListener('pointermove', onMove)
        document.addEventListener('pointerup', onUp)
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

      // 모바일 터치 드래그 앤 드롭 구현
      let originalPos: number | null = null
      let dragPreview: HTMLDivElement | null = null
      let currentDropPos: number | null = null
      let currentTouchPoint: { x: number; y: number } | null = null

      dragSurface.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return
        const touch = e.touches[0]
        currentTouchPoint = { x: touch.clientX, y: touch.clientY }

        const pos = getPos()
        if (typeof pos !== 'number') return
        originalPos = pos

        // 노드 선택
        editor.view.dispatch(
          editor.view.state.tr.setSelection(NodeSelection.create(editor.view.state.doc, pos))
        )

        e.preventDefault()

        // 터치 드래그용 반투명 썸네일 생성
        dragPreview = document.createElement('div')
        dragPreview.style.position = 'fixed'
        dragPreview.style.left = `${touch.clientX - 30}px`
        dragPreview.style.top = `${touch.clientY - 30}px`
        dragPreview.style.width = '60px'
        dragPreview.style.height = '60px'
        dragPreview.style.backgroundImage = `url(${img.src})`
        dragPreview.style.backgroundSize = 'cover'
        dragPreview.style.backgroundPosition = 'center'
        dragPreview.style.opacity = '0.7'
        dragPreview.style.pointerEvents = 'none'
        dragPreview.style.zIndex = '10000'
        dragPreview.style.borderRadius = '6px'
        dragPreview.style.border = '2px dashed #3b82f6'
        dragPreview.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        document.body.appendChild(dragPreview)
      }, { passive: false })

      dragSurface.addEventListener('touchmove', (e) => {
        if (e.touches.length !== 1 || !dragPreview || originalPos == null) return
        const touch = e.touches[0]
        currentTouchPoint = { x: touch.clientX, y: touch.clientY }

        // 미리보기 썸네일 위치 업데이트
        dragPreview.style.left = `${touch.clientX - 30}px`
        dragPreview.style.top = `${touch.clientY - 30}px`

        // 모바일 자동 스크롤
        const scrollContainer = editor.view.dom.parentElement
        if (scrollContainer) {
          const rect = scrollContainer.getBoundingClientRect()
          const topDist = touch.clientY - rect.top
          const bottomDist = rect.bottom - touch.clientY
          const threshold = 200
          if (topDist < threshold && topDist > 0) {
            scrollContainer.scrollTop -= 2
          } else if (bottomDist < threshold && bottomDist > 0) {
            scrollContainer.scrollTop += 2
          }
        }

        const coords = { left: touch.clientX, top: touch.clientY }
        try {
          const pmPosResult = editor.view.posAtCoords(coords)
          if (pmPosResult) {
            currentDropPos = pmPosResult.pos
            const resolved = editor.view.state.doc.resolve(currentDropPos)
            editor.view.dispatch(
              editor.view.state.tr.setSelection(Selection.near(resolved))
            )
          }
        } catch (err) {
          // 에디터 영역 밖은 무시
        }

        e.preventDefault()
      }, { passive: false })

      dragSurface.addEventListener('touchend', () => {
        if (dragPreview) {
          document.body.removeChild(dragPreview)
          dragPreview = null
        }

        if (originalPos != null && currentDropPos != null && currentDropPos !== originalPos) {
          const view = editor.view
          const state = view.state
          const nodeToMove = state.doc.nodeAt(originalPos)

          if (nodeToMove) {
            const touchedElement = currentTouchPoint
              ? document.elementFromPoint(currentTouchPoint.x, currentTouchPoint.y)
              : null
            const targetWrapper = (touchedElement as HTMLElement | null)?.closest('.di-image')
            let imageTargetPos: number | null = null
            if (targetWrapper && view.dom.contains(targetWrapper)) {
              state.doc.descendants((candidate, pos) => {
                if (imageTargetPos == null
                  && candidate.type.name === nodeToMove.type.name
                  && view.nodeDOM(pos) === targetWrapper) imageTargetPos = pos
              })
            }

            const targetNode = imageTargetPos != null ? state.doc.nodeAt(imageTargetPos) : null
            const targetRect = targetWrapper?.getBoundingClientRect()
            if (imageTargetPos != null
              && imageTargetPos !== originalPos
              && targetNode?.type.name === nodeToMove.type.name
              && targetRect
              && currentTouchPoint) {
              const pairId = createPairId()
              const placeLeft = currentTouchPoint.x < targetRect.left + targetRect.width / 2
              const tr = state.tr

              const clearPair = (existingPairId: string | null | undefined, exceptPos: number) => {
                if (!existingPairId) return
                const positions: number[] = []
                state.doc.descendants((candidate, pos) => {
                  if (candidate.type.name === nodeToMove.type.name
                    && candidate.attrs.pairId === existingPairId
                    && pos !== exceptPos) positions.push(pos)
                })
                positions.forEach((pos) => {
                  const mapped = tr.mapping.map(pos)
                  const candidate = tr.doc.nodeAt(mapped)
                  if (candidate?.type.name === nodeToMove.type.name) {
                    tr.setNodeMarkup(mapped, undefined, {
                      ...candidate.attrs,
                      layout: null,
                      pairId: null,
                      pairWidth: null,
                      pairHeight: null,
                    })
                  }
                })
              }

              clearPair(nodeToMove.attrs.pairId, originalPos)
              clearPair(targetNode.attrs.pairId, imageTargetPos)
              const sourceElement = view.nodeDOM(originalPos) as Element | null
              const pairHeight = calculatePairHeight(sourceElement, targetWrapper ?? null)
              tr.delete(originalPos, originalPos + nodeToMove.nodeSize)
              const mappedTargetPos = tr.mapping.map(imageTargetPos)
              const currentTarget = tr.doc.nodeAt(mappedTargetPos)
              if (currentTarget?.type.name === nodeToMove.type.name) {
                tr.setNodeMarkup(mappedTargetPos, undefined, {
                  ...currentTarget.attrs,
                  width: null,
                  layout: placeLeft ? 'half-right' : 'half-left',
                  pairId,
                  pairWidth: DEFAULT_PAIR_WIDTH,
                  pairHeight,
                })
                const insertPos = placeLeft ? mappedTargetPos : mappedTargetPos + currentTarget.nodeSize
                tr.insert(insertPos, nodeToMove.type.create({
                  ...nodeToMove.attrs,
                  width: null,
                  layout: placeLeft ? 'half-left' : 'half-right',
                  pairId,
                  pairWidth: DEFAULT_PAIR_WIDTH,
                  pairHeight,
                }))
                tr.setSelection(NodeSelection.create(tr.doc, insertPos))
                view.dispatch(tr)
              }
              originalPos = null
              currentDropPos = null
              currentTouchPoint = null
              return
            }

            let targetPos = currentDropPos
            const tr = state.tr

            if (nodeToMove.attrs.pairId) {
              const partnerPositions: number[] = []
              state.doc.descendants((candidate, pos) => {
                if (candidate.type.name === nodeToMove.type.name
                  && candidate.attrs.pairId === nodeToMove.attrs.pairId
                  && pos !== originalPos) partnerPositions.push(pos)
              })
              partnerPositions.forEach((pos) => {
                const mapped = tr.mapping.map(pos)
                const partner = tr.doc.nodeAt(mapped)
                if (partner?.type.name === nodeToMove.type.name) {
                  tr.setNodeMarkup(mapped, undefined, {
                    ...partner.attrs,
                    layout: null,
                    pairId: null,
                    pairWidth: null,
                    pairHeight: null,
                  })
                }
              })
            }

            // 원본 제거
            tr.delete(originalPos, originalPos + nodeToMove.nodeSize)

            // 제거 후 위치 보정
            if (targetPos > originalPos) {
              targetPos = Math.max(originalPos, targetPos - nodeToMove.nodeSize)
            }

            targetPos = Math.min(Math.max(0, targetPos), tr.doc.content.size)

            try {
              tr.insert(targetPos, nodeToMove.type.create({
                ...nodeToMove.attrs,
                layout: null,
                pairId: null,
                pairWidth: null,
                pairHeight: null,
              }))
              if (tr.doc.nodeAt(targetPos)?.type === nodeToMove.type) {
                tr.setSelection(NodeSelection.create(tr.doc, targetPos))
              }
              view.dispatch(tr)
            } catch (err) {
              console.error(err)
            }
          }
        }

        originalPos = null
        currentDropPos = null
        currentTouchPoint = null
      })

      // 모서리 리사이즈 핸들 4개
      const handlePositions = ['nw', 'ne', 'sw', 'se'] as const
      handlePositions.forEach((pos) => {
        const handle = document.createElement('span')
        handle.className = `di-image__handle di-image__handle--${pos}`
        handle.addEventListener('mousedown', (event) => startResize(event, pos))
        frame.appendChild(handle)
      })

      function startResize(event: MouseEvent, pos: (typeof handlePositions)[number]) {
        event.preventDefault()
        event.stopPropagation()

        const startX = event.clientX
        const rect = img.getBoundingClientRect()
        const startWidth = rect.width
        const maxWidth = wrapper.getBoundingClientRect().width || startWidth
        const growsRight = pos === 'ne' || pos === 'se'

        const onMove = (moveEvent: MouseEvent) => {
          const dx = moveEvent.clientX - startX
          const delta = growsRight ? dx : -dx
          const next = Math.min(Math.max(40, Math.round(startWidth + delta)), Math.round(maxWidth))
          img.style.width = `${next}px`
        }

        const onUp = () => {
          document.removeEventListener('mousemove', onMove)
          document.removeEventListener('mouseup', onUp)
          const finalWidth = Math.round(img.getBoundingClientRect().width)
          if (typeof getPos === 'function') {
            editor
              .chain()
              .command(({ tr }) => {
                const pos2 = getPos()
                if (pos2 == null) return false
                tr.setNodeMarkup(pos2, undefined, {
                  ...currentNode.attrs,
                  width: String(finalWidth),
                })
                return true
              })
              .run()
          }
        }

        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onUp)
      }

      return {
        dom: wrapper,
        update(updatedNode) {
          if (updatedNode.type.name !== currentNode.type.name) return false
          currentNode = updatedNode
          img.src = updatedNode.attrs.src
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
          layoutObserver?.disconnect()
        },
      }
    }
  },
})
