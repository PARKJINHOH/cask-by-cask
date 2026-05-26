import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { useMessageStore } from '@/domain/message/store/messageStore'

interface Props {
  nickname: string
  userId: number
  children: ReactNode
  disabled?: boolean
}

export default function UserContextMenu({ nickname, userId, children, disabled }: Props) {
  const { isLoggedIn } = useAuthStore()
  const { openPopup } = useMessageStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLSpanElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (!triggerRef.current) return

    const rect = triggerRef.current.getBoundingClientRect()
    const menuWidth = 180
    const menuHeight = isLoggedIn ? 130 : 90

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
  }, [isLoggedIn])

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
          className="fixed z-[9999] bg-white border border-neutral-200 rounded-lg shadow-lg py-1 min-w-[160px]"
          style={{ top: pos.top, left: pos.left }}
        >
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-gray-50 w-full text-left"
            onClick={() => {
              setOpen(false)
              navigate(`/community/all?authorId=${userId}&authorNickname=${encodeURIComponent(nickname)}`)
            }}
          >
            📋 사용자 게시글 보기
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-gray-50 w-full text-left"
            onClick={() => {
              setOpen(false)
              navigate(`/community/all?commentAuthorId=${userId}&authorNickname=${encodeURIComponent(nickname)}`)
            }}
          >
            💬 사용자 댓글 보기
          </button>
          {isLoggedIn && (
            <>
              <div className="border-t border-gray-100 my-1" />
              <button
                className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 hover:bg-gray-50 w-full text-left"
                onClick={() => {
                  setOpen(false)
                  openPopup(nickname)
                }}
              >
                ✉ 쪽지 보내기
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}
