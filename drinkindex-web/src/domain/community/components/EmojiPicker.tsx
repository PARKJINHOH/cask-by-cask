import { useEffect, useRef } from 'react'
import { useEmojis } from '../hooks/useEmojis'
import type { CommunityEmoji } from '../types/community.types'

interface Props {
  onSelect: (emoji: CommunityEmoji) => void
  onClose: () => void
}

export default function EmojiPicker({ onSelect, onClose }: Props) {
  const { data: emojis = [] } = useEmojis()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute z-20 bottom-full mb-1 left-0 bg-white border border-neutral-200 rounded-xl shadow-lg p-2 flex flex-wrap gap-1 min-w-[160px] max-w-[220px]"
    >
      {emojis.map((emoji) => (
        <button
          key={emoji.id}
          type="button"
          title={emoji.label}
          onClick={() => { onSelect(emoji); onClose() }}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors text-lg"
        >
          {emoji.imageUrl
            ? <img src={emoji.imageUrl} alt={emoji.label} className="w-5 h-5 object-contain" />
            : emoji.unicode
          }
        </button>
      ))}
      {emojis.length === 0 && (
        <p className="text-xs text-neutral-400 p-2">이모지 없음</p>
      )}
    </div>
  )
}
