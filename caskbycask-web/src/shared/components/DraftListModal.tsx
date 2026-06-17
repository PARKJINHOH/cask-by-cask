import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { draftApi } from '@/shared/api/draftApi'
import type { DraftListItem, DraftDetail } from '@/shared/api/draftApi'

const MAX_DRAFTS = 10

interface Props {
  open: boolean
  draftKey: string
  onClose: () => void
  // 불러오기 선택 시 호출 (폼에 주입)
  onLoad: (draft: DraftDetail) => void
  onError?: (message: string) => void
}

// 에디터 좌측 하단 "임시저장목록" 버튼으로 여는 모달 — draftKey(작성 화면)별 임시저장 목록
export default function DraftListModal({ open, draftKey, onClose, onLoad, onError }: Props) {
  const { t, i18n } = useTranslation()
  const [items, setItems] = useState<DraftListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  const formatDateTime = useCallback((iso: string): string => {
    const locale = i18n.language === 'ko' ? 'ko-KR' : 'en-US'
    return new Date(iso).toLocaleString(locale, {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
  }, [i18n.language])

  const fetchList = useCallback(() => {
    setLoading(true)
    draftApi.list(draftKey)
      .then((res) => setItems(res.data.data ?? []))
      .catch(() => onError?.(t('post.draft.loadError', '임시저장 목록을 불러오지 못했습니다.')))
      .finally(() => setLoading(false))
  }, [draftKey, onError, t])

  // 열릴 때 목록 조회
  useEffect(() => {
    if (open) fetchList()
  }, [open, fetchList])

  // ESC 닫기
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const handleLoad = async (id: number) => {
    setBusyId(id)
    try {
      const res = await draftApi.getOne(id)
      const detail = res.data.data
      if (detail) {
        onLoad(detail)
        onClose()
      }
    } catch {
      onError?.(t('post.draft.loadSingleError', '임시저장을 불러오지 못했습니다.'))
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (id: number) => {
    setBusyId(id)
    try {
      await draftApi.remove(id)
      setItems((prev) => prev.filter((d) => d.id !== id))
    } catch {
      onError?.(t('post.draft.deleteError', '임시저장을 삭제하지 못했습니다.'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[80vh] flex flex-col bg-white rounded-2xl shadow-xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <div>
            <h2 className="text-base font-bold text-neutral-900">{t('post.draft.listTitle', '임시저장 목록')}</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {t('post.draft.maxLimit', { max: MAX_DRAFTS, current: items.length, defaultValue: `임시저장은 최대 ${MAX_DRAFTS}개까지 저장됩니다. (${items.length}/${MAX_DRAFTS})` })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
            aria-label={t('common.close', '닫기')}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-16 text-center text-sm text-neutral-400">{t('common.loading', '불러오는 중...')}</div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-sm text-neutral-400">{t('post.draft.empty', '임시저장된 글이 없습니다.')}</div>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {items.map((d) => (
                <li key={d.id} className="px-5 py-3.5 hover:bg-neutral-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-800 truncate">
                        {d.title?.trim() || t('post.draft.noTitle', '(제목 없음)')}
                      </p>
                      {d.preview && (
                        <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{d.preview}</p>
                      )}
                      <p className="text-[11px] text-neutral-400 mt-1">{formatDateTime(d.updatedAt)}</p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={busyId === d.id}
                        onClick={() => handleLoad(d.id)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-800 text-white
                          hover:bg-primary-900 disabled:opacity-50 transition-colors"
                      >
                        {t('common.load', '불러오기')}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === d.id}
                        onClick={() => handleDelete(d.id)}
                        className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-neutral-300
                          text-neutral-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200
                          disabled:opacity-50 transition-colors"
                      >
                        {t('common.delete', '삭제')}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
