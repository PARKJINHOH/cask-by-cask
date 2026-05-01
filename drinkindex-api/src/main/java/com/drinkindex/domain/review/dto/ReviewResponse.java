package com.drinkindex.domain.review.dto;

import com.drinkindex.domain.review.entity.Review;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ReviewResponse(
        Long id,
        Long userId,
        String nickname,
        BigDecimal noseScore,
        BigDecimal tasteScore,
        BigDecimal finishScore,
        BigDecimal totalScore,
        String comment,
        LocalDateTime createdAt
) {
    public static ReviewResponse from(Review review) {
        return new ReviewResponse(
                review.getId(),
                review.getUser().getId(),
                review.getUser().getNickname(),
                review.getNoseScore(),
                review.getTasteScore(),
                review.getFinishScore(),
                review.getTotalScore(),
                review.getComment(),
                review.getCreatedAt()
        );
    }
}
