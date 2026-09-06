import { Node, mergeAttributes } from '@tiptap/core'
import i18n from '@/shared/utils/i18n'
import { formatAbv } from '@/domain/spirit/data/spiritLimits'

export interface ReviewEmbedAttrs {
  reviewId: string
  spiritId: string
  nameKo: string
  nameEn: string
  identifierKo: string
  identifierEn: string
  abv: number | null
  reviewCount: number
  noseScore: number | null
  tasteScore: number | null
  finishScore: number | null
  totalScore: number | null
  noseNote: string
  tasteNote: string
  finishNote: string
  comment: string
  /** 에디터 너비 대비 비율. 기본값은 100%. */
  width?: number
}

const MIN_CARD_WIDTH = 35
const MAX_CARD_WIDTH = 100
const CARD_WIDTH_STEP = 5

function normalizeCardWidth(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return MAX_CARD_WIDTH
  return Math.min(
    MAX_CARD_WIDTH,
    Math.max(MIN_CARD_WIDTH, Math.round(parsed / CARD_WIDTH_STEP) * CARD_WIDTH_STEP),
  )
}

function cardWidthClass(value: unknown) {
  return `di-review-width-${normalizeCardWidth(value)}`
}

function formatDecimal(value: unknown) {
  // 점수 미입력 리뷰는 null 로 온다 — Number(null) 이 0 이라 그냥 넘기면 0.0 점으로 찍힌다.
  if (value == null || value === '') return '-'
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return '-'
  return parsed.toFixed(1)
}

function localizedNames(attrs: Record<string, unknown>) {
  const isEn = i18n.language === 'en'
  const nameKo = String(attrs.nameKo ?? '')
  const nameEn = String(attrs.nameEn ?? '') || nameKo
  const identifierKo = String(attrs.identifierKo ?? '')
  const identifierEn = String(attrs.identifierEn ?? '') || identifierKo
  const primaryName = isEn ? nameEn : nameKo
  const secondaryName = isEn ? nameKo : nameEn
  const primaryIdentifier = isEn ? identifierEn : identifierKo
  const secondaryIdentifier = isEn ? identifierKo : identifierEn

  const join = (name: string, identifier: string) =>
    identifier ? `${name} — ${identifier}` : name

  return {
    primary: join(primaryName, primaryIdentifier),
    secondary: join(secondaryName, secondaryIdentifier),
  }
}

const roleSpan = (role: string, ...content: any[]): any[] => [
  'span',
  { 'data-review-role': role },
  ...content,
]

function sectionMarkup(
  section: 'nose' | 'taste' | 'finish' | 'overall',
  label: string,
  note: string,
  score?: number,
) {
  const heading = score == null
    ? roleSpan('section-heading', roleSpan('label', label))
    : roleSpan(
        'section-heading',
        roleSpan('label', label),
        roleSpan('section-score', formatDecimal(score)),
      )
  return [
    'span',
    { 'data-review-section': section },
    heading,
    roleSpan('note', note || i18n.t('editor.reviewCard.noNote')),
  ]
}

function reviewCardMarkup(attrs: Record<string, unknown>) {
  const names = localizedNames(attrs)
  const abv = attrs.abv == null
    ? null
    : roleSpan('abv', i18n.t('editor.reviewCard.abv', { value: formatAbv(attrs.abv as number | string) ?? '' }))
  const meta = roleSpan(
    'meta',
    ...(abv ? [abv] : []),
    roleSpan(
      'review-count',
      i18n.t('editor.reviewCard.reviewCount', { count: Number(attrs.reviewCount ?? 0) }),
    ),
  )

  return [
    roleSpan(
      'header',
      roleSpan(
        'heading',
        roleSpan('title', names.primary),
        ...(names.secondary && names.secondary !== names.primary
          ? [roleSpan('subtitle', names.secondary)]
          : []),
        meta,
      ),
      roleSpan(
        'total',
        roleSpan('total-label', i18n.t('editor.reviewCard.total')),
        roleSpan('total-score', formatDecimal(attrs.totalScore)),
      ),
    ),
    roleSpan(
      'sections',
      sectionMarkup(
        'nose',
        i18n.t('editor.reviewCard.nose'),
        String(attrs.noseNote ?? ''),
        Number(attrs.noseScore),
      ),
      sectionMarkup(
        'taste',
        i18n.t('editor.reviewCard.taste'),
        String(attrs.tasteNote ?? ''),
        Number(attrs.tasteScore),
      ),
      sectionMarkup(
        'finish',
        i18n.t('editor.reviewCard.finish'),
        String(attrs.finishNote ?? ''),
        Number(attrs.finishScore),
      ),
      sectionMarkup(
        'overall',
        i18n.t('editor.reviewCard.overall'),
        String(attrs.comment ?? ''),
      ),
    ),
  ]
}

function stringAttr(key: string, dataName: string) {
  return {
    default: '',
    parseHTML: (el: HTMLElement) => el.getAttribute(dataName) ?? '',
    renderHTML: (attrs: Record<string, unknown>) => {
      const value = attrs[key]
      return value == null || value === '' ? {} : { [dataName]: String(value) }
    },
  }
}

function numberAttr(key: string, dataName: string, defaultValue: number | null = null) {
  return {
    default: defaultValue,
    parseHTML: (el: HTMLElement) => {
      const value = el.getAttribute(dataName)
      return value == null || value === '' ? defaultValue : Number(value)
    },
    renderHTML: (attrs: Record<string, unknown>) => {
      const value = attrs[key]
      return value == null ? {} : { [dataName]: String(value) }
    },
  }
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    reviewEmbed: {
      insertReviewEmbed: (attrs: ReviewEmbedAttrs) => ReturnType
    }
  }
}

export const ReviewEmbed = Node.create({
  name: 'reviewEmbed',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      reviewId: stringAttr('reviewId', 'data-review-id'),
      spiritId: stringAttr('spiritId', 'data-spirit-id'),
      nameKo: stringAttr('nameKo', 'data-spirit-name-ko'),
      nameEn: stringAttr('nameEn', 'data-spirit-name-en'),
      identifierKo: stringAttr('identifierKo', 'data-spirit-identifier-ko'),
      identifierEn: stringAttr('identifierEn', 'data-spirit-identifier-en'),
      abv: numberAttr('abv', 'data-spirit-abv'),
      reviewCount: numberAttr('reviewCount', 'data-spirit-review-count', 0),
      noseScore: numberAttr('noseScore', 'data-review-nose-score'),
      tasteScore: numberAttr('tasteScore', 'data-review-taste-score'),
      finishScore: numberAttr('finishScore', 'data-review-finish-score'),
      totalScore: numberAttr('totalScore', 'data-review-total-score'),
      noseNote: stringAttr('noseNote', 'data-review-nose-note'),
      tasteNote: stringAttr('tasteNote', 'data-review-taste-note'),
      finishNote: stringAttr('finishNote', 'data-review-finish-note'),
      comment: stringAttr('comment', 'data-review-comment'),
      width: {
        default: MAX_CARD_WIDTH,
        parseHTML: (el: HTMLElement) => normalizeCardWidth(el.getAttribute('data-review-width')),
        renderHTML: (attrs: Record<string, unknown>) => ({
          'data-review-width': String(normalizeCardWidth(attrs.width)),
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'a.di-review-embed[data-review-id]' }]
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        class: ['di-review-embed', cardWidthClass(node.attrs.width)].join(' '),
      }),
      ...reviewCardMarkup(node.attrs),
    ]
  },

  addNodeView() {
    return ({ editor, node, getPos }) => {
      let currentNode = node
      const dom = document.createElement('a')

      const makeSpan = (role?: string, section?: string) => {
        const element = document.createElement('span')
        if (role) element.dataset.reviewRole = role
        if (section) element.dataset.reviewSection = section
        return element
      }

      const header = makeSpan('header')
      const heading = makeSpan('heading')
      const title = makeSpan('title')
      const subtitle = makeSpan('subtitle')
      const meta = makeSpan('meta')
      const abv = makeSpan('abv')
      const reviewCount = makeSpan('review-count')
      const total = makeSpan('total')
      const totalLabel = makeSpan('total-label')
      const totalScore = makeSpan('total-score')
      const sections = makeSpan('sections')

      heading.append(title, subtitle, meta)
      meta.append(abv, reviewCount)
      total.append(totalLabel, totalScore)
      header.append(heading, total)
      dom.append(header, sections)

      const sectionElements = (['nose', 'taste', 'finish', 'overall'] as const).map((section) => {
        const wrapper = makeSpan(undefined, section)
        const sectionHeading = makeSpan('section-heading')
        const label = makeSpan('label')
        const score = makeSpan('section-score')
        const note = makeSpan('note')
        sectionHeading.append(label, score)
        wrapper.append(sectionHeading, note)
        sections.append(wrapper)
        return { section, label, score, note }
      })

      const leftHandle = document.createElement('i')
      const rightHandle = document.createElement('i')
      leftHandle.className = 'di-review-embed__resize di-review-embed__resize--left'
      rightHandle.className = 'di-review-embed__resize di-review-embed__resize--right'
      leftHandle.setAttribute('aria-hidden', 'true')
      rightHandle.setAttribute('aria-hidden', 'true')
      dom.append(leftHandle, rightHandle)

      const applyNode = () => {
        const attrs = currentNode.attrs
        const width = normalizeCardWidth(attrs.width)
        const isSelected = dom.classList.contains('ProseMirror-selectednode')
        dom.className = ['di-review-embed', cardWidthClass(width)].join(' ')
        if (isSelected) dom.classList.add('ProseMirror-selectednode')
        dom.dataset.reviewId = String(attrs.reviewId ?? '')
        dom.dataset.spiritId = String(attrs.spiritId ?? '')
        dom.dataset.reviewWidth = String(width)
        dom.style.width = `${width}%`
        dom.style.maxWidth = '100%'

        const names = localizedNames(attrs)
        title.textContent = names.primary
        subtitle.textContent = names.secondary
        subtitle.hidden = !names.secondary || names.secondary === names.primary
        abv.textContent = attrs.abv == null
          ? ''
          : i18n.t('editor.reviewCard.abv', { value: formatAbv(attrs.abv as number | string) ?? '' })
        abv.hidden = attrs.abv == null
        reviewCount.textContent = i18n.t('editor.reviewCard.reviewCount', {
          count: Number(attrs.reviewCount ?? 0),
        })
        totalLabel.textContent = i18n.t('editor.reviewCard.total')
        totalScore.textContent = formatDecimal(attrs.totalScore)

        const values = {
          nose: { label: 'nose', score: attrs.noseScore, note: attrs.noseNote },
          taste: { label: 'taste', score: attrs.tasteScore, note: attrs.tasteNote },
          finish: { label: 'finish', score: attrs.finishScore, note: attrs.finishNote },
          overall: { label: 'overall', score: null, note: attrs.comment },
        } as const
        sectionElements.forEach((elements) => {
          const value = values[elements.section]
          elements.label.textContent = i18n.t(`editor.reviewCard.${value.label}`)
          elements.score.textContent = value.score == null ? '' : formatDecimal(value.score)
          elements.score.hidden = value.score == null
          elements.note.textContent = String(value.note ?? '') || i18n.t('editor.reviewCard.noNote')
        })
        return true
      }
      applyNode()

      const startResize = (event: PointerEvent, direction: 'left' | 'right') => {
        if (event.button !== 0 && event.pointerType === 'mouse') return
        event.preventDefault()
        event.stopPropagation()
        const startX = event.clientX
        const editorWidth = editor.view.dom.getBoundingClientRect().width
        const startPercent = (dom.getBoundingClientRect().width / editorWidth) * 100

        const onMove = (moveEvent: PointerEvent) => {
          const deltaPixels = direction === 'right'
            ? moveEvent.clientX - startX
            : startX - moveEvent.clientX
          const next = Math.min(
            MAX_CARD_WIDTH,
            Math.max(MIN_CARD_WIDTH, startPercent + (deltaPixels / editorWidth) * 100),
          )
          dom.style.width = `${next}%`
        }
        const onUp = () => {
          document.removeEventListener('pointermove', onMove)
          document.removeEventListener('pointerup', onUp)
          const width = normalizeCardWidth((dom.getBoundingClientRect().width / editorWidth) * 100)
          const pos = getPos()
          if (typeof pos === 'number') {
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
      const onLanguageChanged = () => applyNode()
      i18n.on('languageChanged', onLanguageChanged)

      return {
        dom,
        update(updatedNode) {
          if (updatedNode.type.name !== currentNode.type.name) return false
          currentNode = updatedNode
          return applyNode()
        },
        stopEvent(event) {
          return (event.target as HTMLElement | null)?.classList.contains('di-review-embed__resize') ?? false
        },
        destroy() {
          i18n.off('languageChanged', onLanguageChanged)
        },
      }
    }
  },

  renderText({ node }) {
    return `[${localizedNames(node.attrs).primary}]`
  },

  addCommands() {
    return {
      insertReviewEmbed:
        (attrs) =>
        ({ chain }) =>
          chain()
            .focus()
            .insertContent([
              { type: this.name, attrs: { ...attrs, width: attrs.width ?? MAX_CARD_WIDTH } },
              { type: 'paragraph' },
            ])
            .run(),
    }
  },
})
