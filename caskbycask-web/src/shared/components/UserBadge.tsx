import { useRef, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { UserRole } from '@/domain/auth/types/auth.types'
import LevelBadge from './LevelBadge'
import AdminIcon from './icons/AdminIcon'
import ProducerIcon from './icons/ProducerIcon'
import UserContextMenu from './UserContextMenu'
import DefaultAvatar from './DefaultAvatar'
import { getLevelInfo } from '@/domain/score/types/score.types'

export interface UserBadgeUser {
  id?: number
  nickname: string
  role: UserRole
  currentLevel?: number
  maturingPower?: number
  producerLogoUrl?: string
  nicknameFixed?: boolean | null
  profileImageUrl?: string | null
}

type BadgeSize = 'sm' | 'md' | 'lg' | 'xl'

interface Props {
  user: UserBadgeUser
  size?: BadgeSize
  /** 아바타(프로필 이미지)만 텍스트와 독립적으로 키우고 싶을 때 사용. 미지정 시 size 를 따름 */
  avatarSize?: BadgeSize
  showName?: boolean
  showScore?: boolean
  scoreBelow?: boolean
  /** 아바타(프로필 이미지) 노출 여부. false 면 닉네임+레벨만 표시(목록용) */
  showAvatar?: boolean
  /** 닉네임 옆에 레벨 이름(등급명) 텍스트 노출 (상세용) */
  showLevelName?: boolean
  /** 닉네임·레벨이름 텍스트 클래스 오버라이드 (미지정 시 size 기준) */
  nameClassName?: string
  /** 닉네임 옆 레벨 아이콘 크기(px) 오버라이드 (미지정 시 size 기준) */
  levelIconSize?: number
  /** 닉네임 아래에 추가로 표시할 둘째 줄(상세용: 작성시간·조회 등) */
  subLine?: ReactNode
  className?: string
  onlyReviews?: boolean
  disableNicknameHover?: boolean
}

const AVATAR_CLS: Record<string, string> = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-11 h-11',
}
const ICON_IN_AVATAR: Record<string, number> = { sm: 12, md: 14, lg: 18, xl: 24 }
const ICON_AFTER_NAME: Record<string, number> = { sm: 11, md: 13, lg: 15, xl: 16 }

// 포털 오버레이 크기 (px)
const OVERLAY_SIZE = 80

const TEXT_CLS: Record<string, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base font-semibold',
  xl: 'text-base font-semibold',
}
const SCORE_CLS: Record<string, string> = {
  sm: 'text-[10px]',
  md: 'text-xs',
  lg: 'text-sm',
  xl: 'text-sm',
}

export default function UserBadge({
  user,
  size = 'md',
  avatarSize,
  showName = true,
  showScore = false,
  scoreBelow = false,
  showAvatar = true,
  showLevelName = false,
  nameClassName,
  levelIconSize,
  subLine,
  className = '',
  onlyReviews,
  disableNicknameHover,
}: Props) {
  const avSize = avatarSize ?? size
  const twoLine = scoreBelow || !!subLine
  const nameCls = nameClassName ?? TEXT_CLS[size]
  const level = user.currentLevel ?? 1
  const levelName = getLevelInfo(level).name
  const isFixed = Boolean(user.nicknameFixed)
  const isSuperAdmin = user.role === 'SUPER_ADMIN'
  // 운영자는 아바타(프로필 이미지/기본 원)를 노출하지 않는다.
  const hasPhoto = Boolean(user.profileImageUrl) && !isSuperAdmin
  const showAvatarFinal = showAvatar && !isSuperAdmin
  // 운영자는 닉네임 대신 "운영자" 로 통일 표기 (별도 배지 없음).
  const displayName = isSuperAdmin ? '운영자' : user.nickname

  // 프로필 사진이 없는 회원 → 사용자별 고정 랜덤(색·아이콘) 기본 아바타
  const seed = (user.id != null ? String(user.id) : user.nickname) || '?'

  const tooltip =
    user.role === 'ADMIN'
      ? '관리자'
      : user.role === 'PARTNER'
        ? '증류소 담당자'
        : `Lv.${level}`

  const showTooltip = !disableNicknameHover && user.role !== 'ADMIN' && !isSuperAdmin

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
  ) : user.role === 'MEMBER' ? (
    <DefaultAvatar seed={seed} px={ICON_IN_AVATAR[avSize]} />
  ) : (
    <span className="flex items-center justify-center w-full h-full">
      {user.role === 'ADMIN' && <AdminIcon size={ICON_IN_AVATAR[avSize]} />}
      {user.role === 'PARTNER' && (
        <ProducerIcon logoUrl={user.producerLogoUrl} size={ICON_IN_AVATAR[avSize]} />
      )}
    </span>
  )

  // ─── 아바타 원 ───────────────────────────────────────────────
  const avatarBase = `${AVATAR_CLS[avSize]} rounded-full overflow-hidden flex items-center justify-center bg-neutral-100 flex-shrink-0 cursor-default`
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
      className={`${avatarBase} ring-1 ring-inset ring-neutral-800`}
    >
      {avatarInner}
    </span>
  )

  const scoreBelowEl = scoreBelow && user.role === 'MEMBER' && (
    <span className={`${SCORE_CLS[size]} text-amber-600 font-medium leading-none`}>
      Lv.{level}
    </span>
  )

  return (
    <span className={`relative inline-flex ${twoLine ? 'items-center gap-2' : 'items-center gap-1'} ${className}`}>
      {/* 아바타 — 툴팁 없음, hover 시 포털 오버레이 표시 (최고관리자는 미노출) */}
      {showAvatarFinal && avatarEl}

      {/* 포털 오버레이: body에 렌더링 → overflow:hidden 영향 없음 */}
      {showAvatarFinal && overlayPos && hasPhoto && createPortal(
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
      <span className={`${showTooltip ? 'group' : ''} inline-flex ${twoLine ? 'flex-col gap-0.5' : 'items-center gap-1'}`}>
        {/* 닉네임 행 */}
        <span className="inline-flex items-center gap-1">
          {showName && (
            <span
              className={[
                nameCls,
                'font-medium truncate max-w-[120px]',
                user.role === 'ADMIN'
                  ? 'text-blue-700'
                  : isSuperAdmin
                    ? 'text-rose-700'
                    : 'text-neutral-800',
              ].join(' ')}
            >
              {user.id ? (
                <UserContextMenu
                  nickname={user.nickname}
                  userId={user.id}
                  onlyReviews={onlyReviews}
                >
                  <span className={disableNicknameHover ? '' : 'hover:underline'}>{displayName}</span>
                </UserContextMenu>
              ) : (
                displayName
              )}
            </span>
          )}

          {showName && showLevelName && user.role === 'MEMBER' && (
            <span className={`${nameCls} text-neutral-500 font-normal flex-shrink-0`}>
              {levelName}
            </span>
          )}

          {showName && user.role === 'MEMBER' && (
            <LevelBadge level={level} size={levelIconSize ?? ICON_AFTER_NAME[size]} />
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

          {showScore && !scoreBelow && user.role === 'MEMBER' && (
            <span className={`${SCORE_CLS[size]} text-amber-600 font-medium`}>
              Lv.{level}
            </span>
          )}
        </span>

        {/* 레벨 두 번째 줄 */}
        {scoreBelowEl}

        {/* 커스텀 둘째 줄(상세: 레벨이름·Lv·작성시간 등) */}
        {!scoreBelow && subLine && (
          <span className={`${SCORE_CLS[size]} text-neutral-500 leading-tight`}>
            {subLine}
          </span>
        )}

        {/* 툴팁 — 닉네임·레벨 영역 hover 시만 (관리자/최고관리자 제외) */}
        {showTooltip && (
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
