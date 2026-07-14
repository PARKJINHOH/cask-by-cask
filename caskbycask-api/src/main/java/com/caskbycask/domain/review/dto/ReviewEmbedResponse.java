package com.caskbycask.domain.review.dto;

import com.caskbycask.domain.review.entity.Review;
import com.caskbycask.domain.spirit.entity.Spirit;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.stream.Stream;

/**
 * 커뮤니티 에디터에서 로그인 사용자가 자신의 리뷰를 카드로 삽입할 때 사용하는 응답.
 * 공개 리뷰 카드에 필요한 스냅샷만 제공하고 작성자 정보는 노출하지 않는다.
 */
public record ReviewEmbedResponse(
        @Schema(description = "리뷰 고유 ID")
        Long id,
        @Schema(description = "술 고유 ID")
        Long spiritId,
        @Schema(description = "술 한글명")
        String spiritNameKo,
        @Schema(description = "술 영문명")
        String spiritNameEn,
        @Schema(description = "에디션 식별값(한글)")
        String spiritIdentifierKo,
        @Schema(description = "에디션 식별값(영문)")
        String spiritIdentifierEn,
        @Schema(description = "도수(%)")
        BigDecimal spiritAbv,
        @Schema(description = "해당 술의 공개 리뷰 수")
        Integer spiritReviewCount,
        BigDecimal noseScore,
        BigDecimal tasteScore,
        BigDecimal finishScore,
        BigDecimal totalScore,
        String noseNote,
        String tasteNote,
        String finishNote,
        @Schema(description = "총평")
        String comment,
        LocalDateTime createdAt
) {
    public static ReviewEmbedResponse from(Review review) {
        Spirit spirit = review.getSpirit();
        Spirit canonical = spirit.getParent() != null ? spirit.getParent() : spirit;

        String seriesKo = firstText(spirit.getSeriesIdentifier(), canonical.getSeriesIdentifier());
        String seriesEn = firstText(
                spirit.getSeriesIdentifierEn(),
                canonical.getSeriesIdentifierEn(),
                seriesKo
        );
        String identifierKo = joinIdentifier(seriesKo,
                spirit.getParent() != null ? spirit.getVariantValue() : null);
        String identifierEn = joinIdentifier(seriesEn,
                spirit.getParent() != null
                        ? firstText(spirit.getVariantValueEn(), spirit.getVariantValue())
                        : null);

        return new ReviewEmbedResponse(
                review.getId(),
                spirit.getId(),
                spirit.getNameKo(),
                spirit.getNameEn(),
                identifierKo,
                identifierEn,
                spirit.getAbv(),
                spirit.getReviewCount(),
                review.getNoseScore(),
                review.getTasteScore(),
                review.getFinishScore(),
                review.getTotalScore(),
                review.getNoseNote(),
                review.getTasteNote(),
                review.getFinishNote(),
                review.getComment(),
                review.getCreatedAt()
        );
    }

    private static String firstText(String... values) {
        return Stream.of(values)
                .filter(value -> value != null && !value.isBlank())
                .findFirst()
                .orElse(null);
    }

    private static String joinIdentifier(String first, String second) {
        String left = firstText(first);
        String right = firstText(second);
        if (left == null) return right;
        if (right == null || left.equalsIgnoreCase(right)) return left;
        return left + " " + right;
    }
}
