import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { useMessageStore } from '@/domain/message/store/messageStore'
import { communityApi } from '@/domain/community/api/communityApi'
import { useToast } from '@/shared/hooks/useToast'

interface Props {
  nickname: string
  userId: number
  children: ReactNode
  disabled?: boolean
  onlyReviews?: boolean
}

export default function UserContextMenu({ nickname, userId, children, disabled, onlyReviews }: Props) {
  const { isLoggedIn, user: currentUser } = useAuthStore()
  const isMe = currentUser?.id === userId
  const { openPopup } = useMessageStore()
  const { showToast } = useToast()
  const qc = useQueryClient()
  const navigate = useNavigate()

  const blockMutation = useMutation({
    mutationFn: () => communityApi.toggleBlock(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['post'] })
      qc.invalidateQueries({ queryKey: ['posts'] })
      qc.invalidateQueries({ queryKey: ['comments'] })
      qc.invalidateQueries({ queryKey: ['blockedUsers'] })
      showToast('해당 사용자를 차단했습니다. 게시글·댓글이 목록에서 숨겨집니다.', 'success')
    },
  })
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLSpanElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!triggerRef.current) return

    const rect = triggerRef.current.getBoundingClientRect()
    const menuWidth = 180
    const showSelfActions = isLoggedIn && !isMe
    const menuHeight = onlyReviews ? 44 : (showSelfActions ? 175 : 90)

    let left = rect.right + 4
    let top = rect.top

    if (left + menuWidth > window.innerWidth - 8) {
      left = rect.left - menuWidth - 4
    }
    if (top + menuHeight > window.innerHeight - 8) {
      top = window.innerHeight - menuHeight - 8
    }

    setPos({ top, left })
    setOpen((v) => !v)
  }, [isLoggedIn, isMe, onlyReviews])

  const stopMenuEvent = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const closeAndNavigate = (e: React.MouseEvent, path: string) => {
    stopMenuEvent(e)
    setOpen(false)
    navigate(path)
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (disabled) return <>{children}</>

  return (
    <>
      <span ref={triggerRef} onClick={handleClick} className="cursor-pointer">
        {children}
      </span>

      {open && (
        <div
          ref={menuRef}
          className="fixed z-[9999] flex flex-col bg-white border border-neutral-200 rounded-lg shadow-lg py-1 w-max min-w-[160px]"
          style={{ top: pos.top, left: pos.left }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {onlyReviews ? (
            <button
              className="px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 w-full text-left whitespace-nowrap"
              onClick={(e) => closeAndNavigate(e, `/users/${userId}/reviews?nickname=${encodeURIComponent(nickname)}`)}
            >
              작성 리뷰 보기
            </button>
          ) : (
            <>
              <button
                className="px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 w-full text-left whitespace-nowrap"
                onClick={(e) => closeAndNavigate(e, `/community/all?authorId=${userId}&authorNickname=${encodeURIComponent(nickname)}`)}
              >
                사용자 게시글 보기
              </button>
              <button
                className="px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 w-full text-left whitespace-nowrap"
                onClick={(e) => closeAndNavigate(e, `/community/all?commentAuthorId=${userId}&authorNickname=${encodeURIComponent(nickname)}`)}
              >
                사용자 댓글 보기
              </button>
              <button
                className="px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 w-full text-left whitespace-nowrap"
                onClick={(e) => closeAndNavigate(e, `/users/${userId}/reviews?nickname=${encodeURIComponent(nickname)}`)}
              >
                작성 리뷰 보기
              </button>
              {isLoggedIn && !isMe && (
                <>
                  <div className="border-t border-neutral-100 my-1" />
                  <button
                    className="px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 w-full text-left whitespace-nowrap"
                    onClick={(e) => {
                      stopMenuEvent(e)
                      setOpen(false)
                      openPopup(nickname)
                    }}
                  >
                    쪽지 보내기
                  </button>
                  <button
                    className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left whitespace-nowrap"
                    onClick={(e) => {
                      stopMenuEvent(e)
                      setOpen(false)
                      if (window.confirm('이 사용자를 차단할까요?\n차단하면 이 사용자의 게시글·댓글 내용이 가려집니다.')) {
                        blockMutation.mutate()
                      }
                    }}
                  >
                    사용자 차단
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </>
  )
}
