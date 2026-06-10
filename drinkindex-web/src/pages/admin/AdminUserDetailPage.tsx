import { useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/domain/auth/store/authStore'
import { formatDate } from '@/shared/utils/format'
import Badge from '@/shared/components/Badge'
import Button from '@/shared/components/Button'
import Spinner from '@/shared/components/Spinner'
import Modal from '@/shared/components/Modal'
import AdminProducerSelector from '@/domain/producer/components/AdminProducerSelector'
import {
  useAdminUser,
  useChangeRole,
  useDeactivateUser,
  useActivateUser,
  useSuspendUser,
  useDeleteUser,
  useUpdateBoardPermissions,
} from '@/domain/admin/hooks/useAdminUsers'
import { useAdminRoleTypes } from '@/domain/admin/hooks/useAdminRoleTypes'
import type { AdminUser, AdminUserRole, AdminMenuKey, BoardType, SuspendUserRequest } from '@/domain/admin/types/admin.types'
import { BOARD_TYPE_LABELS, ALL_BOARD_TYPES } from '@/domain/admin/types/admin.types'

// ── 메뉴 구조 정의 ────────────────────────────────────────────

interface MenuTreeItem {
  label: string
  menuKey: AdminMenuKey | null
  subItem?: boolean
}

interface MenuTreeGroup {
  groupLabel: string
  items: MenuTreeItem[]
}

const MENU_TREE: MenuTreeGroup[] = [
  {
    groupLabel: '관리',
    items: [
      { label: '공지사항', menuKey: null },
      { label: '배너', menuKey: null },
      { label: '팝업', menuKey: null },
      { label: '약관 관리', menuKey: null },
    ],
  },
  {
    groupLabel: '회원',
    items: [
      { label: '회원 관리', menuKey: null },
      { label: '역할 관리', menuKey: null },
      { label: '신고 관리', menuKey: null },
      { label: '문의 관리', menuKey: null },
      { label: '메일 발송', menuKey: null },
      { label: '메일 이력', menuKey: null },
    ],
  },
  {
    groupLabel: '주류',
    items: [
      { label: '등록 요청', menuKey: 'SPIRIT_REQUESTS' },
      { label: '주류 관리', menuKey: 'SPIRITS' },
    ],
  },
  {
    groupLabel: '제조사',
    items: [
      { label: '생산자 등록 요청', menuKey: 'PRODUCER_REQUESTS' },
      { label: '생산자 관리', menuKey: 'PRODUCERS' },
    ],
  },
  {
    groupLabel: '레벨',
    items: [
      { label: '점수 설정', menuKey: null },
      { label: '레벨 설정', menuKey: null },
    ],
  },
  {
    groupLabel: '커뮤니티',
    items: [
      { label: '게시글 신고', menuKey: null },
      { label: '욕설 필터', menuKey: null },
      { label: '이모지 관리', menuKey: null },
      { label: '말머리 관리', menuKey: null },
    ],
  },
]

// ── 메뉴 트리 패널 (읽기 전용) ───────────────────────────────

interface MenuTreePanelProps {
  user: AdminUser
}

function MenuTreePanel({ user }: MenuTreePanelProps) {
  const isPartner = user.role === 'PARTNER'
  const allowedMenus: AdminMenuKey[] = user.allowedMenus ?? []

  return (
    <div className="w-72 flex-shrink-0 border-r border-neutral-200 flex flex-col">
      <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50">
        <p className="text-sm font-semibold text-neutral-700">메뉴 접근 권한</p>
        <p className="text-xs text-neutral-400 mt-0.5">
          {isPartner ? '역할 타입에 따라 자동 적용됩니다' : '관리자는 모든 메뉴에 접근 가능합니다'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {MENU_TREE.map((group) => (
          <div key={group.groupLabel} className="mb-0.5">
            <div className="flex items-center gap-2 px-3 py-1.5">
              <span className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                {group.groupLabel}
              </span>
            </div>
            {group.items.map((item) => {
              const isGrantable = item.menuKey !== null
              const isChecked = !isPartner || (item.menuKey !== null && allowedMenus.includes(item.menuKey))
              const isDimmed = isPartner && !isGrantable

              return (
                <div
                  key={item.label}
                  className={`flex items-center gap-2 py-1.5 ${item.subItem ? 'pl-10 pr-3' : 'pl-7 pr-3'}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled
                    readOnly
                    className={`w-3.5 h-3.5 flex-shrink-0 ${isDimmed ? 'opacity-20' : 'accent-primary-800 opacity-70'}`}
                  />
                  <span className={`text-sm ${isDimmed ? 'text-neutral-300' : isChecked ? 'text-neutral-700' : 'text-neutral-400'}`}>
                    {item.subItem && <span className="text-neutral-300 text-xs mr-1">└</span>}
                    {item.label}
                  </span>
                  {isPartner && !isGrantable && (
                    <span className="ml-auto text-[10px] text-neutral-300 font-medium">관리자 전용</span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 역할 변경 모달 ─────────────────────────────────────────────

const ROLE_LABEL: Record<AdminUserRole, string> = {
  SUPER_ADMIN: '최고관리자', ADMIN: '관리자', MODERATOR: '모더레이터', MEMBER: '회원', PARTNER: '파트너'
}
const CHANGEABLE_ROLES: AdminUserRole[] = ['MEMBER', 'ADMIN', 'MODERATOR', 'PARTNER']

function RoleChangeModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [role, setRole]           = useState<AdminUserRole>(user.role === 'SUPER_ADMIN' ? 'ADMIN' : user.role)
  const [roleTypeId, setRoleTypeId] = useState<number | null>(user.roleTypeId ?? null)
  const [producerId, setProducerId] = useState<number | null>(user.producerId ?? null)
  const [error, setError]         = useState('')
  const changeRole = useChangeRole()
  const { data: roleTypes = [] } = useAdminRoleTypes()

  const filteredRoleTypes = roleTypes.filter((rt) =>
    rt.isActive && (role === 'ADMIN' ? rt.systemRole === 'ADMIN' : rt.systemRole === 'PARTNER')
  )

  const handleSubmit = async () => {
    setError('')
    try {
      await changeRole.mutateAsync({
        id: user.id,
        data: { role, roleTypeId: roleTypeId ?? undefined, producerId: role === 'PARTNER' ? producerId : null },
      })
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? '역할 변경에 실패했습니다.')
    }
  }

  return (
    <Modal open onClose={onClose} title="등급 변경" size="sm">
      <div className="space-y-4">
        <div>
          <p className="text-xs text-neutral-500 mb-1">대상 회원</p>
          <p className="text-sm font-semibold">{user.nickname}</p>
          <p className="text-xs text-neutral-400">{user.email}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">역할</label>
          <div className="flex gap-2 flex-wrap">
            {CHANGEABLE_ROLES.map((r) => (
              <button key={r} type="button" onClick={() => { setRole(r); setRoleTypeId(null) }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  role === r ? 'bg-primary-800 text-white border-primary-800' : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-400'
                }`}>
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
        </div>
        {(role === 'ADMIN' || role === 'PARTNER') && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">역할 타입 (선택)</label>
            <select value={roleTypeId ?? ''} onChange={(e) => setRoleTypeId(e.target.value ? Number(e.target.value) : null)}
              className="w-full h-9 px-3 text-sm border border-neutral-300 rounded-lg bg-white
                focus:outline-none focus:ring-2 focus:ring-primary-400">
              <option value="">— 선택 안 함 —</option>
              {filteredRoleTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>{rt.name}</option>
              ))}
            </select>
          </div>
        )}
        {role === 'MODERATOR' && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            게시판 권한은 등급 변경 후 계정 상세에서 별도로 설정합니다.
          </div>
        )}
        {role === 'PARTNER' && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">담당 증류소 (선택)</label>
            <AdminProducerSelector value={producerId} defaultName={user.producerNameKo ?? undefined} onChange={setProducerId} />
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="secondary" size="sm" onClick={onClose}>취소</Button>
          <Button size="sm" onClick={handleSubmit} isLoading={changeRole.isPending}>저장</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── 징계 모달 ──────────────────────────────────────────────────

function SuspendModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [days, setDays] = useState(7)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const suspendUser = useSuspendUser()

  const handleSubmit = async () => {
    setError('')
    if (days < 1 || days > 365) { setError('정지 기간은 1~365일 사이여야 합니다.'); return }
    if (!reason.trim()) { setError('사유를 입력해주세요.'); return }
    try {
      await suspendUser.mutateAsync({ id: user.id, data: { days, reason: reason.trim() } as SuspendUserRequest })
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? '징계 처리에 실패했습니다.')
    }
  }

  return (
    <Modal open onClose={onClose} title="계정 징계" size="sm">
      <div className="space-y-4">
        <div>
          <p className="text-xs text-neutral-500 mb-1">대상 회원</p>
          <p className="text-sm font-semibold">{user.nickname}</p>
          <p className="text-xs text-neutral-400">{user.email}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">정지 기간 (일)</label>
          <div className="flex items-center gap-2">
            <input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))}
              className="w-24 h-9 px-3 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400" />
            <span className="text-sm text-neutral-500">일 동안 로그인 불가</span>
          </div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {[1, 3, 7, 14, 30].map((d) => (
              <button key={d} type="button" onClick={() => setDays(d)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                  days === d ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-neutral-600 border-neutral-200 hover:border-amber-500'
                }`}>
                {d}일
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            징계 사유 <span className="ml-1 text-xs text-neutral-400 font-normal">(이메일로 발송됩니다)</span>
          </label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={4}
            placeholder="징계 사유를 입력하세요."
            className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-400" />
          <p className="text-right text-xs text-neutral-400 mt-0.5">{reason.length}/500</p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="secondary" size="sm" onClick={onClose}>취소</Button>
          <Button size="sm" onClick={handleSubmit} isLoading={suspendUser.isPending} className="bg-amber-600 hover:bg-amber-700">징계 적용</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── 삭제 확인 모달 ─────────────────────────────────────────────

function DeleteModal({ user, onClose, onDeleted }: { user: AdminUser; onClose: () => void; onDeleted: () => void }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const deleteUser = useDeleteUser()

  const handleDelete = async () => {
    setError('')
    if (input !== user.nickname) { setError('닉네임이 일치하지 않습니다.'); return }
    try {
      await deleteUser.mutateAsync(user.id)
      onDeleted()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? '삭제에 실패했습니다.')
    }
  }

  return (
    <Modal open onClose={onClose} title="계정 삭제" size="sm">
      <div className="space-y-4">
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-semibold text-red-700 mb-1">이 작업은 되돌릴 수 없습니다.</p>
          <p className="text-xs text-red-600">계정과 모든 관련 데이터가 DB에서 영구 삭제됩니다.</p>
        </div>
        <div>
          <p className="text-xs text-neutral-500 mb-1">삭제할 계정</p>
          <p className="text-sm font-semibold">{user.nickname}</p>
          <p className="text-xs text-neutral-400">{user.email}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            확인을 위해 닉네임 <span className="font-bold text-neutral-900">"{user.nickname}"</span>을 입력하세요.
          </label>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={user.nickname}
            className="w-full h-9 px-3 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="secondary" size="sm" onClick={onClose}>취소</Button>
          <button onClick={handleDelete} disabled={input !== user.nickname || deleteUser.isPending}
            className="inline-flex items-center justify-center h-8 px-3 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {deleteUser.isPending ? '삭제 중...' : '영구 삭제'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── 활성여부 표시 ──────────────────────────────────────────────

function isSuspended(user: AdminUser) {
  return !!user.suspendedUntil && new Date(user.suspendedUntil) > new Date()
}

// ── 메인 페이지 ────────────────────────────────────────────────

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.user)

  // DISTILLERY 사용자는 접근 불가
  if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN')
    return <Navigate to="/admin" replace />

  const userId = Number(id)
  const { data: user, isLoading, refetch } = useAdminUser(userId)

  const deactivate          = useDeactivateUser()
  const activate            = useActivateUser()
  const updateBoardPerms    = useUpdateBoardPermissions()
  const [selectedBoards, setSelectedBoards] = useState<BoardType[]>([])
  const [boardsSaved, setBoardsSaved] = useState(false)

  // 모더레이터 게시판 권한 초기화
  const [boardsInitialized, setBoardsInitialized] = useState(false)

  const [roleModal, setRoleModal]       = useState(false)
  const [suspendModal, setSuspendModal] = useState(false)
  const [deleteModal, setDeleteModal]   = useState(false)

  // 모더레이터 게시판 권한 초기화
  if (user && !boardsInitialized) {
    setSelectedBoards((user.boardPermissions as BoardType[] | null) ?? [])
    setBoardsInitialized(true)
  }

  const handleSaveBoards = async () => {
    if (!user) return
    await updateBoardPerms.mutateAsync({ id: user.id, data: { boardTypes: selectedBoards } })
    setBoardsSaved(true)
    setTimeout(() => setBoardsSaved(false), 2000)
    refetch()
  }

  const handleDeactivate = async () => {
    if (!user || !confirm(`"${user.nickname}" 계정을 비활성화하시겠습니까?`)) return
    await deactivate.mutateAsync(user.id)
    refetch()
  }

  const handleActivate = async () => {
    if (!user || !confirm(`"${user.nickname}" 계정을 활성화하시겠습니까?`)) return
    await activate.mutateAsync(user.id)
    refetch()
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" className="text-primary-800" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-6 text-center text-neutral-500">사용자를 찾을 수 없습니다.</div>
    )
  }

  const suspended = isSuspended(user)

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-neutral-200 bg-white flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/admin/users')}
          className="inline-flex items-center gap-1 h-8 pl-2 pr-3 rounded-full border border-neutral-200
            bg-white text-sm text-neutral-600 shadow-sm transition-colors
            hover:border-primary-300 hover:text-primary-700 hover:bg-primary-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          회원 목록
        </button>
        <span className="text-neutral-300">/</span>
        <h1 className="text-base font-semibold text-neutral-900">회원 상세</h1>
      </div>

      {/* 본문 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 왼쪽: 메뉴 트리 (읽기 전용) */}
        <MenuTreePanel user={user} />

        {/* 오른쪽: 사용자 정보 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* 기본 정보 카드 */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50">
              <p className="text-sm font-semibold text-neutral-700">기본 정보</p>
            </div>
            <div className="divide-y divide-neutral-100">
              <InfoRow label="ID" value={`#${user.id}`} />
              <InfoRow label="이메일" value={user.email} />
              <InfoRow label="닉네임" value={user.nickname} />
              <div className="flex items-center px-5 py-3 gap-4">
                <span className="text-sm text-neutral-500 w-24 flex-shrink-0">역할</span>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      user.role === 'SUPER_ADMIN' ? 'danger'
                      : user.role === 'ADMIN' ? 'warning'
                      : user.role === 'MODERATOR' ? 'warning'
                      : user.role === 'PARTNER' ? 'neutral'
                      : 'neutral'
                    }
                    size="sm"
                  >
                    {ROLE_LABEL[user.role]}
                  </Badge>
                  {user.roleTypeName && (
                    <span className="px-2 py-0.5 rounded bg-primary-50 border border-primary-200
                      text-primary-900 text-[11px] font-medium">
                      {user.roleTypeName}
                    </span>
                  )}
                  {user.producerNameKo && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md
                      bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-medium">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M3 21h18M6 21V7l6-4 6 4v14M9 21v-6h6v6" />
                      </svg>
                      {user.producerNameKo}
                    </span>
                  )}
                </div>
              </div>
              <InfoRow label="가입일" value={formatDate(user.createdAt)} />
            </div>
          </div>

          {/* 계정 상태 카드 */}
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50">
              <p className="text-sm font-semibold text-neutral-700">계정 상태</p>
            </div>
            <div className="divide-y divide-neutral-100">
              <div className="flex items-center px-5 py-3 gap-4">
                <span className="text-sm text-neutral-500 w-24 flex-shrink-0">활성 여부</span>
                <Badge variant={user.isActive ? 'success' : 'neutral'} size="sm">
                  {user.isActive ? '활성' : '비활성'}
                </Badge>
              </div>
              {suspended && (
                <div className="flex items-start px-5 py-3 gap-4">
                  <span className="text-sm text-neutral-500 w-24 flex-shrink-0">징계</span>
                  <div>
                    <Badge variant="warning" size="sm">정지중</Badge>
                    <p className="text-xs text-neutral-500 mt-1">
                      ~{new Date(user.suspendedUntil!).toLocaleDateString('ko-KR', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })}
                    </p>
                    {user.suspendReason && (
                      <p className="text-xs text-neutral-400 mt-0.5 whitespace-pre-wrap">{user.suspendReason}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* MODERATOR 게시판 권한 설정 */}
          {user.role === 'MODERATOR' && (
            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50">
                <p className="text-sm font-semibold text-neutral-700">게시판 권한</p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  체크된 게시판의 게시글·댓글 숨김/복구 권한이 부여됩니다
                </p>
              </div>
              <div className="p-5 space-y-3">
                {ALL_BOARD_TYPES.map((bt) => (
                  <label key={bt} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedBoards.includes(bt)}
                      onChange={() =>
                        setSelectedBoards((prev) =>
                          prev.includes(bt) ? prev.filter((b) => b !== bt) : [...prev, bt],
                        )
                      }
                      className="w-4 h-4 accent-primary-800"
                    />
                    <span className="text-sm text-neutral-700">{BOARD_TYPE_LABELS[bt]}</span>
                  </label>
                ))}
                <div className="pt-2">
                  <Button
                    size="sm"
                    onClick={handleSaveBoards}
                    isLoading={updateBoardPerms.isPending}
                    className={boardsSaved ? 'bg-green-600 hover:bg-green-700' : ''}
                  >
                    {boardsSaved ? '저장됨 ✓' : '저장'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* PARTNER 역할 타입 안내 */}
          {user.role === 'PARTNER' && (
            <div className="bg-white rounded-xl border border-neutral-200 p-5">
              <p className="text-sm font-semibold text-neutral-700 mb-1">메뉴 접근 권한</p>
              {user.roleTypeName ? (
                <p className="text-xs text-neutral-500">
                  역할 타입 <strong className="text-primary-800">{user.roleTypeName}</strong>에 설정된 메뉴가 적용됩니다.
                  메뉴를 변경하려면 <strong>역할 관리</strong> 페이지에서 역할 타입을 수정하세요.
                </p>
              ) : (
                <p className="text-xs text-neutral-400">
                  역할 타입이 지정되지 않아 접근 가능한 메뉴가 없습니다. 등급 변경에서 역할 타입을 선택하세요.
                </p>
              )}
            </div>
          )}

          {/* 계정 관리 — SUPER_ADMIN은 표시하지 않음 */}
          {user.role !== 'SUPER_ADMIN' && (
            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50">
                <p className="text-sm font-semibold text-neutral-700">계정 관리</p>
              </div>
              <div className="p-5 flex flex-wrap gap-2">
                <button onClick={() => setRoleModal(true)}
                  className="inline-flex items-center h-8 px-3.5 text-sm font-medium rounded-lg border
                    border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50 transition-colors">
                  등급 변경
                </button>
                {user.isActive && (
                  <button onClick={() => setSuspendModal(true)}
                    className="inline-flex items-center h-8 px-3.5 text-sm font-medium rounded-lg border
                      border-amber-300 bg-white text-amber-700 hover:bg-amber-50 transition-colors">
                    징계 처리
                  </button>
                )}
                {user.isActive ? (
                  <button onClick={handleDeactivate} disabled={deactivate.isPending}
                    className="inline-flex items-center h-8 px-3.5 text-sm font-medium rounded-lg border
                      border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40">
                    비활성화
                  </button>
                ) : (
                  <button onClick={handleActivate} disabled={activate.isPending}
                    className="inline-flex items-center h-8 px-3.5 text-sm font-medium rounded-lg border
                      border-green-200 bg-white text-green-700 hover:bg-green-50 transition-colors disabled:opacity-40">
                    활성화
                  </button>
                )}
                <button onClick={() => setDeleteModal(true)}
                  className="inline-flex items-center h-8 px-3.5 text-sm font-medium rounded-lg
                    bg-red-600 text-white hover:bg-red-700 transition-colors">
                  계정 삭제
                </button>
              </div>
            </div>
          )}
          {user.role === 'SUPER_ADMIN' && (
            <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4">
              <p className="text-sm text-neutral-500">최고관리자 계정은 수정할 수 없습니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* 모달들 */}
      {roleModal && (
        <RoleChangeModal user={user} onClose={() => { setRoleModal(false); refetch() }} />
      )}
      {suspendModal && (
        <SuspendModal user={user} onClose={() => { setSuspendModal(false); refetch() }} />
      )}
      {deleteModal && (
        <DeleteModal
          user={user}
          onClose={() => setDeleteModal(false)}
          onDeleted={() => navigate('/admin/users')}
        />
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center px-5 py-3 gap-4">
      <span className="text-sm text-neutral-500 w-24 flex-shrink-0">{label}</span>
      <span className="text-sm text-neutral-800">{value}</span>
    </div>
  )
}
