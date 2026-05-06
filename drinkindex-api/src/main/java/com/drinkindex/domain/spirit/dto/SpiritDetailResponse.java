package com.drinkindex.domain.spirit.dto;

import com.drinkindex.domain.spirit.entity.Spirit;
import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import com.drinkindex.domain.spirit.entity.enums.SpiritStatus;
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
        @Schema(description = "카테고리 (WHISKY, COGNAC, WINE 등)")
        SpiritCategory category,
        @Schema(description = "증류소 ID")
        Long distilleryId,
        @Schema(description = "증류소 한글명")
        String distilleryNameKo,
        @Schema(description = "증류소 영문명")
        String distilleryNameEn,
        @Schema(description = "병입업체명")
        String bottler,
        @Schema(description = "병입 연도")
        Integer bottledYear,
        @Schema(description = "빈티지 연도 (원액 수확 연도)")
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
        @Schema(description = "공개 상태 (ACTIVE, HIDDEN, PENDING)")
        SpiritStatus status,
        @Schema(description = "이미지 목록")
        List<SpiritImageResponse> images,
        @Schema(description = "등록 일시")
        LocalDateTime createdAt,
        @Schema(description = "최종 수정 일시")
        LocalDateTime updatedAt
) {
    public static SpiritDetailResponse of(Spirit spirit, List<SpiritImageResponse> images) {
        return new SpiritDetailResponse(
                spirit.getId(),
                spirit.getNameKo(),
                spirit.getNameEn(),
                spirit.getCategory(),
                spirit.getDistillery() != null ? spirit.getDistillery().getId() : null,
                spirit.getDistillery() != null ? spirit.getDistillery().getNameKo() : null,
                spirit.getDistillery() != null ? spirit.getDistillery().getNameEn() : null,
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
                spirit.getUpdatedAt()
        );
    }
}
