import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  useAdminLegalList,
  useActivateLegalDocument,
  useDeleteLegalDocument,
} from '@/domain/legal/hooks/useAdminLegal'
import { LEGAL_TYPE_LABELS } from '@/domain/legal/types/legal.types'
import type { LegalDocumentType, LegalDocumentListItem } from '@/domain/legal/types/legal.types'
import Button from '@/shared/components/Button'
import Modal from '@/shared/components/Modal'
import { useToast } from '@/shared/hooks/useToast'
import Toast from '@/shared/components/Toast'

const TABS: LegalDocumentType[] = ['TERMS', 'PRIVACY_POLICY']

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export default function AdminLegalListPage() {
  const navigate = useNavigate()
  const { toasts, showToast, removeToast } = useToast()

  const [activeTab, setActiveTab] = useState<LegalDocumentType>('TERMS')
  const [deleteTarget, setDeleteTarget] = useState<LegalDocumentListItem | null>(null)

  const { data, isLoading } = useAdminLegalList(activeTab)
  const activateMutation = useActivateLegalDocument()
  const deleteMutation = useDeleteLegalDocument()

  const docs = data?.content ?? []

  const handleActivate = async (id: number, version: string) => {
    try {
      await activateMutation.mutateAsync(id)
      showToast(`${version} 버전이 활성화되었습니다.`, 'success')
    } catch {
      showToast('활성화 중 오류가 발생했습니다.', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      showToast('삭제되었습니다.', 'success')
    } catch {
      showToast('활성화된 문서는 삭제할 수 없습니다.', 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="p-8">
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">약관 관리</h1>
          <p className="text-sm text-neutral-500 mt-0.5">이용약관 및 개인정보 처리방침 버전 관리</p>
        </div>
        <Button onClick={() => navigate(`/admin/legal/new?type=${activeTab}`)}>
          + 새 버전 등록
        </Button>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 mb-5 bg-neutral-100 p-1 rounded-lg w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
              activeTab === tab
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700',
            ].join(' ')}
          >
            {LEGAL_TYPE_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* 테이블 */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-neutral-400">불러오는 중...</div>
        ) : docs.length === 0 ? (
          <div className="py-16 text-center text-sm text-neutral-400">등록된 버전이 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-left">
                <th className="px-4 py-3 font-medium text-neutral-500 w-24">상태</th>
                <th className="px-4 py-3 font-medium text-neutral-500">버전</th>
                <th className="px-4 py-3 font-medium text-neutral-500 w-32">등록자</th>
                <th className="px-4 py-3 font-medium text-neutral-500 w-32">등록일</th>
                <th className="px-4 py-3 font-medium text-neutral-500 w-40" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {docs.map((doc) => (
                <tr key={doc.id} className={doc.isActive ? 'bg-primary-50/40' : 'hover:bg-neutral-50'}>
                  <td className="px-4 py-3">
                    {doc.isActive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        활성
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 text-xs text-neutral-400 bg-neutral-100 rounded-full">
                        비활성
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/legal/${doc.id}/edit`}
                      className="font-medium text-primary-700 hover:text-primary-900 hover:underline underline-offset-2"
                    >
                      {doc.version}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{doc.authorNickname ?? '-'}</td>
                  <td className="px-4 py-3 text-neutral-500">{formatDate(doc.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {!doc.isActive && (
                        <>
                          <button
                            onClick={() => handleActivate(doc.id, doc.version)}
                            disabled={activateMutation.isPending}
                            className="text-xs px-2.5 py-1 border border-primary-300 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50"
                          >
                            활성화
                          </button>
                          <button
                            onClick={() => setDeleteTarget(doc)}
                            className="text-xs px-2.5 py-1 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            삭제
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 삭제 확인 모달 */}
      <Modal
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        title="버전 삭제"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>취소</Button>
            <Button variant="danger" isLoading={deleteMutation.isPending} onClick={handleDelete}>
              삭제
            </Button>
          </>
        }
      >
        <p className="text-sm text-neutral-700">
          <span className="font-medium">"{deleteTarget?.version}"</span> 버전을 삭제하시겠습니까?
          <br />
          <span className="text-neutral-500">삭제된 버전은 복구할 수 없습니다.</span>
        </p>
      </Modal>
    </div>
  )
}
