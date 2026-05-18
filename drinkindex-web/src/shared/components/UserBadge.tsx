import type { UserRole } from '@/domain/auth/types/auth.types'
import LevelIcon from './icons/LevelIcon'
import AdminIcon from './icons/AdminIcon'
import DistilleryIcon from './icons/DistilleryIcon'

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
  nickname: string
  role: UserRole
  currentLevel?: number
  maturingPower?: number
  distilleryLogoUrl?: string
  nicknameFixed?: boolean | null
}

interface Props {
  user: UserBadgeUser
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
  showScore?: boolean
  className?: string
}

const ICON_SIZE: Record<string, number> = { sm: 14, md: 18, lg: 24 }
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
  const iconSize = ICON_SIZE[size]
  const level = user.currentLevel ?? 1
  const levelName = getLevelName(level)

  // 툴팁 텍스트 — ADMIN은 숙성력 미표시
  const tooltip =
    user.role === 'ADMIN'
      ? '관리자'
      : user.role === 'DISTILLERY'
        ? '증류소 담당자'
        : `Lv.${level} ${levelName} · 숙성력 ${(user.maturingPower ?? 0).toLocaleString()}`

  const isFixed = Boolean(user.nicknameFixed)

  return (
    <span
      className={`group relative inline-flex items-center gap-1 ${className}`}
      title={tooltip}
    >
      {/* 아이콘 — 고정닉이면 amber gradient ring */}
      {isFixed ? (
        <span className="p-[2px] rounded-full inline-flex items-center justify-center
          bg-gradient-to-br from-amber-400 via-orange-400 to-amber-600 flex-shrink-0">
          <span className="rounded-full bg-white p-[1px] inline-flex items-center justify-center">
            {user.role === 'ADMIN' && <AdminIcon size={iconSize} />}
            {user.role === 'DISTILLERY' && (
              <DistilleryIcon logoUrl={user.distilleryLogoUrl} size={iconSize} />
            )}
            {user.role === 'MEMBER' && <LevelIcon level={level} size={iconSize} />}
          </span>
        </span>
      ) : (
        <>
          {user.role === 'ADMIN' && <AdminIcon size={iconSize} />}
          {user.role === 'DISTILLERY' && (
            <DistilleryIcon logoUrl={user.distilleryLogoUrl} size={iconSize} />
          )}
          {user.role === 'MEMBER' && <LevelIcon level={level} size={iconSize} />}
        </>
      )}

      {/* 닉네임 */}
      {showName && (
        <span
          className={[
            TEXT_CLS[size],
            'font-medium truncate max-w-[120px]',
            user.role === 'ADMIN' ? 'text-blue-700' : 'text-neutral-800',
          ].join(' ')}
        >
          {user.nickname}
        </span>
      )}

      {/* 역할 배지 */}
      {user.role === 'ADMIN' && (
        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold
          rounded-full bg-blue-100 text-blue-700 leading-none flex-shrink-0">
          관리자
        </span>
      )}
      {user.role === 'DISTILLERY' && (
        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold
          rounded-full bg-emerald-100 text-emerald-700 leading-none flex-shrink-0">
          증류소
        </span>
      )}

      {/* 숙성력 수치 (showScore=true 시) */}
      {showScore && user.role === 'MEMBER' && (
        <span className={`${SCORE_CLS[size]} text-amber-600 font-medium`}>
          {(user.maturingPower ?? 0).toLocaleString()}
        </span>
      )}

      {/* 커스텀 툴팁 (hover) — ADMIN은 숙성력 없으므로 미표시 */}
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
  )
}
