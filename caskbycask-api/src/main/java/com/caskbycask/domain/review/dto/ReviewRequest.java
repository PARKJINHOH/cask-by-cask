package com.caskbycask.domain.review.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;
import com.caskbycask.domain.social.dto.SocialPublishSelection;

public record ReviewRequest(
        @Schema(description = "향(Nose) 점수 (0.0~100.0, 소수점 1자리)")
        @NotNull(message = "노즈 점수는 필수입니다.")
        @DecimalMin(value = "0.0", message = "점수는 0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "점수는 100 이하이어야 합니다.")
        BigDecimal noseScore,

        @Schema(description = "맛(Taste) 점수 (0.0~100.0, 소수점 1자리)")
        @NotNull(message = "테이스트 점수는 필수입니다.")
        @DecimalMin(value = "0.0", message = "점수는 0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "점수는 100 이하이어야 합니다.")
        BigDecimal tasteScore,

        @Schema(description = "피니시(Finish) 점수 (0.0~100.0, 소수점 1자리)")
        @NotNull(message = "피니시 점수는 필수입니다.")
        @DecimalMin(value = "0.0", message = "점수는 0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "점수는 100 이하이어야 합니다.")
        BigDecimal finishScore,

        @Schema(description = "향 노트 (600자 이내, 선택)")
        @Size(max = 600, message = "향 노트는 600자 이내여야 합니다.")
        String noseNote,

        @Schema(description = "맛 노트 (600자 이내, 선택)")
        @Size(max = 600, message = "맛 노트는 600자 이내여야 합니다.")
        String tasteNote,

        @Schema(description = "피니시 노트 (600자 이내, 선택)")
        @Size(max = 600, message = "피니시 노트는 600자 이내여야 합니다.")
        String finishNote,

        @Schema(description = "기타 텍스트 코멘트 (600자 이내, 선택)")
        @Size(max = 600, message = "코멘트는 600자 이내여야 합니다.")
        String comment,

        @Schema(description = "향 아로마 휠 (800자 이내, 선택)")
        @Size(max = 800, message = "아로마 휠 데이터는 800자 이내여야 합니다.")
        String noseAromaWheelNotes,

        @Schema(description = "맛 아로마 휠 (800자 이내, 선택)")
        @Size(max = 800, message = "아로마 휠 데이터는 800자 이내여야 합니다.")
        String tasteAromaWheelNotes,

        @Schema(description = "피니시 아로마 휠 (800자 이내, 선택)")
        @Size(max = 800, message = "아로마 휠 데이터는 800자 이내여야 합니다.")
        String finishAromaWheelNotes,

        @Valid
        SocialPublishSelection socialPublish,

        @Schema(description = "향·맛·피니시 아로마 강도 프로파일 (선택)")
        @Valid
        List<AromaProfileRequest> aromaProfiles
) {
    public ReviewRequest(
            BigDecimal noseScore, BigDecimal tasteScore, BigDecimal finishScore,
            String noseNote, String tasteNote, String finishNote, String comment,
            String noseAromaWheelNotes, String tasteAromaWheelNotes, String finishAromaWheelNotes
    ) {
        this(noseScore, tasteScore, finishScore, noseNote, tasteNote, finishNote, comment,
                noseAromaWheelNotes, tasteAromaWheelNotes, finishAromaWheelNotes, null, null);
    }
}
