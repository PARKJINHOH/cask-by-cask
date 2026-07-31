package com.caskbycask.domain.review.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.Valid;
import com.caskbycask.domain.social.dto.SocialPublishSelection;

import java.math.BigDecimal;

public record CreateVariantReviewRequest(
        @Schema(description = "Sub-edition identifier value")
        @NotBlank(message = "Sub-edition identifier is required.")
        @Size(max = 100, message = "Sub-edition identifier must be 100 characters or less.")
        String variantValue,

        @Schema(description = "Sub-edition identifier value in English")
        @Size(max = 100, message = "English sub-edition identifier must be 100 characters or less.")
        String variantValueEn,

        @Schema(description = "Alcohol by volume")
        @NotNull(message = "ABV is required.")
        @DecimalMin(value = "0.0", message = "ABV must be at least 0.")
        @DecimalMax(value = "100.0", message = "ABV must be 100 or less.")
        BigDecimal abv,

        @Schema(description = "Volume in milliliters")
        @NotNull(message = "Volume is required.")
        @Min(value = 1, message = "Volume must be at least 1ml.")
        @Max(value = 100000, message = "Volume must be 100000ml or less.")
        Integer volumeMl,

        @Schema(description = "Reference memo for admin review")
        @Size(max = 500, message = "Reference memo must be 500 characters or less.")
        String requestMemo,

        @Schema(description = "Nose score")
        @NotNull(message = "Nose score is required.")
        @DecimalMin(value = "0.0", message = "Score must be at least 0.")
        @DecimalMax(value = "100.0", message = "Score must be 100 or less.")
        BigDecimal noseScore,

        @Schema(description = "Taste score")
        @NotNull(message = "Taste score is required.")
        @DecimalMin(value = "0.0", message = "Score must be at least 0.")
        @DecimalMax(value = "100.0", message = "Score must be 100 or less.")
        BigDecimal tasteScore,

        @Schema(description = "Finish score")
        @NotNull(message = "Finish score is required.")
        @DecimalMin(value = "0.0", message = "Score must be at least 0.")
        @DecimalMax(value = "100.0", message = "Score must be 100 or less.")
        BigDecimal finishScore,

        @Schema(description = "Nose note")
        @Size(max = 1000, message = "Nose note must be 1000 characters or less.")
        String noseNote,

        @Schema(description = "Taste note")
        @Size(max = 1000, message = "Taste note must be 1000 characters or less.")
        String tasteNote,

        @Schema(description = "Finish note")
        @Size(max = 1000, message = "Finish note must be 1000 characters or less.")
        String finishNote,

        @Schema(description = "Overall comment")
        @Size(max = 1000, message = "Comment must be 1000 characters or less.")
        String comment,

        @Schema(description = "Nose aroma wheel notes")
        @Size(max = 800, message = "Aroma wheel notes must be 800 characters or less.")
        String noseAromaWheelNotes,

        @Schema(description = "Taste aroma wheel notes")
        @Size(max = 800, message = "Aroma wheel notes must be 800 characters or less.")
        String tasteAromaWheelNotes,

        @Schema(description = "Finish aroma wheel notes")
        @Size(max = 800, message = "Aroma wheel notes must be 800 characters or less.")
        String finishAromaWheelNotes,

        @Valid
        SocialPublishSelection socialPublish
) {}
