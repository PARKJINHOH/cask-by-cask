package com.caskbycask.domain.review.dto;

import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.seo.util.SpiritSlugUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record PublicReviewResponse(
        Long id,
        Long spiritId,
        Long parentSpiritId,
        String displayNameKo,
        String displayNameEn,
        String canonicalPathKo,
        String canonicalPathEn,
        String imageUrl,
        String nickname,
        BigDecimal noseScore,
        BigDecimal tasteScore,
        BigDecimal finishScore,
        BigDecimal totalScore,
        String noseNote,
        String tasteNote,
        String finishNote,
        String comment,
        LocalDateTime createdAt,
        List<ReviewImageResponse> images
) {
    public static PublicReviewResponse from(Review review, String imageUrl) {
        return from(review, imageUrl, List.of());
    }

    public static PublicReviewResponse from(Review review, String imageUrl,
                                            List<ReviewImageResponse> images) {
        var spirit = review.getSpirit();
        return new PublicReviewResponse(
                review.getId(),
                spirit.getId(),
                spirit.getParent() != null ? spirit.getParent().getId() : null,
                SpiritSlugUtils.displayNameKo(spirit),
                SpiritSlugUtils.displayNameEn(spirit),
                SpiritSlugUtils.canonicalPathKo(spirit),
                SpiritSlugUtils.canonicalPathEn(spirit),
                imageUrl,
                review.getUser().getNickname(),
                review.getNoseScore(),
                review.getTasteScore(),
                review.getFinishScore(),
                review.getTotalScore(),
                review.getNoseNote(),
                review.getTasteNote(),
                review.getFinishNote(),
                review.getComment(),
                review.getCreatedAt(),
                images == null ? List.of() : List.copyOf(images)
        );
    }
}
