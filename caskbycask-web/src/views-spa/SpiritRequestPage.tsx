import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { useSubmitRequest, useUpdateMyRequest } from '@/domain/spirit/hooks/useSpiritRequest'
import { spiritRequestApi } from '@/domain/spirit/api/spiritRequestApi'
import ProducerSelector from '@/domain/producer/components/ProducerSelector'
import { useSubmitProducerRequest } from '@/domain/producer/hooks/useProducerRequest'
import type { NewProducerInput } from '@/domain/producer/types/producer.types'
import SeoMeta from '@/shared/components/SeoMeta'
import { RequiredFieldsNotice } from '@/shared/components/FormFieldLabel'
import SpiritFormFields, { useSpiritForm, CARD, SectionTitle } from '@/domain/admin/components/SpiritFormFields'
import { toSpiritRequestForm, toPrefillDetail } from '@/domain/admin/components/spiritFormAdapters'

// ══════════════════════════════════════════════════════════════════
//  사용자 술 등록 요청 — 관리자 등록 폼(SpiritFormFields/useSpiritForm)을
//  그대로 재사용한다(단일 소스). 관리자와의 유일한 기능 차이는 에디션
//  개수(관리자 N개 / 사용자 1개, allowMultipleVariants=false)와 제출 채널
//  (평탄화 DTO + 멀티파트 이미지, spiritFormAdapters.ts가 형태를 변환)뿐이다.
//  술 데이터 항목을 추가·변경할 때는 SpiritFormFields.tsx만 수정하면
//  관리자 3화면 + 이 화면까지 전부 반영된다.
//  내 요청 목록은 별도 화면(MySpiritRequestsPage, /request/spirit/my)에서
//  게시글 목록 형태로 관리 — 이 화면은 ?edit=<id> 쿼리로 수정 모드만 진입.
// ══════════════════════════════════════════════════════════════════

const MAX_IMAGES = 3

const FIELD_CLS =
  'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors'
const LABEL_CLS = 'block text-xs font-medium text-neutral-600 mb-1.5'

export default function SpiritRequestPage() {
  const { t } = useTranslation()
  const form = useSpiritForm()

  const [successMsg, setSuccessMsg] = useState('')
  const [loadErr, setLoadErr] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  // 이미지 — 신규 첨부 파일 + 유지할 기존 URL(수정 시)
  const [newImages, setNewImages] = useState<File[]>([])
  const [keptImageUrls, setKeptImageUrls] = useState<string[]>([])
  // 관리자에게 전달할 비고 (술 데이터가 아닌 제출 채널 전용 필드 — useSpiritForm 밖에서 관리)
  const [note, setNote] = useState('')

  const [searchParams] = useSearchParams()
  const { mutate: submitRequest, isPending: isSubmitting } = useSubmitRequest()
  const { mutate: updateRequest, isPending: isUpdating } = useUpdateMyRequest()
  const { mutateAsync: submitProducerRequest } = useSubmitProducerRequest()
  const isPending = isSubmitting || isUpdating

  // 기타 카테고리 — 목록에 없는 생산자 직접 등록 → 생산자 등록요청 큐로 전송 (승인 후 사용)
  const handleCreateProducer = async (data: NewProducerInput) => {
    await submitProducerRequest({ type: 'OTHER', ...data })
    setSuccessMsg(t('producerSelector.createPending'))
    setTimeout(() => setSuccessMsg(''), 5000)
    return null
  }

  // 신규 첨부 이미지 미리보기 (object URL — 정리 포함)
  const newImagePreviews = useMemo(() => newImages.map((f) => URL.createObjectURL(f)), [newImages])
  useEffect(() => () => { newImagePreviews.forEach((u) => URL.revokeObjectURL(u)) }, [newImagePreviews])
  const totalImages = keptImageUrls.length + newImages.length

  const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    const room = Math.max(0, MAX_IMAGES - totalImages)
    setNewImages((prev) => [...prev, ...files.slice(0, room)])
  }
  const removeNewImage = (idx: number) => setNewImages((prev) => prev.filter((_, i) => i !== idx))
  const removeKeptImage = (url: string) => setKeptImageUrls((prev) => prev.filter((u) => u !== url))

  const resetAll = () => {
    form.reset()
    setNewImages([])
    setKeptImageUrls([])
    setNote('')
    setEditingId(null)
  }

  const onSubmit = () => {
    if (!form.validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const payload = {
      ...toSpiritRequestForm(form.buildPayload()),
      imageUrls: keptImageUrls,
      note: note.trim() || undefined,
    }
    if (editingId != null) {
      updateRequest({ id: editingId, data: payload, images: newImages }, {
        onSuccess: () => {
          resetAll()
          window.scrollTo({ top: 0, behavior: 'smooth' })
          setSuccessMsg(t('spiritRequest.form.editSuccess'))
          setTimeout(() => setSuccessMsg(''), 4000)
        },
      })
    } else {
      submitRequest({ data: payload, images: newImages }, {
        onSuccess: () => {
          resetAll()
          setSuccessMsg(t('spiritRequest.form.success'))
          setTimeout(() => setSuccessMsg(''), 4000)
        },
      })
    }
  }

  const handleEdit = async (id: number) => {
    setLoadErr('')
    setSuccessMsg('')
    try {
      const res = await spiritRequestApi.myRequestDetail(id)
      const d = res.data.data
      if (!d) throw new Error('no data')
      form.prefillFromRequest(toPrefillDetail(d))
      setKeptImageUrls(d.imageUrls ?? [])
      setNewImages([])
      setNote(d.note ?? '')
      setEditingId(id)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setLoadErr(t('spiritRequest.form.loadError'))
    }
  }

  // ?edit=<id> 쿼리로 진입 시 자동으로 수정 모드 로드 (내 요청 목록 페이지에서 진입)
  useEffect(() => {
    const editParam = searchParams.get('edit')
    if (editParam) handleEdit(Number(editParam))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <SeoMeta title={t('spiritRequest.title')} description={t('spiritRequest.subtitle')} noindex />

      {/* Page title */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">{t('spiritRequest.title')}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t('spiritRequest.subtitle')}</p>
        </div>
        <Link
          to="/request/spirit/my"
          className="flex-shrink-0 text-sm font-medium px-3 py-2 rounded-lg border border-neutral-200
            text-neutral-600 hover:bg-neutral-50 transition-colors whitespace-nowrap"
        >
          {t('spiritRequest.myRequests.viewList')}
        </Link>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); onSubmit() }} noValidate className="space-y-6">
          <RequiredFieldsNotice />

          {/* 수정 모드 배너 */}
          {editingId != null && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-amber-800">{t('spiritRequest.form.editMode')}</p>
                <p className="text-xs text-amber-700/80">{t('spiritRequest.form.editModeHint')}</p>
              </div>
              <button type="button" onClick={resetAll}
                className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors">
                {t('spiritRequest.form.cancelEdit')}
              </button>
            </div>
          )}

          <SpiritFormFields
            form={form}
            allowMultipleVariants={false}
            producerSelector={ProducerSelector}
            onCreateProducer={handleCreateProducer}
            bottomSlot={
              <div className="space-y-6">
                {/* 사진 첨부 (최대 3장) — 승인 시 주류 이미지로 등록 */}
                <div className={CARD}>
                  <SectionTitle title={t('spiritRequest.form.images.label')} />
                  <p className="text-xs text-neutral-400">{t('spiritRequest.form.images.hint')}</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {keptImageUrls.map((url) => (
                      <div key={url} className="relative aspect-square rounded-xl overflow-hidden border border-neutral-200">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeKeptImage(url)}
                          aria-label={t('common.delete')}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-sm leading-none
                            flex items-center justify-center hover:bg-black/80 transition-colors"
                        >×</button>
                      </div>
                    ))}
                    {newImagePreviews.map((url, i) => (
                      <div key={url} className="relative aspect-square rounded-xl overflow-hidden border border-neutral-200">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeNewImage(i)}
                          aria-label={t('common.delete')}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-sm leading-none
                            flex items-center justify-center hover:bg-black/80 transition-colors"
                        >×</button>
                      </div>
                    ))}
                    {totalImages < MAX_IMAGES && (
                      <label className="aspect-square rounded-xl border-2 border-dashed border-neutral-300 flex flex-col
                        items-center justify-center cursor-pointer text-neutral-400 hover:border-amber-400
                        hover:bg-amber-50/40 hover:text-amber-500 transition-colors">
                        <span className="text-2xl leading-none">+</span>
                        <span className="text-xs mt-1">{t('spiritRequest.form.images.add')}</span>
                        <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleAddImages} />
                      </label>
                    )}
                  </div>
                </div>

                {/* 비고 */}
                <div className={CARD}>
                  <SectionTitle title={t('spiritRequest.form.note')} />
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={500}
                    rows={3}
                    className={`${FIELD_CLS} border-neutral-300 resize-none`}
                    placeholder={t('spiritRequest.form.notePlaceholder')}
                  />
                  <p className={LABEL_CLS}>{t('spiritRequest.form.noteHint')}</p>
                </div>
              </div>
            }
          />

          {successMsg && (
            <div className="text-sm text-green-700 bg-green-50 rounded-lg px-4 py-3">{successMsg}</div>
          )}
          {loadErr && (
            <div className="text-sm text-red-700 bg-red-50 rounded-lg px-4 py-3">{loadErr}</div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 bg-primary-800 text-white text-sm font-semibold rounded-xl
              hover:bg-primary-900 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? t('common.loading')
              : editingId != null ? t('spiritRequest.form.submitEdit')
              : t('spiritRequest.form.submit')}
          </button>
      </form>
    </div>
  )
}
