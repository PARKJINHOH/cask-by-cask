import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Button from '@/shared/components/Button'
import Input from '@/shared/components/Input'
import Modal from '@/shared/components/Modal'
import { adminEmailApi } from '@/domain/admin/api/adminEmailApi'
import type { SendEmailResult, EmailTemplate } from '@/domain/admin/api/adminEmailApi'
import { formatDate } from '@/shared/utils/format'

// ── 결과 배너 ─────────────────────────────────────────────────────
function ResultBanner({ result, onClose }: { result: SendEmailResult; onClose: () => void }) {
  const isSuccess = result.failCount === 0
  return (
    <div className={`flex items-start justify-between gap-3 p-3 rounded-lg border text-sm ${
      isSuccess ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'
    }`}>
      <p>
        {result.isTest
          ? `테스트 발송 ${result.successCount === 1 ? '성공' : '실패'}`
          : <>전체 발송 완료 — 성공 <strong>{result.successCount}</strong>건{result.failCount > 0 && <>, 실패 <strong>{result.failCount}</strong>건</>}</>
        }
      </p>
      <button type="button" onClick={onClose} className="shrink-0 text-current opacity-60 hover:opacity-100">✕</button>
    </div>
  )
}

// ── 미리보기 모달 ─────────────────────────────────────────────────
function PreviewModal({ subject, body, onClose }: { subject: string; body: string; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title="이메일 미리보기" size="xl">
      <div className="border border-neutral-200 rounded-lg overflow-hidden">
        <div className="bg-neutral-50 px-5 py-3 border-b border-neutral-200">
          <p className="text-xs text-neutral-400">제목</p>
          <p className="text-base font-semibold text-neutral-900 mt-0.5">{subject || '(제목 없음)'}</p>
        </div>
        <div
          className="px-5 py-5 text-sm prose prose-sm max-w-none overflow-y-auto"
          style={{ minHeight: '320px', maxHeight: '60vh' }}
          dangerouslySetInnerHTML={{ __html: body || '<p style="color:#aaa">(본문 없음)</p>' }}
        />
      </div>
    </Modal>
  )
}

// ── 템플릿 저장 모달 ──────────────────────────────────────────────
function SaveTemplateModal({
  subject, body,
  editTarget,
  onClose,
}: {
  subject: string
  body: string
  editTarget: EmailTemplate | null
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [name, setName] = useState(editTarget?.name ?? '')
  const [error, setError] = useState('')

  const createMut = useMutation({
    mutationFn: () => adminEmailApi.createTemplate({ name, subject: editTarget?.subject ?? subject, body: editTarget?.body ?? body }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'email-templates'] }); onClose() },
    onError: () => setError('저장에 실패했습니다.'),
  })

  const updateMut = useMutation({
    mutationFn: () => adminEmailApi.updateTemplate(editTarget!.id, { name, subject, body }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'email-templates'] }); onClose() },
    onError: () => setError('저장에 실패했습니다.'),
  })

  const isPending = createMut.isPending || updateMut.isPending

  const handleSave = () => {
    if (!name.trim()) { setError('템플릿 이름을 입력해주세요.'); return }
    setError('')
    editTarget ? updateMut.mutate() : createMut.mutate()
  }

  return (
    <Modal open onClose={onClose} title={editTarget ? '템플릿 수정' : '템플릿으로 저장'} size="sm">
      <div className="space-y-4">
        <Input
          label="템플릿 이름"
          placeholder="예: 신년 이벤트 안내"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>취소</Button>
          <Button size="sm" onClick={handleSave} isLoading={isPending}>저장</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────
export default function AdminEmailPage() {
  const qc = useQueryClient()

  const [subject, setSubject] = useState('')
  const [body, setBody]       = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [result, setResult]   = useState<SendEmailResult | null>(null)
  const [error, setError]     = useState('')

  const [showPreview, setShowPreview]       = useState(false)
  const [saveModal, setSaveModal]           = useState(false)
  const [editTarget, setEditTarget]         = useState<EmailTemplate | null>(null)

  // ── 수신자 수 ──────────────────────────────────────────────────
  const { data: subscriberCount } = useQuery({
    queryKey: ['admin', 'email-subscriber-count'],
    queryFn: () => adminEmailApi.getSubscriberCount(),
    select: (res) => res.data.data ?? 0,
  })

  // ── 템플릿 ─────────────────────────────────────────────────────
  const { data: templates = [] } = useQuery({
    queryKey: ['admin', 'email-templates'],
    queryFn: () => adminEmailApi.getTemplates(),
    select: (res) => res.data.data ?? [],
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => adminEmailApi.deleteTemplate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'email-templates'] }),
  })

  // ── 발송 ───────────────────────────────────────────────────────
  const sendTest = useMutation({
    mutationFn: () => adminEmailApi.sendTest({ subject, body, testEmail }),
    onSuccess: (res) => { setResult(res.data.data ?? null); setError('') },
    onError: () => setError('테스트 발송 중 오류가 발생했습니다.'),
  })

  const sendBulk = useMutation({
    mutationFn: () => adminEmailApi.sendBulk({ subject, body }),
    onSuccess: (res) => { setResult(res.data.data ?? null); setError('') },
    onError: () => setError('이메일 발송 중 오류가 발생했습니다.'),
  })

  const isPending = sendTest.isPending || sendBulk.isPending

  const validate = () => {
    if (!subject.trim()) { setError('제목을 입력해주세요.'); return false }
    if (!body.trim())    { setError('본문을 입력해주세요.'); return false }
    return true
  }

  const handleSendTest = () => {
    if (!validate()) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      setError('유효한 테스트 이메일 주소를 입력해주세요.')
      return
    }
    setError(''); setResult(null)
    sendTest.mutate()
  }

  const handleSendBulk = () => {
    if (!validate()) return
    if (!confirm(`이메일 수신 동의 회원 ${subscriberCount ?? 0}명에게 발송하시겠습니까?`)) return
    setError(''); setResult(null)
    sendBulk.mutate()
  }

  const loadTemplate = (tpl: EmailTemplate) => {
    setSubject(tpl.subject)
    setBody(tpl.body)
    setResult(null)
    setError('')
  }

  const openEditTemplate = (tpl: EmailTemplate) => {
    setEditTarget(tpl)
    setSaveModal(true)
  }

  return (
    <div className="p-6 h-full">
      <div className="flex gap-6 items-start">

        {/* ── 좌측: 발송 폼 ─────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* 헤더 */}
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-xl font-bold text-neutral-900">메일 발송</h1>
              <p className="text-sm text-neutral-500 mt-0.5">
                이메일 수신 동의 회원 <strong className="text-primary-600">{subscriberCount ?? '-'}명</strong>에게 발송됩니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              미리보기
            </button>
          </div>

          {/* 작성 영역 */}
          <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
            <Input
              label="제목"
              placeholder="이메일 제목 입력"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-neutral-700">본문</label>
                <button
                  type="button"
                  onClick={() => { setEditTarget(null); setSaveModal(true) }}
                  className="flex items-center gap-1 text-xs text-primary-600 hover:underline"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                  </svg>
                  템플릿으로 저장
                </button>
              </div>
              <textarea
                rows={14}
                placeholder="이메일 본문을 입력하세요. HTML 태그 사용 가능합니다."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 bg-white
                  placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-400
                  focus:border-transparent resize-y font-mono"
              />
              <p className="text-xs text-neutral-400 mt-1">HTML을 입력하면 HTML 이메일로 발송됩니다.</p>
            </div>

            {result && <ResultBanner result={result} onClose={() => setResult(null)} />}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          {/* 테스트 발송 */}
          <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
            <div>
              <h2 className="text-sm font-semibold text-neutral-800">테스트 발송</h2>
              <p className="text-xs text-neutral-500 mt-0.5">실제 발송 전에 특정 이메일로 미리 확인하세요.</p>
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  label="테스트 수신 이메일"
                  type="email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>
              <Button size="sm" variant="secondary" onClick={handleSendTest}
                isLoading={sendTest.isPending} disabled={isPending}>
                테스트 발송
              </Button>
            </div>
          </div>

          {/* 전체 발송 */}
          <div className="flex justify-end">
            <Button onClick={handleSendBulk} isLoading={sendBulk.isPending} disabled={isPending}>
              전체 발송 ({subscriberCount ?? 0}명)
            </Button>
          </div>
        </div>

        {/* ── 우측: 템플릿 패널 ─────────────────────────────────── */}
        <div className="w-72 shrink-0">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden sticky top-6">
            <div className="px-4 py-3 border-b border-neutral-100">
              <h2 className="text-sm font-semibold text-neutral-800">저장된 템플릿</h2>
              <p className="text-xs text-neutral-400 mt-0.5">클릭하면 제목·본문이 채워집니다.</p>
            </div>

            {templates.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-neutral-400">
                저장된 템플릿이 없습니다.
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100 max-h-[600px] overflow-y-auto">
                {templates.map((tpl) => (
                  <li key={tpl.id} className="group px-4 py-3 hover:bg-neutral-50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => loadTemplate(tpl)}
                        className="flex-1 text-left min-w-0"
                      >
                        <p className="text-sm font-medium text-neutral-800 truncate">{tpl.name}</p>
                        <p className="text-xs text-neutral-400 truncate mt-0.5">{tpl.subject}</p>
                        <p className="text-xs text-neutral-300 mt-0.5">{formatDate(tpl.updatedAt)}</p>
                      </button>
                      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => openEditTemplate(tpl)}
                          title="수정"
                          className="p-1 rounded text-neutral-400 hover:text-primary-600 hover:bg-primary-50"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`"${tpl.name}" 템플릿을 삭제하시겠습니까?`))
                              deleteMut.mutate(tpl.id)
                          }}
                          title="삭제"
                          className="p-1 rounded text-neutral-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                          </svg>
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

      {/* ── 모달 ─────────────────────────────────────────────────── */}
      {showPreview && (
        <PreviewModal subject={subject} body={body} onClose={() => setShowPreview(false)} />
      )}
      {saveModal && (
        <SaveTemplateModal
          subject={subject}
          body={body}
          editTarget={editTarget}
          onClose={() => { setSaveModal(false); setEditTarget(null) }}
        />
      )}
    </div>
  )
}
