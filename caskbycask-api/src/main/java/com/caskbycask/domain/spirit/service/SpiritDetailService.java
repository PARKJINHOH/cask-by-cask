package com.caskbycask.domain.spirit.service;

import com.caskbycask.domain.producer.dto.ProducerLogoResponse;
import com.caskbycask.domain.producer.repository.ProducerLogoImageRepository;
import com.caskbycask.domain.spirit.dto.*;
import com.caskbycask.domain.spirit.entity.*;
import com.caskbycask.domain.spirit.entity.enums.*;
import com.caskbycask.domain.spirit.repository.*;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional
public class SpiritDetailService {

    private final SpiritCommonDetailRepository  commonDetailRepo;
    private final SpiritWhiskyDetailRepository  whiskyDetailRepo;
    private final SpiritWineDetailRepository    wineDetailRepo;
    private final SpiritCognacDetailRepository  cognacDetailRepo;
    private final SpiritOtherDetailRepository   otherDetailRepo;
    private final ProducerLogoImageRepository   producerLogoImageRepository;
    private final ObjectMapper objectMapper;

    // ── 공통 상세 저장 (create / update 공통 upsert) ───────────

    public void saveCommonDetail(Spirit spirit, SpiritCommonDetailRequest req) {
        if (req == null) return;

        boolean isNas = Boolean.TRUE.equals(req.isNas());

        commonDetailRepo.findById(spirit.getId()).ifPresentOrElse(
            existing -> existing.update(
                isNas, req.ageStatement(), req.ageStatementMonths(),
                req.distilledDate(), req.bottledDate(),
                req.volumeMl(), req.abv(),
                req.bottleNo(), req.totalBottles()),
            () -> commonDetailRepo.save(SpiritCommonDetail.builder()
                .spirit(spirit)
                .isNas(isNas)
                .ageStatement(isNas ? null : req.ageStatement())
                .ageStatementMonths(isNas ? null : req.ageStatementMonths())
                .distilledDate(req.distilledDate())
                .bottledDate(req.bottledDate())
                .volumeMl(req.volumeMl())
                .abv(req.abv())
                .bottleNo(req.bottleNo())
                .totalBottles(req.totalBottles())
                .build())
        );
    }

    // ── 카테고리 상세 저장 (최초 등록) ────────────────────────

    public void saveCategoryDetail(Spirit spirit, CreateSpiritRequest req) {
        switch (spirit.getCategory()) {
            case WHISKY  -> saveWhiskyDetail(spirit, req.whiskyDetail());
            case WINE    -> {
                if (req.wineDetail() != null) saveWineDetail(spirit, req.wineDetail());
                else ensureWineDetail(spirit);
            }
            case COGNAC  -> saveCognacDetail(spirit, req.cognacDetail());
            case OTHER   -> saveOtherDetail(spirit, req.otherDetail());
        }
    }

    // ── 등록 요청 승인 시: 신청자 카테고리 핵심값만으로 상세 행 생성 ──
    // 신청자가 요청 시 고른 핵심값(스타일/와인종류/등급/주종)을 승인된 주류 상세에 자동 반영.
    // 이미 상세 행이 있거나 값이 없으면 건너뜀. 관리자는 이후 주류 수정에서 보완 가능.
    public void saveCategoryCore(Spirit spirit,
                                 WhiskyStyle whiskyStyle, String whiskyStyleOther,
                                 WineType wineType,
                                 CognacGrade cognacGrade, OtherSpiritType otherType) {
        switch (spirit.getCategory()) {
            case WHISKY -> {
                if (whiskyStyle != null && whiskyDetailRepo.findById(spirit.getId()).isEmpty()) {
                    Map<String, Object> extra = new LinkedHashMap<>();
                    extra.put("styleOther", whiskyStyle == WhiskyStyle.OTHER ? whiskyStyleOther : null);
                    whiskyDetailRepo.save(SpiritWhiskyDetail.builder()
                        .spirit(spirit).style(whiskyStyle).extraData(serialize(extra)).build());
                }
            }
            case WINE -> {
                if (wineType != null && wineDetailRepo.findById(spirit.getId()).isEmpty()) {
                    SpiritWineDetail detail = wineDetailRepo.save(SpiritWineDetail.builder()
                        .spirit(spirit)
                        .wineType(wineType)
                        .vintageStatus(spirit.getVintageYear() != null
                                ? WineVintageStatus.VINTAGE
                                : WineVintageStatus.UNKNOWN)
                        .build());
                    spirit.attachWineDetail(detail);
                }
            }
            case COGNAC -> {
                if (cognacGrade != null && cognacDetailRepo.findById(spirit.getId()).isEmpty())
                    cognacDetailRepo.save(SpiritCognacDetail.builder()
                        .spirit(spirit).grade(cognacGrade).build());
            }
            case OTHER -> {
                if (otherType != null && otherDetailRepo.findById(spirit.getId()).isEmpty())
                    otherDetailRepo.save(SpiritOtherDetail.builder()
                        .spirit(spirit).otherType(otherType).build());
            }
        }
    }

    // ── 카테고리 상세 수정 ─────────────────────────────────────

    /**
     * @param prevCategory 수정 전 카테고리 (spirit.update() 호출 전에 캡처해야 함)
     */
    public void updateCategoryDetail(Spirit spirit,
                                     SpiritCategory prevCategory,
                                     UpdateSpiritRequest req) {

        SpiritCategory newCategory = req.category() != null ? req.category() : prevCategory;

        // 카테고리 변경 → 기존 카테고리 상세 행 명시적 삭제
        if (newCategory != prevCategory) {
            deleteCategoryDetail(spirit.getId(), prevCategory);
        }

        // 요청에 포함된 경우에만 갱신 (null = 변경 없음)
        switch (newCategory) {
            case WHISKY  -> { if (req.whiskyDetail()  != null) saveWhiskyDetail(spirit,  req.whiskyDetail()); }
            case WINE    -> {
                if (req.wineDetail() != null) saveWineDetail(spirit, req.wineDetail());
                else if (newCategory != prevCategory) ensureWineDetail(spirit);
            }
            case COGNAC  -> { if (req.cognacDetail()  != null) saveCognacDetail(spirit,  req.cognacDetail()); }
            case OTHER   -> { if (req.otherDetail()   != null) saveOtherDetail(spirit,   req.otherDetail()); }
        }
    }

    // ── 카테고리 상세 개별 저장 ────────────────────────────────

    public void saveWhiskyDetail(Spirit spirit, WhiskyDetailRequest req) {
        if (req == null) return;

        boolean isPeated = Boolean.TRUE.equals(req.isPeated());

        // 사용된 캐스크 (복수). OTHER 포함 시에만 직접 입력값 보존.
        List<WhiskyCaskType> caskTypes = req.caskTypes() != null ? req.caskTypes() : List.of();
        boolean hasOther = caskTypes.contains(WhiskyCaskType.OTHER);
        // 피니시 캐스크 — caskTypes 의 부분집합만 보존(선택 해제된 캐스크의 피니시 표시는 무의미).
        List<WhiskyCaskType> caskFinishes = (req.caskFinishes() != null ? req.caskFinishes() : List.<WhiskyCaskType>of())
                .stream().filter(caskTypes::contains).toList();

        Map<String, Object> extra = new LinkedHashMap<>();
        extra.put("caskTypes", caskTypes.stream().map(Enum::name).toList());
        extra.put("caskFinishes", caskFinishes.stream().map(Enum::name).toList());
        extra.put("caskTypeOther", hasOther ? req.caskTypeOther() : null);
        extra.put("caskDetails", req.caskDetails());
        extra.put("caskNo", req.caskNo());
        extra.put("notes", req.notes());
        // 스타일 직접 입력은 style=OTHER 일 때만 보존
        extra.put("styleOther", req.style() == WhiskyStyle.OTHER ? req.styleOther() : null);
        extra.put("brandName", req.brandName());
        String extraJson = serialize(extra);

        whiskyDetailRepo.findById(spirit.getId()).ifPresentOrElse(
            existing -> existing.update(
                req.style(), req.bottlingType(),
                req.isNonChillFiltered(), req.isNaturalColour(), req.isSingleCask(),
                req.isCaskStrength(), req.isPeated(), isPeated ? req.phenolPpm() : null,
                isPeated ? req.phenolPpmMin() : null, isPeated ? req.phenolPpmMax() : null,
                extraJson),
            () -> whiskyDetailRepo.save(SpiritWhiskyDetail.builder()
                .spirit(spirit)
                .style(req.style())
                .bottlingType(req.bottlingType())
                .isNonChillFiltered(req.isNonChillFiltered())
                .isNaturalColour(req.isNaturalColour())
                .isSingleCask(req.isSingleCask())
                .isCaskStrength(req.isCaskStrength())
                .isPeated(req.isPeated())
                .phenolPpm(isPeated ? req.phenolPpm() : null)
                .phenolPpmMin(isPeated ? req.phenolPpmMin() : null)
                .phenolPpmMax(isPeated ? req.phenolPpmMax() : null)
                .extraData(extraJson)
                .build())
        );
    }

    public void saveWineDetail(Spirit spirit, WineDetailRequest req) {
        if (req == null) return;

        // 포도 품종 비율 합계 검증
        if (req.grapeVarieties() != null) {
            int total = req.grapeVarieties().stream()
                    .mapToInt(g -> g.percentage() != null ? g.percentage() : 0)
                    .sum();
            if (total > 100) throw new CustomException(ErrorCode.INVALID_GRAPE_PERCENTAGE);
        }

        boolean isOakAged = Boolean.TRUE.equals(req.isOakAged());
        Map<String, Object> extra = new LinkedHashMap<>();
        extra.put("grapeVarieties", req.grapeVarieties());
        extra.put("appellationDesignation", req.appellationDesignation());
        extra.put("soilType", req.soilType());
        extra.put("altitudeM", req.altitudeM());
        extra.put("harvestMethod", req.harvestMethod());
        extra.put("fermentationVessel", req.fermentationVessel());
        extra.put("oakType", isOakAged ? req.oakType() : null);
        extra.put("oakAgedMonths", isOakAged ? req.oakAgedMonths() : null);
        extra.put("notes", req.notes());
        // 관능(맛) 지표는 전용 컬럼으로 저장 (검색/필터 대상) — extraData 에는 넣지 않음
        String extraJson = serialize(extra);

        wineDetailRepo.findById(spirit.getId()).ifPresentOrElse(
            existing -> {
                existing.update(
                        req.wineType(),
                        req.vintageStatus() != null ? req.vintageStatus() : existing.getVintageStatus(),
                        req.isOakAged(), req.isNaturalWine(),
                        req.certification(), req.sweetness(), req.body(), req.acidity(), req.tannin(),
                        extraJson);
                spirit.attachWineDetail(existing);
            },
            () -> {
                SpiritWineDetail detail = wineDetailRepo.save(SpiritWineDetail.builder()
                        .spirit(spirit)
                        .wineType(req.wineType())
                        .vintageStatus(req.vintageStatus() != null
                                ? req.vintageStatus()
                                : (spirit.getVintageYear() != null
                                    ? WineVintageStatus.VINTAGE
                                    : WineVintageStatus.UNKNOWN))
                        .isOakAged(req.isOakAged())
                        .isNaturalWine(req.isNaturalWine())
                        .certification(req.certification())
                        .sweetness(req.sweetness())
                        .body(req.body())
                        .acidity(req.acidity())
                        .tannin(req.tannin())
                        .extraData(extraJson)
                        .build());
                spirit.attachWineDetail(detail);
            }
        );
    }

    private void ensureWineDetail(Spirit spirit) {
        if (wineDetailRepo.findById(spirit.getId()).isPresent()) {
            return;
        }
        SpiritWineDetail detail = wineDetailRepo.save(SpiritWineDetail.builder()
                .spirit(spirit)
                .vintageStatus(spirit.getVintageYear() != null
                        ? WineVintageStatus.VINTAGE
                        : WineVintageStatus.UNKNOWN)
                .build());
        spirit.attachWineDetail(detail);
    }

    private void saveCognacDetail(Spirit spirit, CognacDetailRequest req) {
        if (req == null) return;

        List<CruCompositionRequest> composition = normalizeCruComposition(req.cruComposition());

        Map<String, Object> extra = new LinkedHashMap<>();
        extra.put("blendDetail", req.blendDetail());
        extra.put("vintageYear", req.vintageYear());
        extra.put("ageYears", req.ageYears());
        extra.put("oakTypes", req.oakTypes());
        extra.put("cruComposition", composition);
        extra.put("caskFinish", req.caskFinish());
        extra.put("notes", req.notes());
        String extraJson = serialize(extra);

        // 대표 크뤼 — 구성을 보냈으면 비율이 가장 높은 크뤼로 덮어쓴다.
        // cru 컬럼만 보는 기존 소비처(상세 표시, 향후 필터)를 그대로 살리기 위함.
        CognacCru cru = representativeCru(composition, req.cru());

        cognacDetailRepo.findById(spirit.getId()).ifPresentOrElse(
            existing -> existing.update(req.grade(), cru, req.isFineChampagne(), extraJson),
            () -> cognacDetailRepo.save(SpiritCognacDetail.builder()
                .spirit(spirit)
                .grade(req.grade())
                .cru(cru)
                .isFineChampagne(req.isFineChampagne())
                .extraData(extraJson)
                .build())
        );
    }

    /** 빈 행 제거 후 크뤼 중복·비율 합계(100% 이하)를 검증한다. */
    private List<CruCompositionRequest> normalizeCruComposition(List<CruCompositionRequest> rows) {
        if (rows == null) return null;

        List<CruCompositionRequest> cleaned = rows.stream()
                .filter(r -> r != null && r.cru() != null)
                .toList();
        if (cleaned.isEmpty()) return null;

        long distinct = cleaned.stream().map(CruCompositionRequest::cru).distinct().count();
        if (distinct != cleaned.size()) throw new CustomException(ErrorCode.DUPLICATE_CRU_COMPOSITION);

        int total = cleaned.stream()
                .mapToInt(r -> r.percentage() != null ? r.percentage() : 0)
                .sum();
        if (total > 100) throw new CustomException(ErrorCode.INVALID_CRU_PERCENTAGE);

        return cleaned;
    }

    /**
     * 구성 중 비율이 가장 높은 크뤼. 비율이 전부 미상이면 첫 번째 행을 쓴다.
     * 구성이 비어 있으면 요청의 단일 {@code cru} 를 그대로 둔다.
     */
    private CognacCru representativeCru(List<CruCompositionRequest> composition, CognacCru fallback) {
        if (composition == null || composition.isEmpty()) return fallback;
        return composition.stream()
                .max(Comparator.comparingInt(r -> r.percentage() != null ? r.percentage() : 0))
                .map(CruCompositionRequest::cru)
                .orElse(fallback);
    }

    private void saveOtherDetail(Spirit spirit, OtherDetailRequest req) {
        if (req == null) return;

        Map<String, Object> extra = new LinkedHashMap<>();
        extra.put("mainIngredient", req.mainIngredient());
        extra.put("productionMethod", req.productionMethod());
        extra.put("notes", req.notes());
        extra.put("styleClassification", req.styleClassification());
        extra.put("caskType", req.caskType());
        extra.put("originDesignation", req.originDesignation());
        String extraJson = serialize(extra);

        otherDetailRepo.findById(spirit.getId()).ifPresentOrElse(
            existing -> existing.update(req.otherType(), extraJson),
            () -> otherDetailRepo.save(SpiritOtherDetail.builder()
                .spirit(spirit)
                .otherType(req.otherType())
                .extraData(extraJson)
                .build())
        );
    }

    private void deleteCategoryDetail(Long spiritId, SpiritCategory category) {
        switch (category) {
            case WHISKY  -> whiskyDetailRepo.findById(spiritId).ifPresent(whiskyDetailRepo::delete);
            case WINE    -> wineDetailRepo.findById(spiritId).ifPresent(wineDetailRepo::delete);
            case COGNAC  -> cognacDetailRepo.findById(spiritId).ifPresent(cognacDetailRepo::delete);
            case OTHER   -> otherDetailRepo.findById(spiritId).ifPresent(otherDetailRepo::delete);
        }
    }

    // ── 응답 DTO 빌더 ─────────────────────────────────────────

    @Transactional(readOnly = true)
    public SpiritDetailResponse buildFullDetailResponse(Spirit spirit,
                                                         List<SpiritImageResponse> images,
                                                         List<SpiritVariantResponse> variants) {
        SpiritCommonDetailResponse commonDetail =
                SpiritCommonDetailResponse.from(spirit.getCommonDetail());

        WhiskyDetailResponse  whiskyDetail  = null;
        WineDetailResponse    wineDetail    = null;
        CognacDetailResponse  cognacDetail  = null;
        OtherDetailResponse   otherDetail   = null;

        switch (spirit.getCategory()) {
            case WHISKY  -> whiskyDetail  = buildWhiskyDetailResponse(spirit.getWhiskyDetail());
            case WINE    -> wineDetail    = buildWineDetailResponse(spirit.getWineDetail());
            case COGNAC  -> cognacDetail  = buildCognacDetailResponse(spirit.getCognacDetail());
            case OTHER   -> otherDetail   = buildOtherDetailResponse(spirit.getOtherDetail());
        }

        List<ProducerLogoResponse> producerLogoImages = spirit.getProducer() != null
                ? producerLogoImageRepository
                        .findByProducerIdOrderBySortOrderAscIdAsc(spirit.getProducer().getId()).stream()
                        .map(ProducerLogoResponse::from)
                        .toList()
                : List.of();

        return SpiritDetailResponse.of(spirit, images, producerLogoImages,
                commonDetail, whiskyDetail, wineDetail, cognacDetail, otherDetail, variants);
    }

    /** 하위 에디션의 위스키 상세 응답 빌드 (WHISKY 카테고리일 때만, 아니면 null). 연관 술 목록 프리필용. */
    @Transactional(readOnly = true)
    public WhiskyDetailResponse buildVariantWhiskyDetail(Spirit spirit) {
        return spirit.getCategory() == SpiritCategory.WHISKY
                ? buildWhiskyDetailResponse(spirit.getWhiskyDetail())
                : null;
    }

    /** 하위 빈티지의 와인 상세 응답 빌드 (WINE 카테고리일 때만, 아니면 null). */
    @Transactional(readOnly = true)
    public WineDetailResponse buildVariantWineDetail(Spirit spirit) {
        return spirit.getCategory() == SpiritCategory.WINE
                ? buildWineDetailResponse(spirit.getWineDetail())
                : null;
    }

    private WhiskyDetailResponse buildWhiskyDetailResponse(SpiritWhiskyDetail detail) {
        if (detail == null) return null;
        Map<String, Object> extra = parseExtra(detail.getExtraData());
        return new WhiskyDetailResponse(
                detail.getStyle(), str(extra, "styleOther"), str(extra, "brandName"), detail.getBottlingType(),
                caskTypes(extra, "caskTypes"), caskTypes(extra, "caskFinishes"), str(extra, "caskTypeOther"),
                parseCaskDetails(extra, "caskDetails"),
                detail.getIsNonChillFiltered(), detail.getIsNaturalColour(),
                detail.getIsSingleCask(), detail.getIsCaskStrength(), detail.getIsPeated(),
                detail.getPhenolPpm(), detail.getPhenolPpmMin(), detail.getPhenolPpmMax(),
                str(extra, "caskNo"), str(extra, "notes")
        );
    }

    /** extraData[key] (문자열 배열) → WhiskyCaskType 목록. 알 수 없는 값은 무시. */
    private List<WhiskyCaskType> caskTypes(Map<String, Object> extra, String key) {
        if (extra == null || !(extra.get(key) instanceof List<?> list)) return List.of();
        return list.stream()
                .filter(x -> x instanceof String)
                .map(x -> {
                    try { return WhiskyCaskType.valueOf((String) x); }
                    catch (IllegalArgumentException e) { return null; }
                })
                .filter(Objects::nonNull)
                .toList();
    }

    /** extraData[key] (Map) → WhiskyCaskType -> List<String> 맵 파싱. */
    @SuppressWarnings("unchecked")
    private Map<WhiskyCaskType, List<String>> parseCaskDetails(Map<String, Object> extra, String key) {
        if (extra == null || !(extra.get(key) instanceof Map<?, ?> map)) return Map.of();
        Map<WhiskyCaskType, List<String>> result = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : map.entrySet()) {
            if (entry.getKey() instanceof String keyStr) {
                try {
                    WhiskyCaskType type = WhiskyCaskType.valueOf(keyStr);
                    if (entry.getValue() instanceof List<?> list) {
                        List<String> details = list.stream()
                                .filter(x -> x instanceof String)
                                .map(x -> (String) x)
                                .toList();
                        result.put(type, details);
                    }
                } catch (IllegalArgumentException ignored) {}
            }
        }
        return result;
    }

    private WineDetailResponse buildWineDetailResponse(SpiritWineDetail detail) {
        if (detail == null) return null;
        Map<String, Object> extra = parseExtra(detail.getExtraData());

        List<GrapeVarietyResponse> grapes = null;
        if (extra != null && extra.get("grapeVarieties") instanceof List<?> list) {
            grapes = list.stream()
                    .filter(g -> g instanceof Map<?, ?>)
                    .map(g -> {
                        Map<?, ?> m = (Map<?, ?>) g;
                        String name = m.get("name") instanceof String s ? s : null;
                        Integer pct  = m.get("percentage") instanceof Number n ? n.intValue() : null;
                        return new GrapeVarietyResponse(name, pct);
                    })
                    .toList();
        }

        return new WineDetailResponse(
                detail.getWineType(), detail.getVintageStatus(),
                detail.getIsOakAged(), detail.getIsNaturalWine(), detail.getCertification(),
                grapes,
                str(extra, "appellationDesignation"), str(extra, "soilType"),
                num(extra, "altitudeM"), str(extra, "harvestMethod"),
                str(extra, "fermentationVessel"), str(extra, "oakType"),
                num(extra, "oakAgedMonths"),
                detail.getSweetness(), detail.getBody(),
                detail.getAcidity(), detail.getTannin(),
                str(extra, "notes")
        );
    }

    private CognacDetailResponse buildCognacDetailResponse(SpiritCognacDetail detail) {
        if (detail == null) return null;
        Map<String, Object> extra = parseExtra(detail.getExtraData());

        // 크뤼 구성이 없는 기존 행은 단일 cru 컬럼을 1줄짜리 구성으로 승격시켜 내려준다.
        List<CruCompositionResponse> composition = cruCompositionFromExtra(extra);
        if (composition.isEmpty() && detail.getCru() != null) {
            composition = List.of(new CruCompositionResponse(detail.getCru(), null));
        }

        return new CognacDetailResponse(
                detail.getGrade(), detail.getCru(), composition, detail.getIsFineChampagne(),
                str(extra, "blendDetail"),
                num(extra, "vintageYear"), num(extra, "ageYears"),
                cognacOakTypes(extra), str(extra, "caskFinish"),
                str(extra, "notes")
        );
    }

    private List<CruCompositionResponse> cruCompositionFromExtra(Map<String, Object> extra) {
        if (extra == null || !(extra.get("cruComposition") instanceof List<?> list)) return List.of();
        return list.stream()
                .filter(r -> r instanceof Map<?, ?>)
                .map(r -> {
                    Map<?, ?> m = (Map<?, ?>) r;
                    CognacCru cru = m.get("cru") instanceof String s ? parseEnum(s, CognacCru.class) : null;
                    Integer pct   = m.get("percentage") instanceof Number n ? n.intValue() : null;
                    return cru == null ? null : new CruCompositionResponse(cru, pct);
                })
                .filter(Objects::nonNull)
                .toList();
    }

    /**
     * 오크 종류. 단수 {@code oakType} 문자열만 있던 과거 데이터는 1개짜리 배열로 승격시켜 읽는다
     * (해당 행이 다음에 저장될 때 자연히 신규 형식이 된다).
     */
    private List<CognacOakType> cognacOakTypes(Map<String, Object> extra) {
        List<CognacOakType> types = enumList(extra, "oakTypes", CognacOakType.class);
        if (!types.isEmpty()) return types;

        CognacOakType legacy = parseEnum(str(extra, "oakType"), CognacOakType.class);
        return legacy == null ? List.of() : List.of(legacy);
    }

    private OtherDetailResponse buildOtherDetailResponse(SpiritOtherDetail detail) {
        if (detail == null) return null;
        Map<String, Object> extra = parseExtra(detail.getExtraData());
        return new OtherDetailResponse(
                detail.getOtherType(),
                str(extra, "mainIngredient"),
                str(extra, "productionMethod"),
                str(extra, "notes"),
                str(extra, "styleClassification"),
                str(extra, "caskType"),
                str(extra, "originDesignation")
        );
    }

    // ── JSON 유틸 ─────────────────────────────────────────────

    private String serialize(Map<String, Object> map) {
        try {
            return objectMapper.writeValueAsString(map);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    private Map<String, Object> parseExtra(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    private String str(Map<String, Object> map, String key) {
        if (map == null) return null;
        return map.get(key) instanceof String s ? s : null;
    }

    private Integer num(Map<String, Object> map, String key) {
        if (map == null) return null;
        return map.get(key) instanceof Number n ? n.intValue() : null;
    }

    /** extra_data 의 문자열 배열을 enum 리스트로. 모르는 값은 조용히 버린다. */
    private <E extends Enum<E>> List<E> enumList(Map<String, Object> map, String key, Class<E> type) {
        if (map == null || !(map.get(key) instanceof List<?> list)) return List.of();
        return list.stream()
                .map(v -> v instanceof String s ? parseEnum(s, type) : null)
                .filter(Objects::nonNull)
                .toList();
    }

    private <E extends Enum<E>> E parseEnum(String value, Class<E> type) {
        if (value == null || value.isBlank()) return null;
        try {
            return Enum.valueOf(type, value);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
