import Image from '@tiptap/extension-image'

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
