package com.caskbycask.domain.spirit.service;

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

import java.time.Year;
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
    private final ObjectMapper objectMapper;

    // ── 공통 상세 저장 (create / update 공통 upsert) ───────────

    public void saveCommonDetail(Spirit spirit, SpiritCommonDetailRequest req) {
        if (req == null) return;

        boolean isNas = Boolean.TRUE.equals(req.isNas());

        commonDetailRepo.findById(spirit.getId()).ifPresentOrElse(
            existing -> existing.update(
                isNas, req.ageStatement(),
                req.distilledDate(), req.bottledDate(), req.releaseDate(),
                req.volumeMl(), req.abv(),
                req.bottleNo(), req.batchNo(), req.totalBottles()),
            () -> commonDetailRepo.save(SpiritCommonDetail.builder()
                .spirit(spirit)
                .isNas(isNas)
                .ageStatement(isNas ? null : req.ageStatement())
                .distilledDate(req.distilledDate())
                .bottledDate(req.bottledDate())
                .releaseDate(req.releaseDate())
                .volumeMl(req.volumeMl())
                .abv(req.abv())
                .bottleNo(req.bottleNo())
                .batchNo(req.batchNo())
                .totalBottles(req.totalBottles())
                .build())
        );
    }

    // ── 카테고리 상세 저장 (최초 등록) ────────────────────────

    public void saveCategoryDetail(Spirit spirit, CreateSpiritRequest req) {
        switch (spirit.getCategory()) {
            case WHISKY  -> saveWhiskyDetail(spirit, req.whiskyDetail());
            case WINE    -> saveWineDetail(spirit, req.wineDetail());
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
                if (wineType != null && wineDetailRepo.findById(spirit.getId()).isEmpty())
                    wineDetailRepo.save(SpiritWineDetail.builder()
                        .spirit(spirit).wineType(wineType).build());
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
            case WINE    -> { if (req.wineDetail()    != null) saveWineDetail(spirit,    req.wineDetail()); }
            case COGNAC  -> { if (req.cognacDetail()  != null) saveCognacDetail(spirit,  req.cognacDetail()); }
            case OTHER   -> { if (req.otherDetail()   != null) saveOtherDetail(spirit,   req.otherDetail()); }
        }
    }

    // ── 카테고리 상세 개별 저장 ────────────────────────────────

    private void saveWhiskyDetail(Spirit spirit, WhiskyDetailRequest req) {
        if (req == null) return;

        boolean isPeated = Boolean.TRUE.equals(req.isPeated());

        // 사용된 캐스크 (복수). OTHER 포함 시에만 직접 입력값 보존.
        List<WhiskyCaskType> caskTypes = req.caskTypes() != null ? req.caskTypes() : List.of();
        boolean hasOther = caskTypes.contains(WhiskyCaskType.OTHER);
        // 피니시 캐스크 — caskTypes 의 부분집합만 보존(선택 해제된 캐스크의 피니시 표시는 무의미).
        List<WhiskyCaskType> caskFinishes = (req.caskFinishes() != null ? req.caskFinishes() : List.<WhiskyCaskType>of())
                .stream().filter(caskTypes::contains).toList();

        Map<String, Object> extra = new LinkedHashMap<>();
        extra.put("caskNo", req.caskNo());
        extra.put("caskTypes", caskTypes.stream().map(Enum::name).toList());
        extra.put("caskFinishes", caskFinishes.stream().map(Enum::name).toList());
        extra.put("caskTypeOther", hasOther ? req.caskTypeOther() : null);
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
                .extraData(extraJson)
                .build())
        );
    }

    private void saveWineDetail(Spirit spirit, WineDetailRequest req) {
        if (req == null) return;

        // 포도 품종 비율 합계 검증
        if (req.grapeVarieties() != null) {
            int total = req.grapeVarieties().stream()
                    .mapToInt(g -> g.percentage() != null ? g.percentage() : 0)
                    .sum();
            if (total > 100) throw new CustomException(ErrorCode.INVALID_GRAPE_PERCENTAGE);
        }

        // 빈티지 연도 상한 검증
        if (req.vintage() != null && req.vintage() > Year.now().getValue()) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
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
        String extraJson = serialize(extra);

        wineDetailRepo.findById(spirit.getId()).ifPresentOrElse(
            existing -> existing.update(
                req.wineType(), req.vintage(), req.isOakAged(), req.isNaturalWine(),
                req.certification(), extraJson),
            () -> wineDetailRepo.save(SpiritWineDetail.builder()
                .spirit(spirit)
                .wineType(req.wineType())
                .vintage(req.vintage())
                .isOakAged(req.isOakAged())
                .isNaturalWine(req.isNaturalWine())
                .certification(req.certification())
                .extraData(extraJson)
                .build())
        );
    }

    private void saveCognacDetail(Spirit spirit, CognacDetailRequest req) {
        if (req == null) return;

        Map<String, Object> extra = new LinkedHashMap<>();
        extra.put("blendDetail", req.blendDetail());
        String extraJson = serialize(extra);

        cognacDetailRepo.findById(spirit.getId()).ifPresentOrElse(
            existing -> existing.update(req.grade(), req.cru(), req.isFineChampagne(), extraJson),
            () -> cognacDetailRepo.save(SpiritCognacDetail.builder()
                .spirit(spirit)
                .grade(req.grade())
                .cru(req.cru())
                .isFineChampagne(req.isFineChampagne())
                .extraData(extraJson)
                .build())
        );
    }

    private void saveOtherDetail(Spirit spirit, OtherDetailRequest req) {
        if (req == null) return;

        Map<String, Object> extra = new LinkedHashMap<>();
        extra.put("mainIngredient", req.mainIngredient());
        extra.put("productionMethod", req.productionMethod());
        extra.put("notes", req.notes());
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
                                                         List<SpiritImageResponse> images) {
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

        return SpiritDetailResponse.of(spirit, images,
                commonDetail, whiskyDetail, wineDetail, cognacDetail, otherDetail);
    }

    private WhiskyDetailResponse buildWhiskyDetailResponse(SpiritWhiskyDetail detail) {
        if (detail == null) return null;
        Map<String, Object> extra = parseExtra(detail.getExtraData());
        return new WhiskyDetailResponse(
                detail.getStyle(), str(extra, "styleOther"), str(extra, "brandName"), detail.getBottlingType(),
                caskTypes(extra, "caskTypes"), caskTypes(extra, "caskFinishes"), str(extra, "caskTypeOther"),
                detail.getIsNonChillFiltered(), detail.getIsNaturalColour(),
                detail.getIsSingleCask(), detail.getIsCaskStrength(), detail.getIsPeated(),
                detail.getPhenolPpm(),
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
                detail.getWineType(), detail.getVintage(),
                detail.getIsOakAged(), detail.getIsNaturalWine(), detail.getCertification(),
                grapes,
                str(extra, "appellationDesignation"), str(extra, "soilType"),
                num(extra, "altitudeM"), str(extra, "harvestMethod"),
                str(extra, "fermentationVessel"), str(extra, "oakType"),
                num(extra, "oakAgedMonths")
        );
    }

    private CognacDetailResponse buildCognacDetailResponse(SpiritCognacDetail detail) {
        if (detail == null) return null;
        Map<String, Object> extra = parseExtra(detail.getExtraData());
        return new CognacDetailResponse(
                detail.getGrade(), detail.getCru(), detail.getIsFineChampagne(),
                str(extra, "blendDetail")
        );
    }

    private OtherDetailResponse buildOtherDetailResponse(SpiritOtherDetail detail) {
        if (detail == null) return null;
        Map<String, Object> extra = parseExtra(detail.getExtraData());
        return new OtherDetailResponse(
                detail.getOtherType(),
                str(extra, "mainIngredient"),
                str(extra, "productionMethod"),
                str(extra, "notes")
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
}
