import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { useSubmitRequest, useUpdateMyRequest } from '@/domain/spirit/hooks/useSpiritRequest'
import { spiritRequestApi } from '@/domain/spirit/api/spiritRequestApi'
import ProducerSelector from '@/domain/producer/components/ProducerSelector'
import { useSubmitProducerRequest } from '@/domain/producer/hooks/useProducerRequest'
import { CATEGORY_TO_PRODUCER_TYPE, type NewProducerInput } from '@/domain/producer/types/producer.types'
import SeoMeta from '@/shared/components/SeoMeta'
import { RequiredFieldsNotice } from '@/shared/components/FormFieldLabel'
import SpiritFormFields, { useSpiritForm, CARD, SectionTitle } from '@/domain/admin/components/SpiritFormFields'
import { toSpiritRequestForm, toPrefillDetail } from '@/domain/admin/components/spiritFormAdapters'
import AutoGrowTextarea from '@/shared/components/AutoGrowTextarea'
import SpiritMasterPicker, { type PickedSpiritMaster } from '@/domain/spirit/components/SpiritMasterPicker'
import { spiritApi } from '@/domain/spirit/api/spiritApi'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'
import { ISO3166_COUNTRIES } from '@/domain/location/data/iso3166Countries'

// ═════════════════════════════════════════════════════════════════
//  사용자 술 등록 요청 — 관리자 등록 폼(SpiritFormFields/useSpiritForm)을
//  그대로 재사용한다(단일 소스). 술 데이터 항목을 추가·변경할 때는
//  SpiritFormFields.tsx 만 수정하면 관리자 3화면 + 이 화면까지 전부 반영된다.
//
//  관리자와의 차이는 세 가지뿐이다.
//   ① 에디션 개수 — 관리자 N개 / 사용자 1개(allowMultipleVariants=false).
//     1건은 SpiritFormFields 가 **자동으로 시딩**한다 — 이 화면에는 '에디션 추가' 버튼이 없다.
//   ② 제출 채널 — 평탄화 DTO + 멀티파트 이미지(spiritFormAdapters.ts 가 형태를 변환).
//   ③ 생산자 — 즉석 생성이 안 되고 승인 대기 큐로 들어간다(allowPendingProducer).
//  검증 기준은 관리자와 **동일**하다(requireProductionInfo: true).
//
//  내 요청 목록은 별도 화면(MySpiritRequestsPage, /request/spirit/my)에서
//  게시글 목록 형태로 관리 — 이 화면은 ?edit=<id> 쿼리로 수정 모드만 진입.
// ═════════════════════════════════════════════════════════════════

// 에디션을 붙일 수 있는 카테고리 — 위스키(배치·싱글캐스크·출시연도)와 와인(빈티지)뿐이다.
// 꼬냑·기타는 폼에 에디션 개념 자체가 없다.
const VARIANT_CAPABLE: SpiritCategory[] = ['WHISKY', 'WINE']

const MAX_IMAGES = 3

const FIELD_CLS =
  'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors'
const LABEL_CLS = 'block text-xs font-medium text-neutral-600 mb-1.5'

export default function SpiritRequestPage() {
  const { t } = useTranslation()
  const form = useSpiritForm({ requireProductionInfo: true, allowPendingProducer: true })

  const [successMsg, setSuccessMsg] = useState('')
  const [loadErr, setLoadErr] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  // 이미지 — 신규 첨부 파일 + 유지할 기존 URL(수정 시)
  const [newImages, setNewImages] = useState<File[]>([])
  const [keptImageUrls, setKeptImageUrls] = useState<string[]>([])
  // 관리자에게 전달할 비고 (술 데이터가 아닌 제출 채널 전용 필드 — useSpiritForm 밖에서 관리)
  const [note, setNote] = useState('')

  // ── 기존 주류에 에디션 추가 ─────────────────────────────────
  // 고른 주류가 있으면 새 마스터를 만들지 않고 그 주류의 에디션으로 승인된다.
  const [targetSpirit, setTargetSpirit] = useState<PickedSpiritMaster | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [targetErr, setTargetErr] = useState('')
  const isVariantMode = targetSpirit != null

  /**
   * 고른 주류의 정보를 폼에 옮겨 담는다.
   *
   * <p>이름·카테고리·생산자·국가는 승인 시 서버가 마스터에서 복사하지만, 요청 기록과 화면에도
   * 같은 값이 보여야 신청자가 무엇을 보내는지 알 수 있다. 에디션 분리를 함께 켜 두면
   * SpiritFormFields 가 에디션 카드 1건을 자동으로 띄운다.
   */
  const applyTargetSpirit = async (master: PickedSpiritMaster) => {
    setTargetErr('')
    if (!master.category || !VARIANT_CAPABLE.includes(master.category)) {
      setTargetErr(t('spiritRequest.form.existingSpirit.unsupportedCategory'))
      return
    }
    form.reset()
    form.selectCategory(master.category)
    // 생산 정보는 마스터에서 오고 화면에서도 숨기므로, 보이지 않는 칸을 필수로 막지 않는다.
    form.setIdentityInherited(true)
    form.setNameKo(master.nameKo)
    form.setNameEn(master.nameEn)
    setTargetSpirit(master)

    // 상세를 한 번 더 불러 생산자·국가·산지를 채운다 — 자동완성 응답에는 없는 값들이다.
    // 승인 시 서버가 마스터에서 다시 복사하지만, 요청 기록과 관리자 검토 화면에도
    // 같은 값이 보여야 무엇에 붙는 요청인지 한눈에 알 수 있다.
    try {
      const detail = (await spiritApi.getDetail(master.id)).data.data
      if (detail) {
        form.setProducerId(detail.producerId ?? null)
        form.setProducerName(detail.producerNameKo ?? '')
        const code = ISO3166_COUNTRIES.find((c) => c.nameKo === detail.country)?.code ?? null
        form.setCountryValue(code, detail.country ?? '')
        form.setRegion(detail.region ?? '')
        form.setRegionCode(detail.wineRegion?.code ?? null)
      }
    } catch {
      // 상세 조회 실패 — 이름·카테고리만으로도 요청은 보낼 수 있다.
    }

    // 위스키는 에디션 유형을 사용자가 고르고, 와인은 빈티지로 고정된다.
    if (master.category === 'WINE') {
      form.setIsVariantSplit(true)
      form.setVariantType('VINTAGE')
    }
  }

  const clearTargetSpirit = () => {
    setTargetSpirit(null)
    setTargetErr('')
    form.reset()   // identityInherited 도 같이 풀린다
  }

  const [searchParams] = useSearchParams()
  const { mutate: submitRequest, isPending: isSubmitting } = useSubmitRequest()
  const { mutate: updateRequest, isPending: isUpdating } = useUpdateMyRequest()
  const { mutateAsync: submitProducerRequest } = useSubmitProducerRequest()
  const isPending = isSubmitting || isUpdating

  // 기타 카테고리 — 목록에 없는 생산자 직접 등록 → 생산자 등록요청 큐로 전송 (승인 후 사용)
  // 목록에 없는 생산자 → 생산자 등록요청 큐로 전송(승인 후 사용).
  // 종류를 카테고리에 맞춰야 한다 — 예전에는 'OTHER' 로 고정돼 있어,
  // 사용자가 요청한 양조장이 승인되어도 와인 생산자 목록에는 끝내 나타나지 않았다.
  // id 는 아직 없으므로 이름을 폼에 남겨 생산 정보 필수 검증을 통과시킨다(allowPendingProducer).
  const handleCreateProducer = async (data: NewProducerInput) => {
    const producerType = form.category ? CATEGORY_TO_PRODUCER_TYPE[form.category] : 'OTHER'
    await submitProducerRequest({ type: producerType, ...data })
    form.setProducerName(data.nameKo)
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
    setTargetSpirit(null)
    setTargetErr('')
    setNewImages([])
    setKeptImageUrls([])
    setNote('')
    setEditingId(null)
  }

  const onSubmit = () => {
    // 기존 주류 모드는 붙일 에디션이 반드시 있어야 한다.
    // 위스키는 에디션 유형을 사용자가 고르므로, 고르지 않은 채 보내면
    // 서버가 승인 시점에 막게 된다 — 그 전에 여기서 알려준다.
    if (isVariantMode && !form.isVariantSplit) {
      setTargetErr(t('spiritRequest.form.existingSpirit.editionRequired'))
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (!form.validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const payload = {
      ...toSpiritRequestForm(form.buildPayload()),
      imageUrls: keptImageUrls,
      note: note.trim() || undefined,
      targetSpiritId: targetSpirit?.id ?? null,
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
      // 기존 주류에 붙이는 요청이었다면 그 대상도 함께 복원한다 —
      // 복원하지 않으면 수정해서 다시 보내는 순간 새 주류 요청으로 바뀜다.
      setTargetSpirit(d.targetSpirit
        ? { id: d.targetSpirit.id, nameKo: d.targetSpirit.nameKo,
            nameEn: d.targetSpirit.nameEn, category: d.category }
        : null)
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

          {/* 요청 종류 — 새 주류인지, 이미 있는 주류의 에디션인지.
              여기서 갈라 두지 않으면 사용자가 같은 술을 새 주류로 또 올리고
              관리자가 승인 시점에야 중복을 발견하게 된다. */}
          <div className={CARD}>
            <SectionTitle title={t('spiritRequest.form.existingSpirit.modeTitle')} />
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => { if (isVariantMode) clearTargetSpirit() }}
                className={`rounded-xl border-2 p-3 text-left transition-all ${
                  !isVariantMode
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-neutral-200 hover:border-amber-300 hover:bg-amber-50/40'
                }`}
              >
                <span className="block text-sm font-semibold text-neutral-800">
                  {t('spiritRequest.form.existingSpirit.modeNew')}
                </span>
                <span className="mt-0.5 block text-xs text-neutral-500">
                  {t('spiritRequest.form.existingSpirit.modeNewHint')}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className={`rounded-xl border-2 p-3 text-left transition-all ${
                  isVariantMode
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-neutral-200 hover:border-amber-300 hover:bg-amber-50/40'
                }`}
              >
                <span className="block text-sm font-semibold text-neutral-800">
                  {t('spiritRequest.form.existingSpirit.modeVariant')}
                </span>
                <span className="mt-0.5 block text-xs text-neutral-500">
                  {t('spiritRequest.form.existingSpirit.modeVariantHint')}
                </span>
              </button>
            </div>

            {targetErr && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{targetErr}</p>
            )}

            {isVariantMode && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                <p className="text-[11px] font-semibold text-amber-700">
                  {t('spiritRequest.form.existingSpirit.selected')}
                </p>
                <p className="mt-1 text-sm font-bold text-neutral-900">{targetSpirit.nameKo}</p>
                <p className="text-xs text-neutral-500">{targetSpirit.nameEn}</p>
                <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
                  {t('spiritRequest.form.existingSpirit.inheritedHint')}
                </p>
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="mt-2 text-xs font-semibold text-amber-700 hover:underline"
                >
                  {t('spiritRequest.form.existingSpirit.change')}
                </button>
              </div>
            )}
          </div>

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
            admin={false}
            categoryLocked={isVariantMode}
            identityLocked={isVariantMode}
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
                  <AutoGrowTextarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={500}
                    rows={3}
                    className={`${FIELD_CLS} border-neutral-300`}
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

      <SpiritMasterPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(master) => { void applyTargetSpirit(master) }}
      />
    </div>
  )
}
