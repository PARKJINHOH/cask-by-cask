import { Node, mergeAttributes } from '@tiptap/react'
import type { Editor } from '@tiptap/react'

/**
 * 영상 임베드 커스텀 노드 (YouTube / Vimeo) — 사용자/관리자 에디터 공용.
 * <div data-video-embed><iframe src="..."></iframe></div> 형태로 렌더링되며
 * 서버 HtmlSanitizer 가 iframe src 호스트(youtube/vimeo)만 허용한다.
 */
export const VideoEmbed = Node.create({
  name: 'videoEmbed',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
        // 저장 HTML: <div data-video-embed><iframe src="..."></iframe></div>
        // → 불러올 때 자식 iframe(또는 구버전 div[src])에서 src 복원
        parseHTML: (el) =>
          el.querySelector('iframe')?.getAttribute('src') || el.getAttribute('src'),
        // src 는 div 가 아닌 iframe 에 렌더링하므로 div 속성으로는 출력하지 않음
        renderHTML: () => ({}),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-video-embed]' }]
  },

  // [중요] getHTML() 직렬화 시 재생 가능한 iframe 을 포함해야 저장/표시가 동작한다.
  //   (NodeView 는 에디터 내부 표시용, renderHTML 은 저장/렌더용)
  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(
        { 'data-video-embed': '', class: 'relative pb-[56.25%] h-0 overflow-hidden rounded-lg my-4 bg-neutral-100' },
        HTMLAttributes,
      ),
      [
        'iframe',
        {
          src: node.attrs.src,
          class: 'absolute inset-0 w-full h-full rounded-lg',
          allowfullscreen: 'true',
          frameborder: '0',
          allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
        },
      ],
    ]
  },

  addNodeView() {
    return ({ node }) => {
      const wrapper = document.createElement('div')
      wrapper.className = 'relative pb-[56.25%] h-0 overflow-hidden rounded-lg my-4 bg-neutral-100'
      wrapper.setAttribute('data-video-embed', '')
      const iframe = document.createElement('iframe')
      iframe.src = node.attrs.src
      iframe.className = 'absolute inset-0 w-full h-full rounded-lg'
      iframe.allowFullscreen = true
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture')
      wrapper.appendChild(iframe)
      return { dom: wrapper }
    }
  },
})

/** YouTube/Vimeo 시청 URL → 임베드 URL 변환. 지원하지 않으면 null. */
export function toEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vi = url.match(/vimeo\.com\/(\d+)/)
  if (vi) return `https://player.vimeo.com/video/${vi[1]}`
  return null
}

/**
 * Enter 입력 처리: 현재 문단이 영상 URL "한 줄"이면 임베드 노드로 치환.
 * editorProps.handleKeyDown 에서 Enter 키일 때 호출하고, 변환되면 true(기본 동작 차단) 반환.
 */
export function handleVideoEnter(editor: Editor): boolean {
  const { selection } = editor.state
  const { $from, empty } = selection
  if (!empty) return false

  const parent = $from.parent
  if (parent.type.name !== 'paragraph') return false

  const text = parent.textContent.trim()
  // URL 한 줄만 (공백이 있으면 일반 문장으로 간주해 변환하지 않음)
  if (!text || /\s/.test(text)) return false

  const embedUrl = toEmbedUrl(text)
  if (!embedUrl) return false

  const from = $from.before()
  const to = $from.after()
  editor
    .chain()
    .focus()
    .insertContentAt({ from, to }, { type: 'videoEmbed', attrs: { src: embedUrl } })
    .run()
  return true
}
