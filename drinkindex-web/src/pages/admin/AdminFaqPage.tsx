import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminFaqList, useDeleteFaq, useUpdateFaqActive } from '@/domain/faq/hooks/useFaq'
import type { AdminFaqListItem, FaqLanguage } from '@/domain/faq/types/faq.types'
import Button from '@/shared/components/Button'
import Modal from '@/shared/components/Modal'
import { useToast } from '@/shared/hooks/useToast'
import Toast from '@/shared/components/Toast'

type LangFilter = 'ALL' | FaqLanguage

const LANG_TABS: { label: string; value: LangFilter }[] = [
  { label: '전체', value: 'ALL' },
  { label: '국문 (KO)', value: 'KO' },
  { label: '영문 (EN)', value: 'EN' },
]

const CATEGORY_LABELS: Record<string, string> = {
  SERVICE: 'DrinkIndex 이용 안내',
  WHISKY:  '위스키',
  COGNAC:  '꼬냑',
  WINE:    '와인',
}

export default function AdminFaqPage() {
  const navigate = useNavigate()
  const { toasts, showToast, removeToast } = useToast()

  const [langFilter, setLangFilter] = useState<LangFilter>('ALL')
  const [deleteTarget, setDeleteTarget] = useState<AdminFaqListItem | null>(null)

  const { data: rawData, isLoading } = useAdminFaqList(
    langFilter === 'ALL' ? undefined : langFilter,
  )
  const data = rawData ?? []
  const deleteMutation = useDeleteFaq()
  const activeMutation = useUpdateFaqActive()

  const handleToggleActive = async (item: AdminFaqListItem) => {
    try {
      await activeMutation.mutateAsync({ id: item.id, isActive: !item.isActive })
    } catch {
      showToast('상태 변경에 실패했습니다.', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      showToast('삭제되었습니다.', 'success')
    } catch {
      showToast('삭제에 실패했습니다.', 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="p-8">
      <Toast toasts={toasts} onRemove={removeToast} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">FAQ 관리</h1>
          <p className="text-sm text-neutral-500 mt-0.5">총 {data.length}건</p>
        </div>
        <Button onClick={() => navigate('/admin/faq/new')}>+ FAQ 등록</Button>
      </div>

      {/* 언어 필터 */}
      <div className="flex gap-1 mb-6">
        <div className="flex rounded-lg border border-neutral-300 overflow-hidden">
          {LANG_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setLangFilter(tab.value)}
              className={`h-9 px-4 text-sm font-medium transition-colors ${
                langFilter === tab.value
                  ? 'bg-primary-800 text-white'
                  : 'bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-neutral-400 text-sm">
          불러오는 중...
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-neutral-400 text-sm">
          등록된 FAQ가 없습니다.
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="text-left px-4 py-3 font-medium text-neutral-500 w-16">언어</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500 w-36">카테고리</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500">질문</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500 w-16 text-center">순서</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500 w-20">노출</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500 w-24">등록일</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id} className="border-b border-neutral-50 hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      item.language === 'KO'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {item.language}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-600 text-xs">
                    {CATEGORY_LABELS[item.category] ?? item.category}
                  </td>
                  <td className="px-4 py-3 font-medium text-neutral-800">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/faq/${item.id}/edit`)}
                      className="text-left line-clamp-1 hover:text-primary-800 hover:underline transition-colors"
                    >
                      {item.question}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center text-neutral-500">{item.sortOrder}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={item.isActive}
                      onClick={() => handleToggleActive(item)}
                      className={[
                        'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full',
                        'border-2 border-transparent transition-colors duration-200',
                        item.isActive ? 'bg-primary-800' : 'bg-neutral-300',
                      ].join(' ')}
                    >
                      <span className={[
                        'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow',
                        'transform transition-transform duration-200',
                        item.isActive ? 'translate-x-4' : 'translate-x-0',
                      ].join(' ')} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-neutral-400 text-xs whitespace-nowrap">
                    {new Date(item.createdAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/faq/${item.id}/edit`)}
                        className="inline-flex h-7 px-2.5 text-xs font-medium items-center
                          rounded-md border border-neutral-300 bg-white text-neutral-600
                          hover:bg-neutral-50 transition-colors"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="inline-flex h-7 px-2.5 text-xs font-medium items-center
                          rounded-md border border-red-200 bg-white text-red-600
                          hover:bg-red-50 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        title="FAQ 삭제"
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
          이 FAQ 항목을 삭제하시겠습니까?
          <br />
          <span className="text-neutral-500 text-xs mt-1 block line-clamp-2">
            {deleteTarget?.question}
          </span>
        </p>
      </Modal>
    </div>
  )
}
