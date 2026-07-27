package com.caskbycask.domain.review.dto;

import com.caskbycask.domain.review.entity.Review;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record AdminReviewResponse(
        @Schema(description = "Review ID")
        Long id,
        @Schema(description = "Author user ID")
        Long userId,
        @Schema(description = "Author nickname")
        String userNickname,
        @Schema(description = "Spirit ID")
        Long spiritId,
        @Schema(description = "Spirit Korean name")
        String spiritNameKo,
        @Schema(description = "Spirit English name")
        String spiritNameEn,
        @Schema(description = "Master spirit ID")
        Long masterSpiritId,
        @Schema(description = "Nose score")
        BigDecimal noseScore,
        @Schema(description = "Taste score")
        BigDecimal tasteScore,
        @Schema(description = "Finish score")
        BigDecimal finishScore,
        @Schema(description = "Total score")
        BigDecimal totalScore,
        @Schema(description = "Comment")
        String comment,
        @Schema(description = "Nose note")
        String noseNote,
        @Schema(description = "Taste note")
        String tasteNote,
        @Schema(description = "Finish note")
        String finishNote,
        @Schema(description = "Hidden flag")
        Boolean isHidden,
        @Schema(description = "Report count")
        Integer reportCount,
        @Schema(description = "Created at")
        LocalDateTime createdAt,
        List<ReviewImageResponse> images
) {
    public static AdminReviewResponse from(Review review) {
        return from(review, List.of());
    }

    public static AdminReviewResponse from(
            Review review, List<ReviewImageResponse> images) {
        return new AdminReviewResponse(
                review.getId(),
                review.getUser().getId(),
                review.getUser().getNickname(),
                review.getSpirit().getId(),
                review.getSpirit().getNameKo(),
                review.getSpirit().getNameEn(),
                review.getSpirit().getParent() != null
                        ? review.getSpirit().getParent().getId()
                        : review.getSpirit().getId(),
                review.getNoseScore(),
                review.getTasteScore(),
                review.getFinishScore(),
                review.getTotalScore(),
                review.getComment(),
                review.getNoseNote(),
                review.getTasteNote(),
                review.getFinishNote(),
                review.getIsHidden(),
                review.getReportCount(),
                review.getCreatedAt(),
                images == null ? List.of() : images
        );
    }
}
