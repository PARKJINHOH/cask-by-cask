import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { useSubmitRequest, useUpdateMyRequest } from '@/domain/spirit/hooks/useSpiritRequest'
import { spiritRequestApi } from '@/domain/spirit/api/spiritRequestApi'
import ProducerSelector from '@/domain/producer/components/ProducerSelector'
import { useSubmitProducerRequest } from '@/domain/producer/hooks/useProducerRequest'
import { CATEGORY_TO_PRODUCER_TYPE, type NewProducerInput } from '@/domain/producer/types/producer.types'
import SeoMeta from '@/shared/components/SeoMeta'
import { RequiredFieldsNotice, RequiredMark } from '@/shared/components/FormFieldLabel'
import SpiritFormFields, { useSpiritForm, CARD, SectionTitle } from '@/domain/admin/components/SpiritFormFields'
import { toSpiritRequestForm, toPrefillDetail } from '@/domain/admin/components/spiritFormAdapters'
import AutoGrowTextarea from '@/shared/components/AutoGrowTextarea'
import SpiritMasterPicker, { type PickedSpiritMaster } from '@/domain/spirit/components/SpiritMasterPicker'
import { spiritApi } from '@/domain/spirit/api/spiritApi'
import type { SpiritCategory } from '@/domain/spirit/types/spirit.types'
import {
  deriveMasterEditionInfo, EMPTY_MASTER_EDITION, type MasterEditionInfo,
} from '@/domain/spirit/utils/masterEdition'
import { ISO3166_COUNTRIES } from '@/domain/location/data/iso3166Countries'

// ═════════════════════════════════════════════════════════════════
//  사용자 술 등록 요청 — 관리자 등록 폼(SpiritFormFields/useSpiritForm)을
//  **최소 정보 모드**(`simple: true`)로 재사용한다.
//
//  이 화면이 받는 것은 "관리자가 그 술을 찾아낼 수 있을 만큼"이 전부다:
//  카테고리 · 이름(한/영) · 도수 · 용량 · (위스키)스타일 · 생산자 · 국가.
//  숙성 연수·캐스크·와인 상세 같은 값은 일반 이용자가 알기 어렵고, 비워 보내나
//  틀리게 보내나 결국 관리자가 승인 화면에서 다시 채운다 — 그래서 아예 묻지 않는다.
//
//  관리자와의 차이는 세 가지다.
//   ① 입력 범위 — 상세·캐스크·에디션 카드가 없다(`simple`). 검증도 같이 꺼진다.
//   ② 제출 채널 — 평탄화 DTO + 멀티파트 이미지(spiritFormAdapters.ts 가 형태를 변환).
//   ③ 생산자 — 즉석 생성이 안 되고 승인 대기 큐로 들어간다(allowPendingProducer).
//     그때는 id 가 없으므로 **입력한 이름을 payload.producerName 으로 함께 보낸다** —
//     이걸 빠뜨리면 관리자 화면에 생산자가 빈 칸으로 도착한다.
//
//  내 요청 목록은 별도 화면(MySpiritRequestsPage, /request/spirit/my)에서
//  게시글 목록 형태로 관리 — 이 화면은 ?edit=<id> 쿼리로 수정 모드만 진입.
// ═════════════════════════════════════════════════════════════════

/**
 * 에디션을 붙일 수 있는 카테고리 — 위스키뿐이다.
 *
 * <p>와인 빈티지는 서버가 식별값을 **연도 또는 'NV' 로 강제**하는데(validateWineVariants),
 * 이 화면은 자유 입력 식별값만 받으므로 승인 시점에 막힌다. 와인 빈티지는 새 주류 요청으로 받는다.
 */
const VARIANT_CAPABLE: SpiritCategory[] = ['WHISKY']

const MAX_IMAGES = 3

const FIELD_CLS =
  'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 transition-colors'
const LABEL_CLS = 'block text-xs font-medium text-neutral-600 mb-1.5'

export default function SpiritRequestPage() {
  const { t } = useTranslation()
  const form = useSpiritForm({ requireProductionInfo: true, allowPendingProducer: true, simple: true })

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
   * 사용자가 적는 에디션 식별값 — 이 화면의 유일한 에디션 입력이다.
   *
   * <p>에디션 카드(`variants[]`)를 쓰지 않고 페이지 상태로 들고 있다가 제출 직전에 평탄화 DTO 에 얹는다.
   * 에디션 카드를 쓰면 시리즈 식별자·에디션별 숙성연수까지 필수가 되는데, 그 칸들이 이 화면에는 없다.
   */
  const [editionValue, setEditionValue] = useState('')
  const [editionValueEn, setEditionValueEn] = useState('')
  const [editionErr, setEditionErr] = useState('')
  /** 고른 마스터가 이미 갖고 있는 에디션 유형·시리즈 식별자 (승인 시 서버가 쓰는 값과 같은 규칙으로 추출) */
  const [masterEdition, setMasterEdition] = useState<MasterEditionInfo>(EMPTY_MASTER_EDITION)

  /**
   * 고른 주류의 정보를 폼에 옮겨 담는다.
   *
   * <p>이름·생산자·국가는 승인 시 서버가 마스터에서 복사하지만, 요청 기록과 화면에도
   * 같은 값이 보여야 신청자가 무엇을 보내는지 알 수 있다.
   */
  const applyTargetSpirit = async (master: PickedSpiritMaster) => {
    setTargetErr('')
    setEditionErr('')
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
    setMasterEdition(EMPTY_MASTER_EDITION)

    // 상세를 한 번 더 불러 생산자·국가·산지와 **에디션 구분 정보**를 채운다 —
    // 자동완성 응답에는 없는 값들이다. 승인 시 서버가 마스터에서 다시 복사하지만,
    // 요청 기록과 관리자 검토 화면에도 같은 값이 보여야 무엇에 붙는 요청인지 한눈에 알 수 있다.
    try {
      const detail = (await spiritApi.getDetail(master.id)).data.data
      if (detail) {
        form.setProducerId(detail.producerId ?? null)
        form.setProducerName(detail.producerNameKo ?? '')
        const code = ISO3166_COUNTRIES.find((c) => c.nameKo === detail.country)?.code ?? null
        form.setCountryValue(code, detail.country ?? '')
        form.setRegion(detail.region ?? '')
        form.setRegionCode(detail.wineRegion?.code ?? null)
        // 스타일도 마스터에서 가져온다 — 같은 술의 다른 배치라 스타일이 달라질 일이 없는데,
        // 비워 두면 '스타일을 선택해주세요' 로 막혀 신청자가 같은 값을 다시 고르게 된다.
        if (detail.whiskyDetail?.style) {
          form.updateWhisky({
            style: detail.whiskyDetail.style,
            styleOther: detail.whiskyDetail.styleOther ?? '',
          })
        }
        setMasterEdition(deriveMasterEditionInfo(detail))
      }
    } catch {
      // 상세 조회 실패 — 이름·카테고리만으로도 요청은 보낼 수 있다.
      // 에디션 유형은 비어 가고, 관리자가 승인 화면에서 확정한다.
    }
  }

  const clearTargetSpirit = () => {
    setTargetSpirit(null)
    setTargetErr('')
    setEditionErr('')
    setEditionValue('')
    setEditionValueEn('')
    setMasterEdition(EMPTY_MASTER_EDITION)
    form.reset()   // identityInherited 도 같이 풀린다
  }

  const [searchParams] = useSearchParams()
  const { mutate: submitRequest, isPending: isSubmitting } = useSubmitRequest()
  const { mutate: updateRequest, isPending: isUpdating } = useUpdateMyRequest()
  const { mutateAsync: submitProducerRequest } = useSubmitProducerRequest()
  const isPending = isSubmitting || isUpdating

  // 목록에 없는 생산자 → 생산자 등록요청 큐로 전송(승인 후 사용).
  // 종류를 카테고리에 맞춰야 한다 — 예전에는 'OTHER' 로 고정돼 있어,
  // 사용자가 요청한 양조장이 승인되어도 와인 생산자 목록에는 끝내 나타나지 않았다.
  // id 는 아직 없으므로 이름을 폼에 남겨 생산 정보 필수 검증을 통과시키고(allowPendingProducer),
  // 제출 시 producerName 으로 함께 보낸다.
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
    setEditionErr('')
    setEditionValue('')
    setEditionValueEn('')
    setMasterEdition(EMPTY_MASTER_EDITION)
    setNewImages([])
    setKeptImageUrls([])
    setNote('')
    setEditingId(null)
  }

  const onSubmit = () => {
    // 기존 주류 모드는 붙일 식별값이 반드시 있어야 한다. 서버도 막지만(hasVariantForTarget)
    // 메시지가 일반적이라, 무엇을 채워야 하는지 여기서 먼저 알려준다.
    const trimmedEdition = editionValue.trim()
    if (isVariantMode && !trimmedEdition) {
      setEditionErr(t('spiritRequest.form.existingSpirit.editionValueRequired'))
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setEditionErr('')
    if (!form.validate()) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const payload = {
      ...toSpiritRequestForm(form.buildPayload()),
      // 승인 대기 생산자는 id 가 없다 — 이름이라도 실어야 관리자가 술을 찾아낼 수 있다.
      producerName: form.producerId ? null : form.producerName.trim() || null,
      // 에디션 — 유형·시리즈 식별자는 마스터에서 물려받은 값을 그대로 되돌려 보낸다.
      // 마스터가 아직 갈리지 않았으면 비어 가고, 관리자가 승인 화면에서 확정한다.
      variantType: isVariantMode ? masterEdition.variantType : null,
      variantValue: isVariantMode ? trimmedEdition : null,
      variantValueEn: isVariantMode ? editionValueEn.trim() || null : null,
      seriesIdentifier: isVariantMode ? masterEdition.seriesIdentifier : null,
      seriesIdentifierEn: isVariantMode ? masterEdition.seriesIdentifierEn : null,
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
      // 복원하지 않으면 수정해서 다시 보내는 순간 새 주류 요청으로 바뀐다.
      const target = d.targetSpirit
        ? { id: d.targetSpirit.id, nameKo: d.targetSpirit.nameKo,
            nameEn: d.targetSpirit.nameEn, category: d.category }
        : null
      setTargetSpirit(target)
      // 식별값은 폼(variants)이 아니라 이 화면이 들고 있다 — 평탄화 필드에서 되살린다.
      setEditionValue(d.variantValue ?? '')
      setEditionValueEn(d.variantValueEn ?? '')
      setMasterEdition(target
        ? {
          hasEditions: !!d.variantType && d.variantType !== 'NONE' && !!d.seriesIdentifier,
          variantType: d.variantType && d.variantType !== 'NONE' ? d.variantType : null,
          seriesIdentifier: d.seriesIdentifier ?? null,
          seriesIdentifierEn: d.seriesIdentifierEn ?? null,
        }
        : EMPTY_MASTER_EDITION)
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
    // 1열 폼이라 관리자 화면처럼 넓게 펼치지 않는다 — 입력칸이 가로로 늘어지면 오히려 읽기 어렵다.
    <div className="max-w-3xl mx-auto px-4 py-8">
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

      {/* 이 화면이 무엇을 요구하지 '않는지'를 먼저 알린다 — 상세를 못 채워서 요청을 포기하는 일이 잦다. */}
      <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3.5">
        <p className="text-sm font-semibold text-amber-800">{t('spiritRequest.form.adminFillsTitle')}</p>
        <p className="mt-1 text-xs leading-relaxed text-amber-700/90">
          {t('spiritRequest.form.adminFillsNotice')}
        </p>
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
            admin={false}
            categoryLocked={isVariantMode}
            identityLocked={isVariantMode}
            producerSelector={ProducerSelector}
            onCreateProducer={handleCreateProducer}
            bottomSlot={
              <div className="space-y-6">
                {/* 에디션 식별값 — 기존 주류에 붙일 때만. 유형은 대상 주류에서 상속한다. */}
                {isVariantMode && (
                  <div className={CARD}>
                    <SectionTitle
                      title={t('spiritRequest.form.existingSpirit.editionSectionTitle')}
                      hint={masterEdition.hasEditions
                        ? undefined
                        : t('spiritRequest.form.existingSpirit.editionTypeByAdmin')}
                    />
                    <div>
                      <label className={LABEL_CLS} htmlFor="edition-value-ko">
                        {t('spiritRequest.form.existingSpirit.editionValueKoLabel')} <RequiredMark />
                      </label>
                      <input
                        id="edition-value-ko"
                        type="text"
                        value={editionValue}
                        onChange={(e) => setEditionValue(e.target.value)}
                        maxLength={100}
                        placeholder={t('spiritRequest.form.existingSpirit.editionValueKoPlaceholder')}
                        className={`${FIELD_CLS} ${editionErr ? 'border-red-400' : 'border-neutral-300'}`}
                      />
                      <p className="mt-1 text-[11px] text-neutral-400">
                        {t('spiritRequest.form.existingSpirit.editionValueKoHint')}
                      </p>
                      {editionErr && <p className="mt-1 text-xs text-red-500">{editionErr}</p>}
                    </div>
                    <div>
                      <label className={LABEL_CLS} htmlFor="edition-value-en">
                        {t('spiritRequest.form.existingSpirit.editionValueEnLabel')}
                      </label>
                      <input
                        id="edition-value-en"
                        type="text"
                        value={editionValueEn}
                        onChange={(e) => setEditionValueEn(e.target.value)}
                        maxLength={100}
                        placeholder={t('spiritRequest.form.existingSpirit.editionValueEnPlaceholder')}
                        className={`${FIELD_CLS} border-neutral-300`}
                      />
                      <p className="mt-1 text-[11px] text-neutral-400">
                        {t('spiritRequest.form.existingSpirit.editionValueEnHint')}
                      </p>
                    </div>
                  </div>
                )}

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
