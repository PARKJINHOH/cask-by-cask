package com.caskbycask.domain.review.dto;

import com.caskbycask.domain.review.entity.SpiritVariantReviewRequest;
import com.caskbycask.domain.review.entity.enums.VariantReviewRequestStatus;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record AdminVariantReviewRequestResponse(
        @Schema(description = "Request ID")
        Long id,
        @Schema(description = "Master spirit ID")
        Long masterId,
        @Schema(description = "Master spirit Korean name")
        String masterNameKo,
        @Schema(description = "Master spirit English name")
        String masterNameEn,
        @Schema(description = "Spirit category")
        SpiritCategory category,
        @Schema(description = "Variant type")
        VariantType variantType,
        @Schema(description = "Variant identifier value")
        String variantValue,
        @Schema(description = "English variant identifier value")
        String variantValueEn,
        @Schema(description = "Shared series identifier")
        String seriesIdentifier,
        @Schema(description = "Shared English series identifier")
        String seriesIdentifierEn,
        @Schema(description = "Requested ABV")
        BigDecimal abv,
        @Schema(description = "Requested volume in milliliters")
        Integer volumeMl,
        @Schema(description = "Reference memo for admin review")
        String requestMemo,
        @Schema(description = "Request status")
        VariantReviewRequestStatus status,
        @Schema(description = "Requester ID")
        Long requesterId,
        @Schema(description = "Requester nickname")
        String requesterNickname,
        @Schema(description = "Linked variant ID")
        Long linkedVariantId,
        @Schema(description = "Created review ID")
        Long reviewId,
        BigDecimal noseScore,
        BigDecimal tasteScore,
        BigDecimal finishScore,
        BigDecimal totalScore,
        String noseNote,
        String tasteNote,
        String finishNote,
        String comment,
        String rejectReason,
        LocalDateTime createdAt,
        LocalDateTime reviewedAt,
        List<ReviewImageResponse> images
) {
    public static AdminVariantReviewRequestResponse from(SpiritVariantReviewRequest request) {
        return from(request, List.of());
    }

    public static AdminVariantReviewRequestResponse from(
            SpiritVariantReviewRequest request, List<ReviewImageResponse> images) {
        var master = request.getMasterSpirit();
        var requester = request.getRequestUser();
        return new AdminVariantReviewRequestResponse(
                request.getId(),
                master.getId(),
                master.getNameKo(),
                master.getNameEn(),
                master.getCategory(),
                request.getVariantType(),
                request.getVariantValue(),
                request.getVariantValueEn(),
                request.getSeriesIdentifier(),
                request.getSeriesIdentifierEn(),
                request.getAbv(),
                request.getVolumeMl(),
                request.getRequestMemo(),
                request.getStatus(),
                requester.getId(),
                requester.getNickname(),
                request.getLinkedVariant() != null ? request.getLinkedVariant().getId() : null,
                request.getReview() != null ? request.getReview().getId() : null,
                request.getNoseScore(),
                request.getTasteScore(),
                request.getFinishScore(),
                request.getTotalScore(),
                request.getNoseNote(),
                request.getTasteNote(),
                request.getFinishNote(),
                request.getComment(),
                request.getRejectReason(),
                request.getCreatedAt(),
                request.getReviewedAt(),
                images == null ? List.of() : images
        );
    }
}
