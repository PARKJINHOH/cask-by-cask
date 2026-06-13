package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;

public record SpiritListResponse(
        @Schema(description = "술 고유 ID")
        Long id,
        @Schema(description = "한글 제품명")
        String nameKo,
        @Schema(description = "영문 제품명")
        String nameEn,
        @Schema(description = "카테고리")
        SpiritCategory category,
        @Schema(description = "생산 국가")
        String country,
        @Schema(description = "알코올 도수 %")
        BigDecimal abv,
        @Schema(description = "전체 리뷰 평균 점수")
        BigDecimal avgScore,
        @Schema(description = "리뷰 수")
        Integer reviewCount,
        @Schema(description = "대표 이미지 URL")
        String primaryImageUrl,
        @Schema(description = "공개 상태 (ACTIVE, HIDDEN, PENDING)")
        SpiritStatus status
) {
    public static SpiritListResponse of(Spirit spirit, String primaryImageUrl) {
        return new SpiritListResponse(
                spirit.getId(),
                spirit.getNameKo(),
                spirit.getNameEn(),
                spirit.getCategory(),
                spirit.getCountry(),
                spirit.getAbv(),
                spirit.getAvgScore(),
                spirit.getReviewCount(),
                primaryImageUrl,
                spirit.getStatus()
        );
    }
}
