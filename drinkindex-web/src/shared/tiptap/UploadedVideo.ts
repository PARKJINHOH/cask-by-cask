import { Node, mergeAttributes } from '@tiptap/react'

/**
 * 서버 업로드 동영상 노드 (YouTube/Vimeo iframe 임베드와 별개).
 * <div data-uploaded-video><video src="/api/posts/videos/..." controls></video></div>
 * 형태로 렌더링. 서버 HtmlSanitizer 가 /api/posts/videos/ 로 시작하는 src 만 허용.
 */
export const UploadedVideo = Node.create({
  name: 'uploadedVideo',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (el) =>
          el.querySelector('video')?.getAttribute('src') ?? el.getAttribute('src'),
        renderHTML: () => ({}),
      },
      mimeType: {
        default: 'video/mp4',
        parseHTML: (el) =>
          el.querySelector('video')?.getAttribute('type') ?? 'video/mp4',
        renderHTML: () => ({}),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-uploaded-video]' }]
  },

  renderHTML({ node }) {
    return [
      'div',
      mergeAttributes({ 'data-uploaded-video': '', class: 'my-4 rounded-lg overflow-hidden bg-neutral-900' }),
      [
        'video',
        {
          src: node.attrs.src,
          type: node.attrs.mimeType,
          controls: '',
          preload: 'metadata',
          class: 'w-full max-h-[480px] outline-none',
        },
      ],
    ]
  },

  addNodeView() {
    return ({ node }) => {
      const wrapper = document.createElement('div')
      wrapper.className = 'my-4 rounded-lg overflow-hidden bg-neutral-900 cursor-default'
      wrapper.setAttribute('data-uploaded-video', '')

      const video = document.createElement('video')
      video.src = node.attrs.src
      video.setAttribute('type', node.attrs.mimeType)
      video.controls = true
      video.preload = 'metadata'
      video.className = 'w-full max-h-[480px] outline-none'

      wrapper.appendChild(video)

      return {
        dom: wrapper,
        update(updatedNode) {
          if (updatedNode.type.name !== 'uploadedVideo') return false
          video.src = updatedNode.attrs.src
          return true
        },
      }
    }
  },
})
