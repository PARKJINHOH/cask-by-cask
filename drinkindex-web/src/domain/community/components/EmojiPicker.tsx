import { useEffect, useRef, useState } from 'react'
import { useEmojis } from '../hooks/useEmojis'
import type { CommunityEmoji } from '../types/community.types'

interface Props {
  onSelect: (emoji: CommunityEmoji) => void
  onClose: () => void
}

export default function EmojiPicker({ onSelect, onClose }: Props) {
  const { data: emojis = [] } = useEmojis()
  const ref = useRef<HTMLDivElement>(null)
  const [activeGroupId, setActiveGroupId] = useState<number | null | 'all'>('all')

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // 그룹 목록 추출 (null = 그룹 없음)
  const groupIds = Array.from(new Set(emojis.map((e) => e.groupId)))
  const hasGroups = groupIds.some((id) => id !== null)

  const displayed = activeGroupId === 'all'
    ? emojis
    : emojis.filter((e) => e.groupId === activeGroupId)

  return (
    <div
      ref={ref}
      className="absolute z-20 bottom-full mb-1 left-0 bg-white border border-neutral-200 rounded-xl shadow-lg min-w-[280px] max-w-[360px]"
    >
      {hasGroups && (
        <div className="flex gap-1 p-2 border-b border-neutral-100 overflow-x-auto">
          <button
            onClick={() => setActiveGroupId('all')}
            className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              activeGroupId === 'all' ? 'bg-primary-100 text-primary-700' : 'text-neutral-500 hover:bg-neutral-100'
            }`}
          >
            전체
          </button>
          {groupIds.filter((id) => id !== null).map((id) => {
            const groupName = emojis.find((e) => e.groupId === id)?.groupName ?? `그룹${id}`
            return (
              <button
                key={id}
                onClick={() => setActiveGroupId(id)}
                className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  activeGroupId === id ? 'bg-primary-100 text-primary-700' : 'text-neutral-500 hover:bg-neutral-100'
                }`}
              >
                {groupName}
              </button>
            )
          })}
        </div>
      )}
      <div className="p-2 flex flex-wrap gap-1.5">
        {displayed.map((emoji) => (
          <button
            key={emoji.id}
            type="button"
            title={emoji.label}
            onClick={() => { onSelect(emoji); onClose() }}
            className="w-16 h-16 flex flex-col items-center justify-center rounded-lg hover:bg-neutral-100 transition-colors gap-0.5"
          >
            {emoji.imageUrl
              ? <img src={emoji.imageUrl} alt={emoji.label} className="w-14 h-14 object-contain" />
              : <span className="text-2xl leading-none">{emoji.unicode}</span>
            }
          </button>
        ))}
        {displayed.length === 0 && (
          <p className="text-xs text-neutral-400 p-2">이모지 없음</p>
        )}
      </div>
    </div>
  )
}
