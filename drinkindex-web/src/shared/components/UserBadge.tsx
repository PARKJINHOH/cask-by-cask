import { useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { UserRole } from '@/domain/auth/types/auth.types'
import LevelIcon from './icons/LevelIcon'
import AdminIcon from './icons/AdminIcon'
import DistilleryIcon from './icons/DistilleryIcon'
import UserContextMenu from './UserContextMenu'
import { useAuthStore } from '@/domain/auth/store/authStore'

const LEVEL_NAMES: Record<number, string> = {
  1: '몰트', 2: '스피릿', 3: '스카치', 4: '12yo',
  5: '15yo', 6: '18yo', 7: 'CS', 8: '21yo',
  9: '30yo', 10: '40yo', 11: '50yo',
}

function getLevelName(level?: number): string {
  if (!level) return ''
  return LEVEL_NAMES[level] ?? `Lv.${level}`
}

export interface UserBadgeUser {
  id?: number
  nickname: string
  role: UserRole
  currentLevel?: number
  maturingPower?: number
  distilleryLogoUrl?: string
  nicknameFixed?: boolean | null
  profileImageUrl?: string | null
}

interface Props {
  user: UserBadgeUser
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
  showScore?: boolean
  className?: string
}

const AVATAR_CLS: Record<string, string> = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
}
const ICON_IN_AVATAR: Record<string, number> = { sm: 12, md: 14, lg: 18 }
const ICON_AFTER_NAME: Record<string, number> = { sm: 11, md: 13, lg: 15 }

// 포털 오버레이 크기 (px)
const OVERLAY_SIZE = 80

const TEXT_CLS: Record<string, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base font-semibold',
}
const SCORE_CLS: Record<string, string> = {
  sm: 'text-[10px]',
  md: 'text-xs',
  lg: 'text-sm',
}

export default function UserBadge({
  user,
  size = 'md',
  showName = true,
  showScore = false,
  className = '',
}: Props) {
  const currentUser = useAuthStore((s) => s.user)
  const level = user.currentLevel ?? 1
  const levelName = getLevelName(level)
  const isFixed = Boolean(user.nicknameFixed)
  const hasPhoto = Boolean(user.profileImageUrl)

  const tooltip =
    user.role === 'ADMIN'
      ? '관리자'
      : user.role === 'PARTNER'
        ? '증류소 담당자'
        : `Lv.${level} ${levelName} · 숙성력 ${(user.maturingPower ?? 0).toLocaleString()}`

  // ─── 포털 오버레이 (position:fixed → 어떤 overflow도 뚫음) ──
  const avatarRef = useRef<HTMLSpanElement>(null)
  const [overlayPos, setOverlayPos] = useState<{ top: number; left: number } | null>(null)

  const handleMouseEnter = useCallback(() => {
    if (!hasPhoto || !avatarRef.current) return
    const rect = avatarRef.current.getBoundingClientRect()
    setOverlayPos({
      top: rect.top + rect.height / 2,
      left: rect.right + 6,
    })
  }, [hasPhoto])

  const handleMouseLeave = useCallback(() => {
    setOverlayPos(null)
  }, [])

  // ─── 아바타 내부 콘텐츠 ──────────────────────────────────────
  const avatarInner = hasPhoto ? (
    <img
      src={user.profileImageUrl!}
      alt=""
      loading="lazy"
      decoding="async"
      className="w-full h-full object-cover"
    />
  ) : (
    <span className="flex items-center justify-center w-full h-full">
      {user.role === 'ADMIN' && <AdminIcon size={ICON_IN_AVATAR[size]} />}
      {user.role === 'PARTNER' && (
        <DistilleryIcon logoUrl={user.distilleryLogoUrl} size={ICON_IN_AVATAR[size]} />
      )}
      {user.role === 'MEMBER' && <LevelIcon level={level} size={ICON_IN_AVATAR[size]} />}
    </span>
  )

  // ─── 아바타 원 ───────────────────────────────────────────────
  const avatarBase = `${AVATAR_CLS[size]} rounded-full overflow-hidden flex items-center justify-center bg-neutral-100 flex-shrink-0 cursor-default`
  const avatarEl = isFixed ? (
    <span
      ref={avatarRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="p-[2px] rounded-full inline-flex bg-gradient-to-br from-amber-400 via-orange-400
        to-amber-600 flex-shrink-0 cursor-default"
    >
      <span className={`${avatarBase} ring-[1.5px] ring-white`}>{avatarInner}</span>
    </span>
  ) : (
    <span
      ref={avatarRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={avatarBase}
    >
      {avatarInner}
    </span>
  )

  return (
    <span className={`relative inline-flex items-center gap-1 ${className}`}>
      {/* 아바타 — 툴팁 없음, hover 시 포털 오버레이 표시 */}
      {avatarEl}

      {/* 포털 오버레이: body에 렌더링 → overflow:hidden 영향 없음 */}
      {overlayPos && hasPhoto && createPortal(
        <span
          className="pointer-events-none fixed -translate-y-1/2 rounded-full overflow-hidden
            border-2 border-white shadow-xl ring-1 ring-neutral-200 z-[9999]"
          style={{ top: overlayPos.top, left: overlayPos.left, width: OVERLAY_SIZE, height: OVERLAY_SIZE }}
        >
          <img src={user.profileImageUrl!} alt="" className="w-full h-full object-cover" />
        </span>,
        document.body,
      )}

      {/* 닉네임·레벨·배지 묶음 — 이 영역 hover 시에만 툴팁 표시 */}
      <span className="group inline-flex items-center gap-1">
        {showName && (
          <span
            className={[
              TEXT_CLS[size],
              'font-medium truncate max-w-[120px]',
              user.role === 'ADMIN' ? 'text-blue-700' : 'text-neutral-800',
            ].join(' ')}
          >
            {user.id ? (
              <UserContextMenu
                nickname={user.nickname}
                userId={user.id}
                disabled={user.id === currentUser?.id}
              >
                <span className="hover:underline">{user.nickname}</span>
              </UserContextMenu>
            ) : (
              user.nickname
            )}
          </span>
        )}

        {showName && user.role === 'MEMBER' && hasPhoto && (
          <LevelIcon level={level} size={ICON_AFTER_NAME[size]} />
        )}

        {user.role === 'ADMIN' && (
          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold
            rounded-full bg-blue-100 text-blue-700 leading-none flex-shrink-0">
            관리자
          </span>
        )}
        {user.role === 'PARTNER' && (
          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold
            rounded-full bg-emerald-100 text-emerald-700 leading-none flex-shrink-0">
            증류소
          </span>
        )}

        {showScore && user.role === 'MEMBER' && (
          <span className={`${SCORE_CLS[size]} text-amber-600 font-medium`}>
            {(user.maturingPower ?? 0).toLocaleString()}
          </span>
        )}

        {/* 툴팁 — 닉네임·레벨 영역 hover 시만 */}
        {user.role !== 'ADMIN' && (
          <span
            className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5
              px-2 py-1 text-xs bg-neutral-800 text-white rounded-lg whitespace-nowrap
              opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50"
            role="tooltip"
          >
            {tooltip}
          </span>
        )}
      </span>
    </span>
  )
}
