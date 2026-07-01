package com.caskbycask.domain.review.dto;

import com.caskbycask.domain.review.entity.SpiritVariantReviewRequest;
import com.caskbycask.domain.review.entity.enums.VariantReviewRequestStatus;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import com.caskbycask.domain.seo.util.SpiritSlugUtils;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record VariantReviewRequestResponse(
        @Schema(description = "Request ID")
        Long id,
        @Schema(description = "Master spirit ID")
        Long masterSpiritId,
        @Schema(description = "Master spirit Korean name")
        String masterNameKo,
        @Schema(description = "Master spirit English name")
        String masterNameEn,
        @Schema(description = "Master spirit canonical path for Korean")
        String masterCanonicalPathKo,
        @Schema(description = "Master spirit canonical path for English")
        String masterCanonicalPathEn,
        @Schema(description = "Variant type")
        VariantType variantType,
        @Schema(description = "Shared series identifier")
        String seriesIdentifier,
        @Schema(description = "Shared English series identifier")
        String seriesIdentifierEn,
        @Schema(description = "Variant identifier value")
        String variantValue,
        @Schema(description = "English variant identifier value")
        String variantValueEn,
        @Schema(description = "Requested ABV")
        BigDecimal abv,
        @Schema(description = "Requested volume in milliliters")
        Integer volumeMl,
        @Schema(description = "Reference memo for admin review")
        String requestMemo,
        @Schema(description = "Nose score")
        BigDecimal noseScore,
        @Schema(description = "Taste score")
        BigDecimal tasteScore,
        @Schema(description = "Finish score")
        BigDecimal finishScore,
        @Schema(description = "Total score")
        BigDecimal totalScore,
        @Schema(description = "Nose note")
        String noseNote,
        @Schema(description = "Taste note")
        String tasteNote,
        @Schema(description = "Finish note")
        String finishNote,
        @Schema(description = "Overall comment")
        String comment,
        @Schema(description = "Nose aroma wheel notes")
        String noseAromaWheelNotes,
        @Schema(description = "Taste aroma wheel notes")
        String tasteAromaWheelNotes,
        @Schema(description = "Finish aroma wheel notes")
        String finishAromaWheelNotes,
        @Schema(description = "Request status")
        VariantReviewRequestStatus status,
        @Schema(description = "Linked approved variant ID")
        Long linkedVariantId,
        @Schema(description = "Created review ID")
        Long reviewId,
        @Schema(description = "Reject reason")
        String rejectReason,
        @Schema(description = "Created at")
        LocalDateTime createdAt,
        @Schema(description = "Reviewed at")
        LocalDateTime reviewedAt
) {
    public static VariantReviewRequestResponse from(SpiritVariantReviewRequest request) {
        var master = request.getMasterSpirit();
        return new VariantReviewRequestResponse(
                request.getId(),
                master.getId(),
                master.getNameKo(),
                master.getNameEn(),
                SpiritSlugUtils.canonicalPathKo(master),
                SpiritSlugUtils.canonicalPathEn(master),
                request.getVariantType(),
                request.getSeriesIdentifier(),
                request.getSeriesIdentifierEn(),
                request.getVariantValue(),
                request.getVariantValueEn(),
                request.getAbv(),
                request.getVolumeMl(),
                request.getRequestMemo(),
                request.getNoseScore(),
                request.getTasteScore(),
                request.getFinishScore(),
                request.getTotalScore(),
                request.getNoseNote(),
                request.getTasteNote(),
                request.getFinishNote(),
                request.getComment(),
                request.getNoseAromaWheelNotes(),
                request.getTasteAromaWheelNotes(),
                request.getFinishAromaWheelNotes(),
                request.getStatus(),
                request.getLinkedVariant() != null ? request.getLinkedVariant().getId() : null,
                request.getReview() != null ? request.getReview().getId() : null,
                request.getRejectReason(),
                request.getCreatedAt(),
                request.getReviewedAt()
        );
    }
}
