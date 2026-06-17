package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record SpiritDetailResponse(

        @Schema(description = "술 고유 ID")
        Long id,
        @Schema(description = "한글 제품명")
        String nameKo,
        @Schema(description = "영문 제품명")
        String nameEn,
        @Schema(description = "카테고리")
        SpiritCategory category,
        @Schema(description = "증류소 ID")
        Long producerId,
        @Schema(description = "증류소 한글명")
        String producerNameKo,
        @Schema(description = "증류소 영문명")
        String producerNameEn,
        @Schema(description = "병입업체명")
        String bottler,
        @Schema(description = "병입 연도")
        Integer bottledYear,
        @Schema(description = "빈티지 연도")
        Integer vintageYear,
        @Schema(description = "알코올 도수 %")
        BigDecimal abv,
        @Schema(description = "용량 ml")
        Integer volumeMl,
        @Schema(description = "생산 국가")
        String country,
        @Schema(description = "생산 지역")
        String region,
        @Schema(description = "전체 리뷰 평균 점수")
        BigDecimal avgScore,
        @Schema(description = "리뷰 수")
        Integer reviewCount,
        @Schema(description = "공개 상태")
        SpiritStatus status,
        @Schema(description = "이미지 목록")
        List<SpiritImageResponse> images,
        @Schema(description = "등록 일시")
        LocalDateTime createdAt,
        @Schema(description = "최종 수정 일시")
        LocalDateTime updatedAt,

        // ── 상세 필드 ──────────────────────────────────────────
        @Schema(description = "공통 상세 정보")
        SpiritCommonDetailResponse commonDetail,
        @Schema(description = "위스키 상세 (category=WHISKY 전용)")
        WhiskyDetailResponse whiskyDetail,
        @Schema(description = "와인 상세 (category=WINE 전용)")
        WineDetailResponse wineDetail,
        @Schema(description = "꼬냑 상세 (category=COGNAC 전용)")
        CognacDetailResponse cognacDetail,
        @Schema(description = "기타 상세 (category=OTHER 전용)")
        OtherDetailResponse otherDetail,

        @Schema(description = "마스터 주류 ID")
        Long parentId,

        @Schema(description = "에디션 유형")
        VariantType variantType,

        @Schema(description = "에디션 식별 값")
        String variantValue,

        @Schema(description = "최소 도수")
        BigDecimal abvMin,

        @Schema(description = "최대 도수")
        BigDecimal abvMax,

        @Schema(description = "하위 에디션 목록")
        List<SpiritVariantResponse> variants
) {
    /** 상세 없이 기본 정보만 반환 (등록·수정 응답) */
    public static SpiritDetailResponse of(Spirit spirit, List<SpiritImageResponse> images) {
        return of(spirit, images, null, null, null, null, null, List.of());
    }

    /** 전체 상세 포함 응답 (GET /api/spirits/{id}) */
    public static SpiritDetailResponse of(Spirit spirit, List<SpiritImageResponse> images,
                                           SpiritCommonDetailResponse commonDetail,
                                           WhiskyDetailResponse whiskyDetail,
                                           WineDetailResponse wineDetail,
                                           CognacDetailResponse cognacDetail,
                                           OtherDetailResponse otherDetail,
                                           List<SpiritVariantResponse> variants) {
        return new SpiritDetailResponse(
                spirit.getId(),
                spirit.getNameKo(),
                spirit.getNameEn(),
                spirit.getCategory(),
                spirit.getProducer() != null ? spirit.getProducer().getId() : null,
                spirit.getProducer() != null ? spirit.getProducer().getNameKo() : null,
                spirit.getProducer() != null ? spirit.getProducer().getNameEn() : null,
                spirit.getBottler(),
                spirit.getBottledYear(),
                spirit.getVintageYear(),
                spirit.getAbv(),
                spirit.getVolumeMl(),
                spirit.getCountry(),
                spirit.getRegion(),
                spirit.getAvgScore(),
                spirit.getReviewCount(),
                spirit.getStatus(),
                images,
                spirit.getCreatedAt(),
                spirit.getUpdatedAt(),
                commonDetail,
                whiskyDetail,
                wineDetail,
                cognacDetail,
                otherDetail,
                spirit.getParent() != null ? spirit.getParent().getId() : null,
                spirit.getVariantType(),
                spirit.getVariantValue(),
                spirit.getAbvMin(),
                spirit.getAbvMax(),
                variants
        );
    }
}
