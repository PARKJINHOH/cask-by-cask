import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Badge from '@/shared/components/Badge'
import Button from '@/shared/components/Button'
import Input from '@/shared/components/Input'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import { formatDate } from '@/shared/utils/format'
import { useAdminUsers } from '@/domain/admin/hooks/useAdminUsers'
import type { AdminUser, AdminUserRole } from '@/domain/admin/types/admin.types'

// ── 상수 ────────────────────────────────────────────────────────

const ROLE_LABEL: Record<AdminUserRole, string> = {
  SUPER_ADMIN: '최고관리자',
  ADMIN: '관리자',
  MODERATOR: '모더레이터',
  MEMBER: '회원',
  PARTNER: '파트너',
}

const ROLE_OPTIONS: AdminUserRole[] = ['MEMBER', 'ADMIN', 'MODERATOR', 'PARTNER']

function isSuspended(user: AdminUser): boolean {
  return !!user.suspendedUntil && new Date(user.suspendedUntil) > new Date()
}

// ── 활성여부 셀 ────────────────────────────────────────────────

function ActiveStatusCell({ user }: { user: AdminUser }) {
  const suspended = isSuspended(user)

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Badge variant={user.isActive ? 'success' : 'neutral'} size="sm">
        {user.isActive ? '활성' : '비활성'}
      </Badge>
      {suspended && (
        <div className="relative group">
          <Badge variant="warning" size="sm" className="cursor-default">정지중</Badge>
          <div
            className="absolute left-0 bottom-full mb-1.5 hidden group-hover:block
              bg-neutral-800 text-white text-xs rounded-lg p-3 w-52 z-20 shadow-xl pointer-events-none"
          >
            <p className="font-medium mb-1">
              ~{new Date(user.suspendedUntil!).toLocaleDateString('ko-KR', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
            <p className="text-neutral-300 leading-relaxed whitespace-pre-wrap break-words">
              {user.suspendReason}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 메인 페이지 ────────────────────────────────────────────────

export default function AdminUserPage() {
  const navigate = useNavigate()
  const [keyword, setKeyword]           = useState('')
  const [roleFilter, setRoleFilter]     = useState<AdminUserRole | ''>('')
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('')
  const [page, setPage]                 = useState(0)

  const [queryParams, setQueryParams] = useState({
    keyword: '',
    role: undefined as AdminUserRole | undefined,
    isActive: undefined as boolean | undefined,
    page: 0,
    size: 20,
  })

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
          <Spinner size="lg" className="text-primary-800" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium w-16">ID</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">이메일</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">닉네임</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">등급</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">가입일</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">활성여부</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {!data || data.empty ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-neutral-400">
                      검색 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  data.content.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-neutral-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/admin/users/${user.id}`)}
                    >
                      <td className="px-4 py-3 text-neutral-400 tabular-nums">{user.id}</td>
                      <td className="px-4 py-3 text-neutral-600 max-w-[200px] truncate">
                        {user.email}
                      </td>
                      <td className="px-4 py-3 font-medium text-neutral-900">
                        {user.nickname}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          <Badge
                            variant={
                              user.role === 'SUPER_ADMIN' ? 'danger'
                              : user.role === 'ADMIN' ? 'warning'
                              : user.role === 'PARTNER' ? 'neutral'
                              : 'neutral'
                            }
                            size="sm"
                          >
                            {ROLE_LABEL[user.role]}
                          </Badge>
                          {user.roleTypeName && (
                            <span className="inline-flex px-1.5 py-0.5 rounded-md
                              bg-primary-50 border border-primary-100 text-primary-900 text-[11px] font-medium leading-tight">
                              {user.roleTypeName}
                            </span>
                          )}
                          {user.distilleryNameKo && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md
                              bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-medium leading-tight">
                              <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M3 21h18M6 21V7l6-4 6 4v14M9 21v-6h6v6" />
                              </svg>
                              {user.distilleryNameKo}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-500 tabular-nums text-xs">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <ActiveStatusCell user={user} />
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
    </div>
  )
}
