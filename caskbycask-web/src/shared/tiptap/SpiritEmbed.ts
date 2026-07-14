import { Node, mergeAttributes } from '@tiptap/core'

// 본문 내 "술 카드" 임베드 — 인라인 atom 노드.
//   직렬화 결과(썸네일 있는 경우):
//     <a class="di-spirit-embed" data-spirit-id="123"
//        data-spirit-name="글렌피딕 12년" data-spirit-name-en="Glenfiddich 12"
//        data-spirit-category="WHISKY" data-spirit-thumbnail="https://..."
//        data-spirit-abv="40" data-spirit-review-count="12">
//       <img src="https://..." alt="" />
//       <span><span>글렌피딕 12년</span><span>40% · 리뷰 12</span></span>
//     </a>
//   썸네일이 없으면 img 대신 카테고리 이모지 span 으로 대체.
//   [보안] href 는 저장하지 않는다(jsoup 가 상대경로 href 를 제거하므로 무의미).
//          읽기 화면(RichContent)에서 data-spirit-id 로 SPA 이동을 위임한다.
//   모든 표시 데이터(썸네일/도수/리뷰수 포함)는 data-* 속성으로 왕복(round-trip)되어 sanitize 후에도 보존된다.

export const SPIRIT_CATEGORY_EMOJI: Record<string, string> = {
  WHISKY: '🥃',
  COGNAC: '🥃',
  WINE: '🍷',
  OTHER: '🍶',
}

export interface SpiritEmbedAttrs {
  id: string
  name: string
  nameEn: string
  category: string
  thumbnailUrl: string | null
  abv: number | null
  reviewCount: number
  width?: number | null
}

const MIN_CARD_WIDTH = 180
const MAX_CARD_WIDTH = 640
const CARD_WIDTH_STEP = 20

function normalizeCardWidth(value: unknown): number | null {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  return Math.min(
    MAX_CARD_WIDTH,
    Math.max(MIN_CARD_WIDTH, Math.round(parsed / CARD_WIDTH_STEP) * CARD_WIDTH_STEP),
  )
}

function cardWidthClass(value: unknown) {
  const width = normalizeCardWidth(value)
  return width ? `di-spirit-width-${width}` : ''
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    spiritEmbed: {
      insertSpiritEmbed: (attrs: SpiritEmbedAttrs) => ReturnType
    }
  }
}

export const SpiritEmbed = Node.create({
  name: 'spiritEmbed',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-spirit-id'),
        renderHTML: (attrs) => (attrs.id ? { 'data-spirit-id': String(attrs.id) } : {}),
      },
      name: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-spirit-name') ?? el.textContent ?? '',
        renderHTML: (attrs) => ({ 'data-spirit-name': attrs.name ?? '' }),
      },
      nameEn: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-spirit-name-en') ?? '',
        renderHTML: (attrs) => ({ 'data-spirit-name-en': attrs.nameEn ?? '' }),
      },
      category: {
        default: 'OTHER',
        parseHTML: (el) => el.getAttribute('data-spirit-category') ?? 'OTHER',
        renderHTML: (attrs) => ({ 'data-spirit-category': attrs.category ?? 'OTHER' }),
      },
      thumbnailUrl: {
        default: null,
        parseHTML: (el) =>
          el.getAttribute('data-spirit-thumbnail') ?? el.querySelector('img')?.getAttribute('src') ?? null,
        renderHTML: (attrs) => (attrs.thumbnailUrl ? { 'data-spirit-thumbnail': attrs.thumbnailUrl } : {}),
      },
      abv: {
        default: null,
        parseHTML: (el) => {
          const v = el.getAttribute('data-spirit-abv')
          return v ? Number(v) : null
        },
        renderHTML: (attrs) => (attrs.abv != null ? { 'data-spirit-abv': String(attrs.abv) } : {}),
      },
      reviewCount: {
        default: 0,
        parseHTML: (el) => {
          const v = el.getAttribute('data-spirit-review-count')
          return v ? Number(v) : 0
        },
        renderHTML: (attrs) => ({ 'data-spirit-review-count': String(attrs.reviewCount ?? 0) }),
      },
      width: {
        default: null,
        parseHTML: (el) => normalizeCardWidth(el.getAttribute('data-spirit-width')),
        renderHTML: (attrs) => {
          const width = normalizeCardWidth(attrs.width)
          return width ? { 'data-spirit-width': String(width) } : {}
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'a.di-spirit-embed[data-spirit-id]' }]
  },

  renderHTML({ HTMLAttributes, node }) {
    const emoji = SPIRIT_CATEGORY_EMOJI[node.attrs.category as string] ?? '🍶'
    const label = (node.attrs.name as string) || (node.attrs.nameEn as string) || '술'
    const thumbnailUrl = node.attrs.thumbnailUrl as string | null
    const abv = node.attrs.abv as number | null
    const reviewCount = (node.attrs.reviewCount as number) ?? 0
    const meta = abv != null ? `${abv}% · 리뷰 ${reviewCount}` : `리뷰 ${reviewCount}`
    const thumb = thumbnailUrl ? ['img', { src: thumbnailUrl, alt: '' }] : ['span', {}, emoji]

    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        class: ['di-spirit-embed', cardWidthClass(node.attrs.width)].filter(Boolean).join(' '),
      }),
      thumb,
      ['span', {}, ['span', {}, label], ['span', {}, meta]],
    ]
  },

  addNodeView() {
    return ({ editor, node, getPos }) => {
      let currentNode = node
      const dom = document.createElement('a')

      const thumb = currentNode.attrs.thumbnailUrl
        ? document.createElement('img')
        : document.createElement('span')
      const text = document.createElement('span')
      text.className = 'di-spirit-embed__content'
      const title = document.createElement('span')
      const meta = document.createElement('span')
      // 기존 카드의 span 기반 콘텐츠 선택자와 리사이즈 핸들이 충돌하지 않도록
      // 핸들은 콘텐츠에 사용하지 않는 i 요소로 분리한다.
      const leftHandle = document.createElement('i')
      const rightHandle = document.createElement('i')

      leftHandle.className = 'di-spirit-embed__resize di-spirit-embed__resize--left'
      rightHandle.className = 'di-spirit-embed__resize di-spirit-embed__resize--right'
      leftHandle.setAttribute('aria-hidden', 'true')
      rightHandle.setAttribute('aria-hidden', 'true')
      text.append(title, meta)
      dom.append(thumb, text, leftHandle, rightHandle)

      const applyNode = () => {
        const attrs = currentNode.attrs
        const width = normalizeCardWidth(attrs.width)
        const isSelected = dom.classList.contains('ProseMirror-selectednode')
        dom.className = ['di-spirit-embed', cardWidthClass(width)].filter(Boolean).join(' ')
        if (isSelected) dom.classList.add('ProseMirror-selectednode')
        dom.setAttribute('data-spirit-id', String(attrs.id ?? ''))
        if (width) {
          dom.setAttribute('data-spirit-width', String(width))
          dom.style.width = `${width}px`
          dom.style.maxWidth = '100%'
        } else {
          dom.removeAttribute('data-spirit-width')
          dom.style.width = ''
          dom.style.maxWidth = ''
        }

        if (attrs.thumbnailUrl) {
          if (thumb.tagName !== 'IMG') return false
          ;(thumb as HTMLImageElement).src = attrs.thumbnailUrl
          ;(thumb as HTMLImageElement).alt = ''
        } else {
          thumb.textContent = SPIRIT_CATEGORY_EMOJI[attrs.category as string] ?? '🍶'
        }
        title.textContent = attrs.name || attrs.nameEn || '술'
        meta.textContent = attrs.abv != null
          ? `${attrs.abv}% · 리뷰 ${attrs.reviewCount ?? 0}`
          : `리뷰 ${attrs.reviewCount ?? 0}`
        return true
      }
      applyNode()

      const startResize = (event: PointerEvent, direction: 'left' | 'right') => {
        if (event.button !== 0 && event.pointerType === 'mouse') return
        event.preventDefault()
        event.stopPropagation()
        const startX = event.clientX
        const startWidth = dom.getBoundingClientRect().width
        const editorWidth = editor.view.dom.getBoundingClientRect().width
        const maxWidth = Math.min(MAX_CARD_WIDTH, Math.max(MIN_CARD_WIDTH, editorWidth))

        const onMove = (moveEvent: PointerEvent) => {
          const delta = direction === 'right'
            ? moveEvent.clientX - startX
            : startX - moveEvent.clientX
          const next = Math.min(maxWidth, Math.max(MIN_CARD_WIDTH, startWidth + delta))
          dom.style.width = `${next}px`
          dom.style.maxWidth = '100%'
        }
        const onUp = () => {
          document.removeEventListener('pointermove', onMove)
          document.removeEventListener('pointerup', onUp)
          const width = normalizeCardWidth(dom.getBoundingClientRect().width)
          const pos = getPos()
          if (width && typeof pos === 'number') {
            const latest = editor.state.doc.nodeAt(pos)
            if (latest?.type.name === currentNode.type.name) {
              editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, {
                ...latest.attrs,
                width,
              }))
            }
          }
        }
        document.addEventListener('pointermove', onMove)
        document.addEventListener('pointerup', onUp)
      }

      leftHandle.addEventListener('pointerdown', (event) => startResize(event, 'left'))
      rightHandle.addEventListener('pointerdown', (event) => startResize(event, 'right'))

      return {
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== currentNode.type.name) return false
          currentNode = updatedNode
          return applyNode()
        },
        stopEvent(event) {
          return (event.target as HTMLElement | null)?.classList.contains('di-spirit-embed__resize') ?? false
        },
      }
    }
  },

  renderText({ node }) {
    const label = (node.attrs.name as string) || (node.attrs.nameEn as string) || '술'
    return `[${label}]`
  },

  addCommands() {
    return {
      insertSpiritEmbed:
        (attrs) =>
        ({ chain }) =>
          chain()
            .focus()
            .insertContent({ type: this.name, attrs })
            .insertContent(' ')
            .run(),
    }
  },
})
