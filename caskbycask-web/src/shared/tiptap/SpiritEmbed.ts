import { Node, mergeAttributes } from '@tiptap/core'

// 본문 내 "술 카드/칩" 임베드 — 인라인 atom 노드.
//   직렬화 결과:
//     <a class="di-spirit-embed" data-spirit-id="123"
//        data-spirit-name="글렌피딕 12년" data-spirit-name-en="Glenfiddich 12"
//        data-spirit-category="WHISKY">🥃 글렌피딕 12년</a>
//   [보안] href 는 저장하지 않는다(jsoup 가 상대경로 href 를 제거하므로 무의미).
//          읽기 화면(RichContent)에서 data-spirit-id 로 SPA 이동을 위임한다.
//   체크 상태/이동 모두 data-* 속성으로 왕복(round-trip)되어 sanitize 후에도 보존된다.

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
    }
  },

  parseHTML() {
    return [{ tag: 'a[data-spirit-id]' }]
  },

  renderHTML({ HTMLAttributes, node }) {
    const emoji = SPIRIT_CATEGORY_EMOJI[node.attrs.category as string] ?? '🍶'
    const label = (node.attrs.name as string) || (node.attrs.nameEn as string) || '술'
    return [
      'a',
      mergeAttributes(HTMLAttributes, { class: 'di-spirit-embed' }),
      `${emoji} ${label}`,
    ]
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
