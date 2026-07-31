package com.caskbycask.domain.review.dto;

import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.EnumMap;
import java.util.Map;

/**
 * 사용자 공개 리뷰의 카테고리별 개수.
 * 리뷰가 없는 카테고리도 0 으로 포함해 프론트 탭이 항상 동일한 구성을 유지하도록 한다.
 */
public record UserReviewCategoryCountResponse(
        @Schema(description = "전체 공개 리뷰 수")
        long total,
        @Schema(description = "카테고리별 리뷰 수 (WHISKY/COGNAC/WINE/OTHER 전부 포함, 없으면 0)")
        Map<SpiritCategory, Long> counts
) {
    public static UserReviewCategoryCountResponse from(Map<SpiritCategory, Long> counts) {
        Map<SpiritCategory, Long> filled = new EnumMap<>(SpiritCategory.class);
        long total = 0L;
        for (SpiritCategory category : SpiritCategory.values()) {
            long count = counts == null ? 0L : counts.getOrDefault(category, 0L);
            filled.put(category, count);
            total += count;
        }
        return new UserReviewCategoryCountResponse(total, filled);
    }
}
