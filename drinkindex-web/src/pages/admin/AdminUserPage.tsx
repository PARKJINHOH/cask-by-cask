import { useState } from 'react'
import Badge from '@/shared/components/Badge'
import Button from '@/shared/components/Button'
import Input from '@/shared/components/Input'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import Modal from '@/shared/components/Modal'
import { formatDate } from '@/shared/utils/format'
import {
  useAdminUsers,
  useChangeRole,
  useDeactivateUser,
} from '@/domain/admin/hooks/useAdminUsers'
import type { AdminUser, AdminUserRole } from '@/domain/admin/types/admin.types'

// ── 상수 ────────────────────────────────────────────────────────

const ROLE_LABEL: Record<AdminUserRole, string> = {
  ADMIN: '관리자',
  MEMBER: '회원',
  DISTILLERY: '증류소',
}

const ROLE_OPTIONS: AdminUserRole[] = ['MEMBER', 'ADMIN', 'DISTILLERY']

// ── 역할 변경 모달 ─────────────────────────────────────────────

interface RoleModalProps {
  user: AdminUser
  onClose: () => void
}

function RoleChangeModal({ user, onClose }: RoleModalProps) {
  const [role, setRole]               = useState<AdminUserRole>(user.role)
  const [distilleryId, setDistilleryId] = useState<string>(
    user.distilleryId ? String(user.distilleryId) : '',
  )
  const [error, setError] = useState('')
  const changeRole = useChangeRole()

  const handleSubmit = async () => {
    setError('')
    if (role === 'DISTILLERY' && !distilleryId.trim()) {
      setError('DISTILLERY 역할은 증류소 ID가 필요합니다.')
      return
    }
    try {
      await changeRole.mutateAsync({
        id: user.id,
        data: {
          role,
          distilleryId: role === 'DISTILLERY' ? Number(distilleryId) : null,
        },
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
          <p className="text-sm font-semibold text-neutral-900">{user.nickname}</p>
          <p className="text-xs text-neutral-400">{user.email}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">역할</label>
          <div className="flex gap-2 flex-wrap">
            {ROLE_OPTIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                  role === r
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-400'
                }`}
              >
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
        </div>

        {role === 'DISTILLERY' && (
          <Input
            label="증류소 ID"
            type="number"
            placeholder="증류소 ID를 입력하세요"
            value={distilleryId}
            onChange={(e) => setDistilleryId(e.target.value)}
            hint={user.distilleryNameKo ? `현재: ${user.distilleryNameKo}` : undefined}
          />
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="secondary" size="sm" onClick={onClose}>
            취소
          </Button>
          <Button size="sm" onClick={handleSubmit} isLoading={changeRole.isPending}>
            저장
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── 메인 페이지 ────────────────────────────────────────────────

export default function AdminUserPage() {
  // 검색 입력 (즉시 반영하지 않고 검색 버튼으로)
  const [keyword, setKeyword]         = useState('')
  const [roleFilter, setRoleFilter]   = useState<AdminUserRole | ''>('')
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('')
  const [page, setPage]               = useState(0)

  // 실제 쿼리에 사용되는 confirmed params
  const [queryParams, setQueryParams] = useState({
    keyword: '',
    role: undefined as AdminUserRole | undefined,
    isActive: undefined as boolean | undefined,
    page: 0,
    size: 20,
  })

  const [roleModalUser, setRoleModalUser] = useState<AdminUser | null>(null)
  const deactivate = useDeactivateUser()

  const { data, isLoading } = useAdminUsers({ ...queryParams, page })

  const handleSearch = () => {
    setPage(0)
    setQueryParams({
      keyword: keyword.trim() || '',
      role: roleFilter || undefined,
      isActive: activeFilter === '' ? undefined : activeFilter === 'true',
      page: 0,
      size: 20,
    })
  }

  const handleDeactivate = async (user: AdminUser) => {
    if (!confirm(`"${user.nickname}" 계정을 비활성화하시겠습니까?`)) return
    await deactivate.mutateAsync(user.id)
  }

  return (
    <div className="p-6 space-y-5">
      {/* 헤더 */}
      <h1 className="text-xl font-bold text-neutral-900">회원 관리</h1>

      {/* 필터 */}
      <div className="flex flex-wrap items-end gap-3 p-4 bg-white rounded-xl shadow-sm">
        <div className="flex-1 min-w-[180px]">
          <Input
            label="이메일 / 닉네임"
            placeholder="검색어 입력"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">역할</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as AdminUserRole | '')}
            className="h-9 px-3 text-sm border border-neutral-300 rounded-lg bg-white
              focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            <option value="">전체</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">활성여부</label>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as '' | 'true' | 'false')}
            className="h-9 px-3 text-sm border border-neutral-300 rounded-lg bg-white
              focus:outline-none focus:ring-2 focus:ring-primary-400"
          >
            <option value="">전체</option>
            <option value="true">활성</option>
            <option value="false">비활성</option>
          </select>
        </div>

        <Button size="sm" onClick={handleSearch}>검색</Button>
      </div>

      {/* 테이블 */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" className="text-primary-600" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium w-16">ID</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">이메일</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">닉네임</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">등급</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">가입일</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">활성여부</th>
                  <th className="text-right px-4 py-3 text-neutral-500 font-medium">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {!data || data.empty ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-neutral-400">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  data.content.map((user) => (
                    <tr key={user.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3 text-neutral-400 tabular-nums">{user.id}</td>
                      <td className="px-4 py-3 text-neutral-600 max-w-[200px] truncate">
                        {user.email}
                      </td>
                      <td className="px-4 py-3 font-medium text-neutral-900">{user.nickname}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={user.role === 'ADMIN' ? 'danger' : user.role === 'DISTILLERY' ? 'warning' : 'neutral'}
                          size="sm"
                        >
                          {ROLE_LABEL[user.role]}
                        </Badge>
                        {user.distilleryNameKo && (
                          <p className="text-xs text-neutral-400 mt-0.5">{user.distilleryNameKo}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-500 tabular-nums text-xs">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={user.isActive ? 'success' : 'neutral'} size="sm">
                          {user.isActive ? '활성' : '비활성'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => setRoleModalUser(user)}
                            className="text-xs text-primary-600 hover:text-primary-800 font-medium
                              transition-colors"
                          >
                            등급 변경
                          </button>
                          {user.isActive && (
                            <button
                              onClick={() => handleDeactivate(user)}
                              disabled={deactivate.isPending}
                              className="text-xs text-red-500 hover:text-red-700 font-medium
                                transition-colors disabled:opacity-40"
                            >
                              비활성화
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data && data.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={data.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {roleModalUser && (
        <RoleChangeModal user={roleModalUser} onClose={() => setRoleModalUser(null)} />
      )}
    </div>
  )
}
