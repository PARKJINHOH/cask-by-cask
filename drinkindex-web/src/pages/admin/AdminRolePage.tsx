import { useState } from 'react'
import Badge from '@/shared/components/Badge'
import Button from '@/shared/components/Button'
import Modal from '@/shared/components/Modal'
import Spinner from '@/shared/components/Spinner'
import {
  useAdminRoleTypes,
  useCreateRoleType,
  useUpdateRoleType,
  useDeleteRoleType,
} from '@/domain/admin/hooks/useAdminRoleTypes'
import type { RoleType, RoleSystemType, AdminMenuKey, CreateRoleTypeRequest, UpdateRoleTypeRequest } from '@/domain/admin/types/admin.types'
import { ADMIN_MENU_KEY_LABELS, ALL_ADMIN_MENU_KEYS } from '@/domain/admin/types/admin.types'

// ── 상수 ──────────────────────────────────────────────────────

const SYSTEM_ROLE_LABEL: Record<RoleSystemType, string> = {
  ADMIN: '관리자',
  PARTNER: '파트너',
}

// ── 메뉴 선택 섹션 ─────────────────────────────────────────────

function MenuSelector({
  systemRole,
  selected,
  onChange,
}: {
  systemRole: RoleSystemType
  selected: AdminMenuKey[]
  onChange: (keys: AdminMenuKey[]) => void
}) {
  if (systemRole === 'ADMIN') {
    return (
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
        관리자 계열은 모든 메뉴에 접근 가능합니다.
      </div>
    )
  }

  const toggle = (key: AdminMenuKey) => {
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key])
  }

  return (
    <div className="space-y-1.5">
      {ALL_ADMIN_MENU_KEYS.map((key) => (
        <label key={key} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border
          border-neutral-200 hover:border-primary-300 hover:bg-primary-50/40 cursor-pointer transition-colors">
          <input
            type="checkbox"
            checked={selected.includes(key)}
            onChange={() => toggle(key)}
            className="w-4 h-4 accent-primary-600"
          />
          <span className="text-sm text-neutral-700">{ADMIN_MENU_KEY_LABELS[key]}</span>
        </label>
      ))}
    </div>
  )
}

// ── 역할 폼 모달 ───────────────────────────────────────────────

interface RoleFormModalProps {
  editTarget?: RoleType
  onClose: () => void
}

function RoleFormModal({ editTarget, onClose }: RoleFormModalProps) {
  const isEdit = !!editTarget
  const [name, setName]             = useState(editTarget?.name ?? '')
  const [description, setDescription] = useState(editTarget?.description ?? '')
  const [systemRole, setSystemRole] = useState<RoleSystemType>(editTarget?.systemRole ?? 'PARTNER')
  const [menus, setMenus]           = useState<AdminMenuKey[]>(editTarget?.allowedMenus ?? [])
  const [isActive, setIsActive]     = useState(editTarget?.isActive ?? true)
  const [sortOrder, setSortOrder]   = useState(editTarget?.sortOrder ?? 0)
  const [error, setError]           = useState('')

  const createRole = useCreateRoleType()
  const updateRole = useUpdateRoleType()

  const handleSubmit = async () => {
    setError('')
    if (!name.trim()) { setError('역할 이름을 입력해주세요.'); return }
    try {
      if (isEdit) {
        const req: UpdateRoleTypeRequest = {
          name: name.trim(),
          description: description.trim() || undefined,
          allowedMenus: systemRole === 'ADMIN' ? [] : menus,
          isActive,
          sortOrder,
        }
        await updateRole.mutateAsync({ id: editTarget.id, data: req })
      } else {
        const req: CreateRoleTypeRequest = {
          name: name.trim(),
          description: description.trim() || undefined,
          systemRole,
          allowedMenus: systemRole === 'ADMIN' ? [] : menus,
          sortOrder,
        }
        await createRole.mutateAsync(req)
      }
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? '저장에 실패했습니다.')
    }
  }

  const isPending = createRole.isPending || updateRole.isPending

  return (
    <Modal open onClose={onClose} title={isEdit ? '역할 수정' : '역할 추가'} size="sm">
      <div className="space-y-4">
        {/* 계열 선택 (신규만) */}
        {!isEdit && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">계열</label>
            <div className="flex gap-2">
              {(['ADMIN', 'PARTNER'] as RoleSystemType[]).map((r) => (
                <button key={r} type="button" onClick={() => setSystemRole(r)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    systemRole === r
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-neutral-600 border-neutral-200 hover:border-primary-400'
                  }`}>
                  {SYSTEM_ROLE_LABEL[r]}
                </button>
              ))}
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              {systemRole === 'ADMIN'
                ? '관리자 계열은 관리자 콘솔 전체 접근 권한을 가집니다.'
                : '파트너 계열은 선택한 메뉴에만 접근 가능합니다.'}
            </p>
          </div>
        )}

        {/* 역할명 */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">역할명 *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100}
            placeholder="예: 증류소 관계자, 수입사, 콘텐츠 관리자"
            className="w-full h-9 px-3 text-sm border border-neutral-300 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-primary-400" />
        </div>

        {/* 설명 */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">설명</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500}
            placeholder="역할에 대한 간단한 설명 (선택)"
            className="w-full h-9 px-3 text-sm border border-neutral-300 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-primary-400" />
        </div>

        {/* 메뉴 접근 권한 */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1.5">메뉴 접근 권한</label>
          <MenuSelector
            systemRole={isEdit ? editTarget.systemRole : systemRole}
            selected={menus}
            onChange={setMenus}
          />
        </div>

        {/* 수정 모드: 활성여부 + 정렬 */}
        {isEdit && (
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 accent-primary-600" />
              <span className="text-sm text-neutral-700">활성</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-700">정렬 순서</span>
              <input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-16 h-8 px-2 text-sm border border-neutral-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-primary-400" />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="secondary" size="sm" onClick={onClose}>취소</Button>
          <Button size="sm" onClick={handleSubmit} isLoading={isPending}>저장</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── 메인 페이지 ────────────────────────────────────────────────

export default function AdminRolePage() {
  const { data: roles, isLoading } = useAdminRoleTypes()
  const deleteRole = useDeleteRoleType()
  const [formTarget, setFormTarget] = useState<RoleType | null | 'new'>(null)

  const handleDelete = async (role: RoleType) => {
    if (!confirm(`"${role.name}" 역할을 삭제하시겠습니까?\n해당 역할을 사용 중인 계정이 없을 때만 삭제 가능합니다.`)) return
    try {
      await deleteRole.mutateAsync(role.id)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(msg ?? '삭제에 실패했습니다.')
    }
  }

  return (
    <div className="p-6 space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">역할 관리</h1>
          <p className="text-sm text-neutral-500 mt-0.5">사용자에게 부여할 역할(등급)을 관리합니다.</p>
        </div>
        <Button size="sm" onClick={() => setFormTarget('new')}>+ 역할 추가</Button>
      </div>

      {/* 안내 */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 space-y-1">
        <p className="font-semibold">시스템 기본 역할 안내</p>
        <p>• <strong>최고관리자</strong>: 시스템에 1명, 모든 권한 (여기서 관리하지 않습니다)</p>
        <p>• <strong>회원</strong>: 일반 회원 (여기서 관리하지 않습니다)</p>
        <p>• 아래 역할들은 관리자 콘솔 접근 계정에 부여됩니다.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" className="text-primary-600" /></div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="text-left px-4 py-3 text-neutral-500 font-medium w-12">ID</th>
                <th className="text-left px-4 py-3 text-neutral-500 font-medium">역할명</th>
                <th className="text-left px-4 py-3 text-neutral-500 font-medium">계열</th>
                <th className="text-left px-4 py-3 text-neutral-500 font-medium">접근 메뉴</th>
                <th className="text-left px-4 py-3 text-neutral-500 font-medium">상태</th>
                <th className="text-right px-4 py-3 text-neutral-500 font-medium">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {!roles || roles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-neutral-400">
                    등록된 역할이 없습니다. 역할을 추가해주세요.
                  </td>
                </tr>
              ) : (
                roles.map((role) => (
                  <tr key={role.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 text-neutral-400 tabular-nums">{role.id}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-neutral-900">{role.name}</p>
                      {role.description && (
                        <p className="text-xs text-neutral-400 mt-0.5">{role.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={role.systemRole === 'ADMIN' ? 'danger' : 'warning'} size="sm">
                        {SYSTEM_ROLE_LABEL[role.systemRole]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {role.systemRole === 'ADMIN' ? (
                        <span className="text-xs text-neutral-400">전체</span>
                      ) : role.allowedMenus.length === 0 ? (
                        <span className="text-xs text-neutral-300">없음</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {role.allowedMenus.map((key) => (
                            <span key={key} className="px-1.5 py-0.5 rounded bg-primary-50
                              text-primary-700 text-[11px] font-medium border border-primary-100">
                              {ADMIN_MENU_KEY_LABELS[key]}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={role.isActive ? 'success' : 'neutral'} size="sm">
                        {role.isActive ? '활성' : '비활성'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setFormTarget(role)}
                          className="inline-flex items-center h-7 px-2.5 text-xs font-medium rounded-md
                            border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50 transition-colors">
                          수정
                        </button>
                        <button onClick={() => handleDelete(role)} disabled={deleteRole.isPending}
                          className="inline-flex items-center h-7 px-2.5 text-xs font-medium rounded-md
                            bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40">
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {formTarget && (
        <RoleFormModal
          editTarget={formTarget === 'new' ? undefined : formTarget}
          onClose={() => setFormTarget(null)}
        />
      )}
    </div>
  )
}
