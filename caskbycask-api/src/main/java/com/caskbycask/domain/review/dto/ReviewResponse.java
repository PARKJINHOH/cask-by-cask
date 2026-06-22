package com.caskbycask.domain.review.dto;

import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.user.entity.enums.Role;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ReviewResponse(
        @Schema(description = "리뷰 고유 ID")
        Long id,
        @Schema(description = "작성자 사용자 ID")
        Long userId,
        @Schema(description = "작성자 닉네임")
        String nickname,
        @Schema(description = "술 고유 ID")
        Long spiritId,
        @Schema(description = "술 한글명")
        String spiritNameKo,
        @Schema(description = "술 영문명")
        String spiritNameEn,
        @Schema(description = "향(Nose) 점수")
        BigDecimal noseScore,
        @Schema(description = "맛(Taste) 점수")
        BigDecimal tasteScore,
        @Schema(description = "피니시(Finish) 점수")
        BigDecimal finishScore,
        @Schema(description = "총점 (Nose·Taste·Finish 평균, 소수점 1자리)")
        BigDecimal totalScore,
        @Schema(description = "향 노트")
        String noseNote,
        @Schema(description = "맛 노트")
        String tasteNote,
        @Schema(description = "피니시 노트")
        String finishNote,
        @Schema(description = "기타 텍스트 코멘트")
        String comment,
        @Schema(description = "향 아로마 휠")
        String noseAromaWheelNotes,
        @Schema(description = "맛 아로마 휠")
        String tasteAromaWheelNotes,
        @Schema(description = "피니시 아로마 휠")
        String finishAromaWheelNotes,
        @Schema(description = "작성 일시")
        LocalDateTime createdAt,
        @Schema(description = "작성자 레벨")
        Integer userLevel,
        @Schema(description = "작성자 프로필 이미지 URL")
        String userProfileImageUrl,
        @Schema(description = "작성자 역할")
        Role userRole,
        @Schema(description = "동일 주류에 대한 사용자 리뷰 번호 (1부터 시작)")
        Integer userReviewIndex,
        @Schema(description = "동일 주류에 대한 사용자 총 리뷰 수")
        Integer userReviewCount
) {
    public static ReviewResponse from(Review review) {
        return from(review, null, null);
    }

    public static ReviewResponse from(Review review, Integer userReviewIndex, Integer userReviewCount) {
        return new ReviewResponse(
                review.getId(),
                review.getUser().getId(),
                review.getUser().getNickname(),
                review.getSpirit().getId(),
                review.getSpirit().getNameKo(),
                review.getSpirit().getNameEn(),
                review.getNoseScore(),
                review.getTasteScore(),
                review.getFinishScore(),
                review.getTotalScore(),
                review.getNoseNote(),
                review.getTasteNote(),
                review.getFinishNote(),
                review.getComment(),
                review.getNoseAromaWheelNotes(),
                review.getTasteAromaWheelNotes(),
                review.getFinishAromaWheelNotes(),
                review.getCreatedAt(),
                review.getUser().getCurrentLevel(),
                review.getUser().getProfileImageUrl(),
                review.getUser().getRole(),
                userReviewIndex,
                userReviewCount
        );
    }
}
