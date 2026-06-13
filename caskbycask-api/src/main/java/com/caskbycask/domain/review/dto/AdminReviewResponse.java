package com.caskbycask.domain.review.dto;

import com.caskbycask.domain.review.entity.Review;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record AdminReviewResponse(
        @Schema(description = "리뷰 고유 ID")
        Long id,
        @Schema(description = "작성자 사용자 ID")
        Long userId,
        @Schema(description = "작성자 닉네임")
        String userNickname,
        @Schema(description = "술 고유 ID")
        Long spiritId,
        @Schema(description = "술 한글명")
        String spiritNameKo,
        @Schema(description = "향(Nose) 점수")
        BigDecimal noseScore,
        @Schema(description = "맛(Taste) 점수")
        BigDecimal tasteScore,
        @Schema(description = "피니시(Finish) 점수")
        BigDecimal finishScore,
        @Schema(description = "총점 (Nose·Taste·Finish 평균)")
        BigDecimal totalScore,
        @Schema(description = "텍스트 코멘트")
        String comment,
        @Schema(description = "숨김 처리 여부 (신고 3회 이상 시 자동 true)")
        Boolean isHidden,
        @Schema(description = "신고 누적 횟수")
        Integer reportCount,
        @Schema(description = "작성 일시")
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
