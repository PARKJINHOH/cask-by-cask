import Image from '@tiptap/extension-image'
import { NodeSelection, Selection } from '@tiptap/pm/state'
import { Fragment, Slice } from '@tiptap/pm/model'
import { Plugin } from '@tiptap/pm/state'
import { dropPoint } from '@tiptap/pm/transform'

const INTERNAL_IMAGE_DRAG = 'application/x-caskbycask-image-pos'

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
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleDrop: (view, event) => {
            const rawSourcePos = event.dataTransfer?.getData(INTERNAL_IMAGE_DRAG)
            if (!rawSourcePos) return false

            event.preventDefault()
            const sourcePos = Number(rawSourcePos)
            const state = view.state
            const sourceNode = state.doc.nodeAt(sourcePos)
            if (!Number.isInteger(sourcePos) || sourceNode?.type.name !== this.name) return true

            const targetElement = (event.target as HTMLElement | null)?.closest('.di-image')
            let targetPos: number | null = null
            if (targetElement && view.dom.contains(targetElement)) {
              try {
                targetPos = view.posAtDOM(targetElement, 0)
              } catch {
                targetPos = null
              }
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
                  tr.setNodeMarkup(mapped, undefined, { ...node.attrs, layout: null, pairId: null })
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

              tr.delete(sourcePos, sourcePos + sourceNode.nodeSize)
              const mappedTargetPos = tr.mapping.map(targetPos)
              const currentTarget = tr.doc.nodeAt(mappedTargetPos)
              if (!currentTarget || currentTarget.type.name !== this.name) return true

              const sourceAttrs = {
                ...sourceNode.attrs,
                width: null,
                layout: placeLeft ? 'half-left' : 'half-right',
                pairId,
              }
              const targetAttrs = {
                ...currentTarget.attrs,
                width: null,
                layout: placeLeft ? 'half-right' : 'half-left',
                pairId,
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

      // wrapper(블록, 정렬 담당) > frame(인라인블록, 핸들 기준) > img
      const wrapper = document.createElement('div')
      wrapper.className = 'di-image'

      const frame = document.createElement('span')
      frame.className = 'di-image__frame'
      wrapper.appendChild(frame)

      const img = document.createElement('img')
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

      img.addEventListener('dblclick', (e) => {
        e.preventDefault()
        e.stopPropagation()
        dispatchImageEdit()
      })

      let lastTap = 0
      img.addEventListener('touchend', (e) => {
        const currentTime = new Date().getTime()
        const tapLength = currentTime - lastTap
        if (tapLength < 300 && tapLength > 0) {
          e.preventDefault()
          e.stopPropagation()
          dispatchImageEdit()
        }
        lastTap = currentTime
      })

      // 정렬(TextAlign이 image에 적용된 경우) 반영
      const applyAlign = () => {
        const align = (currentNode.attrs as Record<string, unknown>).textAlign as string | undefined
        wrapper.style.textAlign = align && align !== 'left' ? align : ''
      }
      applyAlign()

      const applyLayout = () => {
        const layout = currentNode.attrs.layout as string | null
        wrapper.dataset.imageLayout = layout ?? ''
        wrapper.classList.toggle('di-image--half-left', layout === 'half-left')
        wrapper.classList.toggle('di-image--half-right', layout === 'half-right')
      }
      applyLayout()

      // 드래그 이동 핸들 추가 (모바일/데스크톱 공용)
      const dragHandle = document.createElement('span')
      dragHandle.className = 'di-image__drag-handle'
      dragHandle.draggable = true
      dragHandle.title = '드래그하여 이미지 이동'
      dragHandle.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline><polyline points="15 19 12 22 9 19"></polyline><polyline points="19 9 22 12 19 15"></polyline><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="22"></line></svg>`
      frame.appendChild(dragHandle)

      // 데스크톱 마우스 드래그 시작 시 노드 선택
      dragHandle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return
        const pos = getPos()
        if (typeof pos === 'number') {
          editor.view.dispatch(
            editor.view.state.tr.setSelection(NodeSelection.create(editor.view.state.doc, pos))
          )
        }
      })

      dragHandle.addEventListener('dragstart', (e) => {
        const pos = getPos()
        if (typeof pos !== 'number' || !e.dataTransfer) return
        editor.view.dispatch(
          editor.view.state.tr.setSelection(NodeSelection.create(editor.view.state.doc, pos))
        )
        e.dataTransfer.setData(INTERNAL_IMAGE_DRAG, String(pos))
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setDragImage(img, Math.min(40, img.width / 2), Math.min(40, img.height / 2))
      })

      // 모바일 터치 드래그 앤 드롭 구현
      let originalPos: number | null = null
      let dragPreview: HTMLDivElement | null = null
      let currentDropPos: number | null = null
      let currentTouchPoint: { x: number; y: number } | null = null

      dragHandle.addEventListener('touchstart', (e) => {
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

      dragHandle.addEventListener('touchmove', (e) => {
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

      dragHandle.addEventListener('touchend', () => {
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
              try {
                imageTargetPos = view.posAtDOM(targetWrapper, 0)
              } catch {
                imageTargetPos = null
              }
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
                    tr.setNodeMarkup(mapped, undefined, { ...candidate.attrs, layout: null, pairId: null })
                  }
                })
              }

              clearPair(nodeToMove.attrs.pairId, originalPos)
              clearPair(targetNode.attrs.pairId, imageTargetPos)
              tr.delete(originalPos, originalPos + nodeToMove.nodeSize)
              const mappedTargetPos = tr.mapping.map(imageTargetPos)
              const currentTarget = tr.doc.nodeAt(mappedTargetPos)
              if (currentTarget?.type.name === nodeToMove.type.name) {
                tr.setNodeMarkup(mappedTargetPos, undefined, {
                  ...currentTarget.attrs,
                  width: null,
                  layout: placeLeft ? 'half-right' : 'half-left',
                  pairId,
                })
                const insertPos = placeLeft ? mappedTargetPos : mappedTargetPos + currentTarget.nodeSize
                tr.insert(insertPos, nodeToMove.type.create({
                  ...nodeToMove.attrs,
                  width: null,
                  layout: placeLeft ? 'half-left' : 'half-right',
                  pairId,
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
                  tr.setNodeMarkup(mapped, undefined, { ...partner.attrs, layout: null, pairId: null })
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
          return true
        },
      }
    }
  },
})
