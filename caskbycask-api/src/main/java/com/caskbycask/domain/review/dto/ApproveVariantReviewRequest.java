package com.caskbycask.domain.review.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record ApproveVariantReviewRequest(
        @Schema(description = "Existing variant ID to merge into. Null creates a new variant.")
        Long targetVariantId,

        @Schema(description = "Final sub-edition identifier value when creating a new variant")
        @Size(max = 100, message = "Sub-edition identifier must be 100 characters or less.")
        String variantValue,

        @Schema(description = "Final English sub-edition identifier value when creating a new variant")
        @Size(max = 100, message = "English sub-edition identifier must be 100 characters or less.")
        String variantValueEn,

        @Schema(description = "Final ABV when creating a new variant")
        @DecimalMin(value = "0.0", message = "ABV must be at least 0.")
        @DecimalMax(value = "100.0", message = "ABV must be 100 or less.")
        BigDecimal abv,

        @Schema(description = "Final volume in milliliters when creating a new variant")
        @Min(value = 1, message = "Volume must be at least 1ml.")
        @Max(value = 100000, message = "Volume must be 100000ml or less.")
        Integer volumeMl,

        @Schema(description = "Final age statement years when creating a new variant")
        @Min(value = 0, message = "Age statement must be at least 0.")
        Integer ageStatement,

        @Schema(description = "Final age statement months when creating a new variant")
        @Min(value = 0, message = "Age statement months must be at least 0.")
        @Max(value = 11, message = "Age statement months must be 11 or less.")
        Integer ageStatementMonths,

        @Schema(description = "Final batch number when creating a new variant")
        @Size(max = 100, message = "Batch number must be 100 characters or less.")
        String batchNo,

        @Schema(description = "Final cask number when creating a new whisky variant")
        @Size(max = 100, message = "Cask number must be 100 characters or less.")
        String caskNo,

        @Schema(description = "Final detail notes when creating a new whisky variant")
        @Size(max = 500, message = "Detail notes must be 500 characters or less.")
        String detailNotes,

        @Schema(description = "Reason shown to the user when only the review is rejected")
        @Size(max = 500, message = "Review reject reason must be 500 characters or less.")
        String reviewRejectReason
) {}
