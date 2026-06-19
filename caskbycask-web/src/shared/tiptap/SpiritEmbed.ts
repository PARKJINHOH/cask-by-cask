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
    }
  },

  parseHTML() {
    return [{ tag: 'a[data-spirit-id]' }]
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
      mergeAttributes(HTMLAttributes, { class: 'di-spirit-embed' }),
      thumb,
      ['span', {}, ['span', {}, label], ['span', {}, meta]],
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
