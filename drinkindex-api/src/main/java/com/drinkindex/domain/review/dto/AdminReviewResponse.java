package com.drinkindex.domain.review.dto;

import com.drinkindex.domain.review.entity.Review;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AdminReviewResponse(
        Long id,
        Long userId,
        String userNickname,
        Long spiritId,
        String spiritNameKo,
        BigDecimal noseScore,
        BigDecimal tasteScore,
        BigDecimal finishScore,
        BigDecimal totalScore,
        String comment,
        Boolean isHidden,
        Integer reportCount,
        LocalDateTime createdAt
) {
    public static AdminReviewResponse from(Review review) {
        return new AdminReviewResponse(
                review.getId(),
                review.getUser().getId(),
                review.getUser().getNickname(),
                review.getSpirit().getId(),
                review.getSpirit().getNameKo(),
                review.getNoseScore(),
                review.getTasteScore(),
                review.getFinishScore(),
                review.getTotalScore(),
                review.getComment(),
                review.getIsHidden(),
                review.getReportCount(),
                review.getCreatedAt()
        );
    }
}
