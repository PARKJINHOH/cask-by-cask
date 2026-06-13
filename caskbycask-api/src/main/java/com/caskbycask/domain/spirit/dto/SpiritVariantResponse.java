package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.SpiritCommonDetail;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
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
        @Schema(description = "병입년도")
        Integer bottledYear,
        @Schema(description = "빈티지")
        Integer vintageYear,
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
        String primaryImageUrl
) {
    public static SpiritVariantResponse of(Spirit spirit, String primaryImageUrl) {
        SpiritCommonDetail cd = spirit.getCommonDetail();
        return new SpiritVariantResponse(
                spirit.getId(),
                spirit.getNameKo(),
                spirit.getNameEn(),
                spirit.getCategory(),
                spirit.getBottledYear(),
                spirit.getVintageYear(),
                spirit.getAbv(),
                spirit.getVolumeMl(),
                cd != null ? cd.getBatchNo() : null,
                cd != null ? cd.getBottleNo() : null,
                cd != null ? cd.getBottledDate() : null,
                spirit.getAvgScore(),
                spirit.getReviewCount(),
                primaryImageUrl
        );
    }
}
