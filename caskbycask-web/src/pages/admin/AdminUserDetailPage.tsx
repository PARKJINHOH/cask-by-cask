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
import type { AdminUser, AdminUserRole, BoardType, SuspendUserRequest } from '@/domain/admin/types/admin.types'
import {
  ROLE_LABELS, ASSIGNABLE_ROLES, BOARD_TYPE_LABELS, ALL_BOARD_TYPES,
} from '@/domain/admin/types/admin.types'
import {
  ADMIN_MENU_GROUPS, MEMBER_GROUP_LABEL, selectAllMenuPaths,
} from '@/domain/admin/constants/adminMenu'

// 담당 증류소 선택이 필요한 역할
const PRODUCER_ROLES: AdminUserRole[] = ['PARTNER', 'DISTILLERY_STAFF']

// ── 역할 및 메뉴 권한 카드 (인라인 편집) ─────────────────────────

function RolePermissionCard({ user }: { user: AdminUser }) {
  const [role, setRole]               = useState<AdminUserRole>(user.role)
  const [description, setDescription] = useState(user.description ?? '')
  const [producerId, setProducerId]   = useState<number | null>(user.producerId ?? null)
  const [selectedMenus, setSelectedMenus] = useState<string[]>(user.allowedMenus ?? [])
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const changeRole = useChangeRole()

  const isAdminRole  = role === 'ADMIN'
  const isMemberRole = role === 'MEMBER'
  const showProducer = PRODUCER_ROLES.includes(role)
  const selectAllPaths = selectAllMenuPaths()

  // 현재 역할이 할당 가능 목록(증류소 관계자 등)에 없으면(MODERATOR 등) 현재 역할을 옵션에 추가
  const roleOptions: AdminUserRole[] = ASSIGNABLE_ROLES.includes(user.role)
    ? ASSIGNABLE_ROLES
    : [user.role, ...ASSIGNABLE_ROLES]

  const isItemChecked = (path: string) =>
    isAdminRole ? true : selectedMenus.includes(path)

  const allChecked = isAdminRole
    || (selectAllPaths.length > 0 && selectAllPaths.every((p) => selectedMenus.includes(p)))

  const toggleItem = (path: string) => {
    setSelectedMenus((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path],
    )
  }

  const toggleAll = () => {
    setSelectedMenus((prev) => {
      const memberKept = prev.filter((p) => !selectAllPaths.includes(p))
      const everyChecked = selectAllPaths.every((p) => prev.includes(p))
      return everyChecked ? memberKept : [...memberKept, ...selectAllPaths]
    })
  }

  const handleSave = async () => {
    setError('')
    try {
      await changeRole.mutateAsync({
        id: user.id,
        data: {
          role,
          description: description.trim() || null,
          producerId: showProducer ? producerId : null,
          allowedMenus: isAdminRole || isMemberRole ? [] : selectedMenus,
        },
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? '저장에 실패했습니다.')
    }
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50">
        <p className="text-sm font-semibold text-neutral-700">역할 및 메뉴 권한</p>
        <p className="text-xs text-neutral-400 mt-0.5">역할을 지정하고, 접근 가능한 관리자 메뉴를 선택합니다.</p>
      </div>

      <div className="p-5 space-y-5">
        {/* 역할 */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">역할</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as AdminUserRole)}
            className="w-full max-w-xs h-9 px-3 text-sm border border-neutral-300 rounded-lg bg-white
              focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            {roleOptions.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </div>

        {/* 설명(메모) */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">
            설명 <span className="ml-1 text-xs text-neutral-400 font-normal">(관리자 메모)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="역할/권한에 대한 메모를 입력하세요."
            className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg resize-none
              focus:outline-none focus:ring-2 focus:ring-primary-400"
          />
          <p className="text-right text-xs text-neutral-400 mt-0.5">{description.length}/500</p>
        </div>

        {/* 담당 증류소 */}
        {showProducer && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">담당 증류소 (선택)</label>
            <AdminProducerSelector
              value={producerId}
              defaultName={user.producerNameKo ?? undefined}
              onChange={setProducerId}
            />
          </div>
        )}

        {/* 메뉴 접근 권한 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-neutral-700">메뉴 접근 권한</label>
            {isAdminRole && (
              <span className="text-xs text-neutral-400">관리자는 모든 메뉴에 접근 가능합니다</span>
            )}
          </div>

          {isMemberRole ? (
            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg text-xs text-neutral-500">
              회원 등급은 관리자 콘솔에 접근할 수 없습니다.
            </div>
          ) : (
            <div className="border border-neutral-200 rounded-lg overflow-hidden">
              {/* 전체 선택 */}
              <label className="flex items-center gap-2 px-4 py-2.5 bg-neutral-50 border-b border-neutral-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allChecked}
                  disabled={isAdminRole}
                  onChange={toggleAll}
                  className="w-4 h-4 accent-primary-800 disabled:opacity-50"
                />
                <span className="text-sm font-semibold text-neutral-700">전체 선택</span>
                <span className="text-[11px] text-neutral-400 font-normal">(회원 메뉴 그룹 제외)</span>
              </label>

              <div className="divide-y divide-neutral-100">
                {ADMIN_MENU_GROUPS.map((group) => {
                  const isMemberGroup = group.groupLabel === MEMBER_GROUP_LABEL
                  return (
                    <div key={group.groupLabel} className="px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                          {group.groupLabel}
                        </span>
                        {isMemberGroup && (
                          <span className="text-[10px] text-amber-600 font-medium">개별 선택</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                        {group.items.map((item) => (
                          <label key={item.path} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isItemChecked(item.path)}
                              disabled={isAdminRole}
                              onChange={() => toggleItem(item.path)}
                              className="w-3.5 h-3.5 accent-primary-800 disabled:opacity-50"
                            />
                            <span className="text-sm text-neutral-700">{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSave}
            isLoading={changeRole.isPending}
            className={saved ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {saved ? '저장됨 ✓' : '저장'}
          </Button>
        </div>
      </div>
    </div>
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

  const userId = Number(id)
  const { data: user, isLoading, refetch } = useAdminUser(userId)

  const deactivate          = useDeactivateUser()
  const activate            = useActivateUser()
  const updateBoardPerms    = useUpdateBoardPermissions()
  const [selectedBoards, setSelectedBoards] = useState<BoardType[]>([])
  const [boardsSaved, setBoardsSaved] = useState(false)
  const [boardsInitialized, setBoardsInitialized] = useState(false)

  const [suspendModal, setSuspendModal] = useState(false)
  const [deleteModal, setDeleteModal]   = useState(false)

  // 비관리자(파트너 등)는 회원 상세 접근 불가
  if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN')
    return <Navigate to="/admin" replace />

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
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">

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
                      : 'neutral'
                    }
                    size="sm"
                  >
                    {ROLE_LABELS[user.role]}
                  </Badge>
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
              <InfoRow
                label="가입 경로"
                value={user.signupMethod === 'NAVER' ? '네이버' : user.signupMethod === 'GOOGLE' ? '구글' : '이메일'}
              />
            </div>
          </div>

          {/* 역할 및 메뉴 권한 — SUPER_ADMIN은 편집 불가 */}
          {user.role !== 'SUPER_ADMIN' && (
            <RolePermissionCard key={user.id} user={user} />
          )}

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

          {/* 계정 관리 — SUPER_ADMIN은 표시하지 않음 */}
          {user.role !== 'SUPER_ADMIN' ? (
            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50">
                <p className="text-sm font-semibold text-neutral-700">계정 관리</p>
              </div>
              <div className="p-5 flex flex-wrap gap-2">
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
          ) : (
            <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4">
              <p className="text-sm text-neutral-500">최고관리자 계정은 수정할 수 없습니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* 모달들 */}
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
