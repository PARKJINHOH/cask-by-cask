package com.caskbycask.domain.review.dto;

import com.caskbycask.domain.seo.util.SpiritSlugUtils;
import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import com.caskbycask.domain.user.entity.enums.Role;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

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
        @Schema(description = "술 카테고리 (WHISKY/COGNAC/WINE/OTHER)")
        SpiritCategory spiritCategory,
        @Schema(description = "KO canonical path")
        String spiritCanonicalPathKo,
        @Schema(description = "EN canonical path")
        String spiritCanonicalPathEn,
        @Schema(description = "에디션 유형 — BATCH/RELEASE_YEAR/SINGLE_CASK/NONE (에디션이 아니면 null)")
        VariantType spiritVariantType,
        @Schema(description = "에디션 시리즈 식별자 (에디션이 아니면 null)")
        String spiritSeriesIdentifier,
        @Schema(description = "에디션 시리즈 식별자(영문)")
        String spiritSeriesIdentifierEn,
        @Schema(description = "에디션 식별 값 (에디션이 아니면 null)")
        String spiritVariantValue,
        @Schema(description = "에디션 식별 값(영문)")
        String spiritVariantValueEn,
        @Schema(description = "도수(%) — 에디션 표기용")
        BigDecimal spiritAbv,
        @Schema(description = "용량(ml) — 에디션 표기용")
        Integer spiritVolumeMl,
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
        @Schema(description = "SNS 기능 도입 전 리뷰의 미게시 플랫폼 최초 발행 허용 여부")
        boolean legacySocialPublishAllowed,
        @Schema(description = "동일 주류에 대한 사용자 리뷰 번호 (1부터 시작)")
        Integer userReviewIndex,
        @Schema(description = "동일 주류에 대한 사용자 총 리뷰 수")
        Integer userReviewCount,
        @Schema(description = "리뷰 이미지 (표시 순서)")
        List<ReviewImageResponse> images
) {
    public static ReviewResponse from(Review review) {
        return from(review, null, null, List.of());
    }

    public static ReviewResponse from(Review review, Integer userReviewIndex, Integer userReviewCount) {
        return from(review, userReviewIndex, userReviewCount, List.of());
    }

    public static ReviewResponse from(Review review, Integer userReviewIndex, Integer userReviewCount,
                                      List<ReviewImageResponse> images) {
        Spirit spirit = review.getSpirit();
        // 에디션 값은 실제 하위 에디션일 때만 노출한다 (마스터/단일 주류는 null → 프론트에서 이름만 표기)
        boolean hasEdition = SpiritSlugUtils.hasEdition(spirit);
        return new ReviewResponse(
                review.getId(),
                review.getUser().getId(),
                review.getUser().getNickname(),
                spirit.getId(),
                spirit.getNameKo(),
                spirit.getNameEn(),
                spirit.getCategory(),
                SpiritSlugUtils.canonicalPathKo(spirit),
                SpiritSlugUtils.canonicalPathEn(spirit),
                hasEdition ? spirit.getVariantType() : null,
                hasEdition ? spirit.getSeriesIdentifier() : null,
                hasEdition ? spirit.getSeriesIdentifierEn() : null,
                hasEdition ? spirit.getVariantValue() : null,
                hasEdition ? spirit.getVariantValueEn() : null,
                spirit.getAbv(),
                spirit.getVolumeMl(),
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
                Boolean.TRUE.equals(review.getLegacySocialPublishAllowed()),
                userReviewIndex,
                userReviewCount,
                images == null ? List.of() : List.copyOf(images)
        );
    }
}
