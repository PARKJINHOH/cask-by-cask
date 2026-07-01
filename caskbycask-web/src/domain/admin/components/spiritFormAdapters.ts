import type { CreateSpiritPayload, SpiritRegisterRequestDetail } from '@/domain/admin/types/admin.types'
import type { SpiritRegisterRequestForm, MySpiritRequestDetail, RequestVariantType } from '@/domain/spirit/types/spiritRequest.types'

// ══════════════════════════════════════════════════════════════════
//  useSpiritForm()(단일 소스) ↔ 사용자 등록 요청(평탄화 DTO) 변환
//  - 사용자 등록 요청 화면(SpiritRequestPage)이 관리자와 동일한 SpiritFormFields/
//    useSpiritForm을 그대로 쓰되, 백엔드 제출 형태(SpiritRegisterRequestForm)만 다르므로
//    이 두 함수가 그 차이를 흡수한다. 필드 추가/변경은 SpiritFormFields.tsx에서만 한다.
// ══════════════════════════════════════════════════════════════════

/** useSpiritForm().buildPayload() 결과 → 사용자 등록 요청 제출 DTO */
export function toSpiritRequestForm(payload: CreateSpiritPayload): SpiritRegisterRequestForm {
  const variant = payload.isVariantSplit ? payload.variants?.[0] : undefined

  // 위스키 에디션이 있으면 사용자가 '에디션 위스키 상세'(VariantItemCard)에 입력한 값(variant.*)이
  // 실제 상세값이다(에디션 whisky 는 상단 상세 카드가 숨겨지고 에디션 카드로 대체됨).
  // 평탄화 DTO 에는 에디션 상세 자리가 없으므로 — prefillFromRequest 가 평탄화 필드에서 에디션을
  // 복원하는 구조에 맞춰 — 에디션 상세를 상단(top-level) 필드에 합쳐 전송한다.
  // 단, 스타일/스타일기타/브랜드/병입구분은 항상 보이는 상단 카드에서 입력하므로
  // 에디션 값이 비어 있으면 상단 값을 유지한다.
  const common = variant?.commonDetail
    ? { ...(payload.commonDetail ?? {}), ...variant.commonDetail }
    : payload.commonDetail
  const whisky = variant?.whiskyDetail
    ? {
        ...(payload.whiskyDetail ?? {}),
        ...variant.whiskyDetail,
        style: variant.whiskyDetail.style || payload.whiskyDetail?.style || null,
        styleOther: variant.whiskyDetail.styleOther || payload.whiskyDetail?.styleOther || null,
        brandName: variant.whiskyDetail.brandName || payload.whiskyDetail?.brandName || null,
        bottlingType: variant.whiskyDetail.bottlingType || payload.whiskyDetail?.bottlingType || null,
      }
    : payload.whiskyDetail
  const abv = variant?.abv ?? payload.abv
  const abvMin = variant?.abvMin ?? payload.abvMin
  const abvMax = variant?.abvMax ?? payload.abvMax
  const volumeMl = variant?.volumeMl ?? payload.volumeMl

  return {
    nameKo: payload.nameKo,
    nameEn: payload.nameEn,
    category: payload.category,
    producerId: payload.producerId ?? null,
    bottler: payload.bottler ?? undefined,
    bottledYear: payload.bottledYear ?? null,
    vintageYear: payload.vintageYear ?? null,
    abv: abv ?? null,
    abvMin: abvMin ?? null,
    abvMax: abvMax ?? null,
    volumeMl: volumeMl ?? null,
    volumeMlMin: payload.volumeMlMin ?? null,
    volumeMlMax: payload.volumeMlMax ?? null,
    country: payload.country ?? undefined,
    region: payload.region ?? undefined,

    isNas: common?.isNas ?? undefined,
    ageStatement: common?.ageStatement ?? null,
    ageStatementMonths: common?.ageStatementMonths ?? null,
    ageStatementMin: common?.ageStatementMin ?? null,
    ageStatementMinMonths: common?.ageStatementMinMonths ?? null,
    ageStatementMax: common?.ageStatementMax ?? null,
    ageStatementMaxMonths: common?.ageStatementMaxMonths ?? null,
    distilledDate: common?.distilledDate ?? undefined,
    bottledDate: common?.bottledDate ?? undefined,
    releaseDate: common?.releaseDate ?? undefined,
    bottleNo: common?.bottleNo ?? undefined,
    batchNo: common?.batchNo ?? undefined,
    totalBottles: common?.totalBottles ?? null,

    whiskyStyle: (whisky?.style as SpiritRegisterRequestForm['whiskyStyle']) ?? undefined,
    whiskyStyleOther: whisky?.styleOther ?? undefined,
    brandName: whisky?.brandName ?? undefined,
    bottlingType: whisky?.bottlingType ?? undefined,
    whiskyNotes: whisky?.notes ?? undefined,
    caskTypes: whisky?.caskTypes ?? undefined,
    caskFinishes: whisky?.caskFinishes ?? undefined,
    caskTypeOther: whisky?.caskTypeOther ?? undefined,
    caskDetails: whisky?.caskDetails ?? undefined,
    isNonChillFiltered: whisky?.isNonChillFiltered ?? undefined,
    isNaturalColour: whisky?.isNaturalColour ?? undefined,
    isSingleCask: whisky?.isSingleCask ?? undefined,
    isCaskStrength: whisky?.isCaskStrength ?? undefined,
    isPeated: whisky?.isPeated ?? undefined,
    phenolPpm: whisky?.phenolPpm ?? null,
    phenolPpmMin: whisky?.phenolPpmMin ?? null,
    phenolPpmMax: whisky?.phenolPpmMax ?? null,

    wineType: (payload.wineDetail?.wineType as SpiritRegisterRequestForm['wineType']) ?? undefined,
    cognacGrade: (payload.cognacDetail?.grade as SpiritRegisterRequestForm['cognacGrade']) ?? undefined,
    otherType: (payload.otherDetail?.otherType as SpiritRegisterRequestForm['otherType']) ?? undefined,
    // 핵심값 외 나머지 상세 전체 보존 (와인 포도품종·산도, 꼬냑 크뤼·숙성연수, 기타 주원료 등)
    wineDetail: payload.wineDetail ?? null,
    cognacDetail: payload.cognacDetail ?? null,
    otherDetail: payload.otherDetail ?? null,

    variantType: (variant?.variantType ?? 'NONE') as RequestVariantType,
    variantValue: variant?.variantValue || null,
    variantValueEn: variant?.variantValueEn || null,
    seriesIdentifier: variant?.seriesIdentifier || null,
    seriesIdentifierEn: variant?.seriesIdentifierEn || null,
  }
}

/** 내 요청 상세(MySpiritRequestDetail, 평탄화) → useSpiritForm().prefillFromRequest()가 읽는 형태 */
export function toPrefillDetail(d: MySpiritRequestDetail): SpiritRegisterRequestDetail {
  return {
    id: d.id,
    requesterId: 0,
    requesterNickname: '',
    nameKo: d.nameKo,
    nameEn: d.nameEn,
    category: d.category,
    producerId: d.producerId ?? null,
    producerNameKo: d.producerNameKo ?? null,
    bottler: d.bottler ?? null,
    bottledYear: d.bottledYear ?? null,
    vintageYear: d.vintageYear ?? null,
    abv: d.abv ?? null,
    volumeMl: d.volumeMl ?? null,
    abvMin: d.abvMin ?? null,
    abvMax: d.abvMax ?? null,
    volumeMlMin: d.volumeMlMin ?? null,
    volumeMlMax: d.volumeMlMax ?? null,
    country: d.country ?? null,
    region: d.region ?? null,
    ageStatement: d.ageStatement ?? null,
    ageStatementMonths: d.ageStatementMonths ?? null,
    ageStatementMin: d.ageStatementMin ?? null,
    ageStatementMinMonths: d.ageStatementMinMonths ?? null,
    ageStatementMax: d.ageStatementMax ?? null,
    ageStatementMaxMonths: d.ageStatementMaxMonths ?? null,
    isNas: d.isNas ?? null,
    distilledDate: d.distilledDate ?? null,
    bottledDate: d.bottledDate ?? null,
    releaseDate: d.releaseDate ?? null,
    bottleNo: d.bottleNo ?? null,
    batchNo: d.batchNo ?? null,
    totalBottles: d.totalBottles ?? null,
    whiskyStyle: d.whiskyStyle ?? null,
    whiskyStyleOther: d.whiskyStyleOther ?? null,
    brandName: d.brandName ?? null,
    bottlingType: d.bottlingType ?? null,
    caskNo: null,
    whiskyNotes: d.whiskyNotes ?? null,
    caskTypes: d.caskTypes ?? null,
    caskFinishes: d.caskFinishes ?? null,
    caskTypeOther: d.caskTypeOther ?? null,
    caskDetails: d.caskDetails ?? null,
    isNonChillFiltered: d.isNonChillFiltered ?? null,
    isNaturalColour: d.isNaturalColour ?? null,
    isSingleCask: d.isSingleCask ?? null,
    isCaskStrength: d.isCaskStrength ?? null,
    isPeated: d.isPeated ?? null,
    phenolPpm: d.phenolPpm ?? null,
    phenolPpmMin: d.phenolPpmMin ?? null,
    phenolPpmMax: d.phenolPpmMax ?? null,
    wineType: d.wineType ?? null,
    cognacGrade: d.cognacGrade ?? null,
    otherType: d.otherType ?? null,
    wineDetail: d.wineDetail ?? null,
    cognacDetail: d.cognacDetail ?? null,
    otherDetail: d.otherDetail ?? null,
    imageUrls: d.imageUrls ?? [],
    note: d.note ?? null,
    variantType: d.variantType ?? null,
    variantValue: d.variantValue ?? null,
    variantValueEn: d.variantValueEn ?? null,
    seriesIdentifier: d.seriesIdentifier ?? null,
    seriesIdentifierEn: d.seriesIdentifierEn ?? null,
    status: d.status,
    rejectReason: null,
    createdAt: '',
    reviewedAt: null,
  }
}
