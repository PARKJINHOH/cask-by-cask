import { useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import Badge from '@/shared/components/Badge'
import Button from '@/shared/components/Button'
import Input from '@/shared/components/Input'
import Spinner from '@/shared/components/Spinner'
import Pagination from '@/shared/components/Pagination'
import { formatDate } from '@/shared/utils/format'
import { useAdminUsers } from '@/domain/admin/hooks/useAdminUsers'
import type { AdminUser, AdminUserRole } from '@/domain/admin/types/admin.types'
import { ROLE_LABELS } from '@/domain/admin/types/admin.types'
import { scrollToPageTop } from '@/shared/utils/scrollToPageTop'

// ── 상수 ────────────────────────────────────────────────────────

const ROLE_LABEL = ROLE_LABELS

const ROLE_OPTIONS: AdminUserRole[] = ['MEMBER', 'PARTNER', 'IMPORTER', 'MODERATOR', 'ADMIN']

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
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const keywordParam = searchParams.get('keyword') ?? ''
  const roleParam = (searchParams.get('role') ?? '') as AdminUserRole | ''
  const activeParam = (searchParams.get('active') ?? '') as '' | 'true' | 'false'
  const [keyword, setKeyword]           = useState(keywordParam)
  const [roleFilter, setRoleFilter]     = useState<AdminUserRole | ''>(roleParam)
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>(activeParam)
  const pageRef = useRef<HTMLDivElement>(null)

  const page = Math.max(0, parseInt(searchParams.get('page') ?? '0', 10))
  const setPage = (p: number) =>
    setSearchParams(
      (prev) => { const n = new URLSearchParams(prev); n.set('page', String(p)); return n },
      { replace: true },
    )

  const detailState = { returnTo: `${location.pathname}${location.search}` }

  const { data, isLoading } = useAdminUsers({
    keyword: keywordParam,
    role: roleParam || undefined,
    isActive: activeParam === '' ? undefined : activeParam === 'true',
    page,
    size: 20,
  })

  const handleSearch = () => {
    const next = new URLSearchParams(searchParams)
    const trimmed = keyword.trim()
    if (trimmed) next.set('keyword', trimmed)
    else next.delete('keyword')
    if (roleFilter) next.set('role', roleFilter)
    else next.delete('role')
    if (activeFilter) next.set('active', activeFilter)
    else next.delete('active')
    next.set('page', '0')
    setSearchParams(next, { replace: true })
    scrollToPageTop(pageRef.current)
  }

  return (
    <div ref={pageRef} className="p-6 space-y-5">
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
                  <th className="hidden md:table-cell text-left px-4 py-3 text-neutral-500 font-medium w-16">ID</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">이메일</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">닉네임</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">등급</th>
                  <th className="hidden md:table-cell text-left px-4 py-3 text-neutral-500 font-medium">가입일</th>
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
                      onClick={() => navigate(`/admin/users/${user.id}`, { state: detailState })}
                    >
                      <td className="hidden md:table-cell px-4 py-3 text-neutral-400 tabular-nums">{user.id}</td>
                      <td className="px-4 py-3 text-neutral-600 max-w-[200px] truncate">
                        {user.email}
                      </td>
                      <td className="max-w-[180px] px-4 py-3 font-medium text-neutral-900">
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
                          {user.producerNameKo && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md
                              bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-medium leading-tight">
                              <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M3 21h18M6 21V7l6-4 6 4v14M9 21v-6h6v6" />
                              </svg>
                              {user.producerNameKo}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-neutral-500 tabular-nums text-xs">
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
