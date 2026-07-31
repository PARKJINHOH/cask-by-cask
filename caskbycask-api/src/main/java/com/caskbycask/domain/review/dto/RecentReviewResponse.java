package com.caskbycask.domain.review.dto;

import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.seo.util.SpiritSlugUtils;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 메인 "최근 등록된 리뷰" 카드용 응답.
 * 표시 이름은 실제로 리뷰된 주류 기준이므로 에디션 리뷰는 시리즈·에디션 값(와인은 빈티지)이 접미어로 포함된다.
 */
public record RecentReviewResponse(
        @Schema(description = "리뷰 고유 ID")
        Long id,
        @Schema(description = "리뷰 대상 주류 ID (에디션 리뷰면 에디션 ID)")
        Long spiritId,
        @Schema(description = "주류 표시명(한글) — 에디션·빈티지 접미어 포함")
        String displayNameKo,
        @Schema(description = "주류 표시명(영문) — 에디션·빈티지 접미어 포함")
        String displayNameEn,
        @Schema(description = "KO canonical path")
        String canonicalPathKo,
        @Schema(description = "EN canonical path")
        String canonicalPathEn,
        @Schema(description = "대표 이미지 URL (에디션에 이미지가 없으면 마스터 이미지)")
        String imageUrl,
        @Schema(description = "작성자 닉네임")
        String nickname,
        @Schema(description = "총점 (Nose·Taste·Finish 평균)")
        BigDecimal totalScore,
        @Schema(description = "작성 일시")
        LocalDateTime createdAt
) {
    public static RecentReviewResponse from(Review review, String imageUrl) {
        var spirit = review.getSpirit();
        return new RecentReviewResponse(
                review.getId(),
                spirit.getId(),
                SpiritSlugUtils.displayNameKo(spirit),
                SpiritSlugUtils.displayNameEn(spirit),
                SpiritSlugUtils.canonicalPathKo(spirit),
                SpiritSlugUtils.canonicalPathEn(spirit),
                imageUrl,
                review.getUser().getNickname(),
                review.getTotalScore(),
                review.getCreatedAt()
        );
    }
}
