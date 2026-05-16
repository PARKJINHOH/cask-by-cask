import { useState } from 'react'
import { useToggleReaction } from '../hooks/useEmojis'
import { useEmojis } from '../hooks/useEmojis'
import type { EmojiReactionSummary } from '../types/community.types'

interface Props {
  commentId: number
  postId: number
  reactions: EmojiReactionSummary[]
  isLoggedIn: boolean
  onLoginNeeded: () => void
}

export default function EmojiReactionBar({ commentId, postId, reactions, isLoggedIn, onLoginNeeded }: Props) {
  const [localReactions, setLocalReactions] = useState<EmojiReactionSummary[]>(reactions)
  useEmojis()
  const toggleMutation = useToggleReaction(commentId, postId)

  // 낙관적 업데이트
  const handleToggle = (emojiId: number, unicode: string | null, imageUrl: string | null) => {
    if (!isLoggedIn) { onLoginNeeded(); return }

    const existing = localReactions.find((r) => r.emojiId === emojiId)
    if (existing) {
      setLocalReactions((prev) =>
        existing.isMyReaction
          ? prev.map((r) => r.emojiId === emojiId ? { ...r, count: r.count - 1, isMyReaction: false } : r).filter((r) => r.count > 0)
          : prev.map((r) => r.emojiId === emojiId ? { ...r, count: r.count + 1, isMyReaction: true } : r)
      )
    } else {
      setLocalReactions((prev) => [...prev, { emojiId, unicode, imageUrl, count: 1, isMyReaction: true }])
    }

    toggleMutation.mutate(emojiId, {
      onError: () => setLocalReactions(reactions), // 롤백
    })
  }

  if (localReactions.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1 mt-2">
      {localReactions.map((r) => (
        <button
          key={r.emojiId}
          type="button"
          onClick={() => handleToggle(r.emojiId, r.unicode, r.imageUrl)}
          className={[
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs transition-colors',
            r.isMyReaction
              ? 'border-primary-400 bg-primary-50 text-primary-600'
              : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-neutral-300',
          ].join(' ')}
        >
          {r.imageUrl
            ? <img src={r.imageUrl} alt="" className="w-3.5 h-3.5 object-contain" />
            : <span>{r.unicode}</span>
          }
          <span className="tabular-nums">{r.count}</span>
        </button>
      ))}
    </div>
  )
}
