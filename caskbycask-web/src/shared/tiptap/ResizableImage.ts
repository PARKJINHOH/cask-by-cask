import Image from '@tiptap/extension-image'
import { NodeSelection, Selection } from '@tiptap/pm/state'

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
    }
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

      // 정렬(TextAlign이 image에 적용된 경우) 반영
      const applyAlign = () => {
        const align = (currentNode.attrs as Record<string, unknown>).textAlign as string | undefined
        wrapper.style.textAlign = align && align !== 'left' ? align : ''
      }
      applyAlign()

      // 드래그 이동 핸들 추가 (모바일/데스크톱 공용)
      const dragHandle = document.createElement('span')
      dragHandle.className = 'di-image__drag-handle'
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

      // 모바일 터치 드래그 앤 드롭 구현
      let originalPos: number | null = null
      let dragPreview: HTMLDivElement | null = null
      let currentDropPos: number | null = null

      dragHandle.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return
        const touch = e.touches[0]

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
            let targetPos = currentDropPos
            const tr = state.tr

            // 원본 제거
            tr.delete(originalPos, originalPos + nodeToMove.nodeSize)

            // 제거 후 위치 보정
            if (targetPos > originalPos) {
              targetPos = Math.max(originalPos, targetPos - nodeToMove.nodeSize)
            }

            targetPos = Math.min(Math.max(0, targetPos), tr.doc.content.size)

            try {
              tr.insert(targetPos, nodeToMove)
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
          return true
        },
      }
    }
  },
})
