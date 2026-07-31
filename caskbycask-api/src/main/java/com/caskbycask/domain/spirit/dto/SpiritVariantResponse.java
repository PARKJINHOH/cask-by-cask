package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.SpiritCommonDetail;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import com.caskbycask.domain.spirit.entity.enums.WineVintageStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

/**
 * 같은 이름의 다른 배치·병입(바코드) 제품 목록 항목.
 * 사용자 술 상세 화면의 "다른 배치 · 병입" 섹션에서 사용.
 */
public record SpiritVariantResponse(
        @Schema(description = "술 고유 ID")
        Long id,
        @Schema(description = "한글 제품명")
        String nameKo,
        @Schema(description = "영문 제품명")
        String nameEn,
        @Schema(description = "카테고리")
        SpiritCategory category,
        @Schema(description = "빈티지")
        Integer vintageYear,
        @Schema(description = "와인 빈티지 상태")
        WineVintageStatus vintageStatus,
        @Schema(description = "알코올 도수 %")
        BigDecimal abv,
        @Schema(description = "용량 ml")
        Integer volumeMl,
        @Schema(description = "배치 번호")
        String batchNo,
        @Schema(description = "병 번호")
        String bottleNo,
        @Schema(description = "병입 연월 (YYYY-MM)")
        String bottledDate,
        @Schema(description = "전체 리뷰 평균 점수")
        BigDecimal avgScore,
        @Schema(description = "리뷰 수")
        Integer reviewCount,
        @Schema(description = "대표 이미지 URL")
        String primaryImageUrl,
        @Schema(description = "에디션 유형")
        VariantType variantType,
        @Schema(description = "에디션 식별 값")
        String variantValue,
        @Schema(description = "에디션 식별 값(영문)")
        String variantValueEn,
        @Schema(description = "에디션 목록 표시용 시리즈 식별자")
        String seriesIdentifier,
        @Schema(description = "에디션 목록 표시용 시리즈 식별자(영문)")
        String seriesIdentifierEn,
        @Schema(description = "하위 에디션 표시 순서")
        Integer displayOrder,
        @Schema(description = "공통 상세 정보 (관리자 수정 폼 프리필용)")
        SpiritCommonDetailResponse commonDetail,
        @Schema(description = "위스키 상세 (관리자 수정 폼 프리필용, category=WHISKY 전용)")
        WhiskyDetailResponse whiskyDetail
) {
    /** 위스키 상세까지 포함한 전체 응답 (관리자 상세 화면 — 에디션 수정 폼 프리필) */
    public static SpiritVariantResponse of(Spirit spirit, String primaryImageUrl,
                                           SpiritCommonDetailResponse commonDetail,
                                           WhiskyDetailResponse whiskyDetail) {
        SpiritCommonDetail cd = spirit.getCommonDetail();
        return new SpiritVariantResponse(
                spirit.getId(),
                spirit.getNameKo(),
                spirit.getNameEn(),
                spirit.getCategory(),
                spirit.getVintageYear(),
                spirit.getCategory() == SpiritCategory.WINE && spirit.getWineDetail() != null
                        ? spirit.getWineDetail().getVintageStatus()
                        : null,
                spirit.getAbv(),
                spirit.getVolumeMl(),
                cd != null ? cd.getBatchNo() : null,
                cd != null ? cd.getBottleNo() : null,
                cd != null ? cd.getBottledDate() : null,
                spirit.getAvgScore(),
                spirit.getReviewCount(),
                primaryImageUrl,
                spirit.getVariantType(),
                spirit.getVariantValue(),
                spirit.getVariantValueEn(),
                spirit.getSeriesIdentifier(),
                spirit.getSeriesIdentifierEn(),
                spirit.getDisplayOrder(),
                commonDetail,
                whiskyDetail
        );
    }
}
