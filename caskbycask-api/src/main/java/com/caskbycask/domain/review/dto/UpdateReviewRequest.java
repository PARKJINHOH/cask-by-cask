package com.caskbycask.domain.review.dto;

import com.caskbycask.domain.review.constant.ReviewCommentLimits;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;
import jakarta.validation.Valid;

public record UpdateReviewRequest(
        @Schema(description = "향(Nose) 점수 (0.0~100.0, null이면 변경 안 함)")
        @DecimalMin(value = "0.0", message = "점수는 0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "점수는 100 이하이어야 합니다.")
        BigDecimal noseScore,

        @Schema(description = "맛(Taste) 점수 (0.0~100.0, null이면 변경 안 함)")
        @DecimalMin(value = "0.0", message = "점수는 0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "점수는 100 이하이어야 합니다.")
        BigDecimal tasteScore,

        @Schema(description = "피니시(Finish) 점수 (0.0~100.0, null이면 변경 안 함)")
        @DecimalMin(value = "0.0", message = "점수는 0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "점수는 100 이하이어야 합니다.")
        BigDecimal finishScore,

        @Schema(description = "향 노트 (600자 이내, null이면 변경 안 함)")
        @Size(max = 600, message = "향 노트는 600자 이내여야 합니다.")
        String noseNote,

        @Schema(description = "맛 노트 (600자 이내, null이면 변경 안 함)")
        @Size(max = 600, message = "맛 노트는 600자 이내여야 합니다.")
        String tasteNote,

        @Schema(description = "피니시 노트 (600자 이내, null이면 변경 안 함)")
        @Size(max = 600, message = "피니시 노트는 600자 이내여야 합니다.")
        String finishNote,

        @Schema(description = "종합평가 (제한형 에디터 HTML, 본문 600자 이내, null이면 변경 안 함)")
        @Size(max = ReviewCommentLimits.MAX_HTML_LENGTH,
                message = "종합평가에 사용한 서식이 너무 많습니다.")
        String comment,

        @Schema(description = "향 아로마 휠 (800자 이내, null이면 변경 안 함)")
        @Size(max = 800, message = "아로마 휠 데이터는 800자 이내여야 합니다.")
        String noseAromaWheelNotes,

        @Schema(description = "맛 아로마 휠 (800자 이내, null이면 변경 안 함)")
        @Size(max = 800, message = "아로마 휠 데이터는 800자 이내여야 합니다.")
        String tasteAromaWheelNotes,

        @Schema(description = "피니시 아로마 휠 (800자 이내, null이면 변경 안 함)")
        @Size(max = 800, message = "아로마 휠 데이터는 800자 이내여야 합니다.")
        String finishAromaWheelNotes,

        @Schema(description = "아로마 강도 프로파일 (null=변경 안 함, 빈 배열=전체 삭제)")
        @Valid
        List<AromaProfileRequest> aromaProfiles,

        /**
         * 마신 곳(venue.id). 선택 사항이며 <b>폼이 항상 보낸다</b> — null 이면 "태그 없음"이고
         * "변경 안 함"이 아니다. 그래야 태그를 지울 방법이 사라지지 않는다.
         */
        @Schema(description = "마신 곳(장소 ID). null = 태그 없음")
        Long venueId
) {
    public UpdateReviewRequest(
            BigDecimal noseScore, BigDecimal tasteScore, BigDecimal finishScore,
            String noseNote, String tasteNote, String finishNote, String comment,
            String noseAromaWheelNotes, String tasteAromaWheelNotes, String finishAromaWheelNotes
    ) {
        this(noseScore, tasteScore, finishScore, noseNote, tasteNote, finishNote, comment,
                noseAromaWheelNotes, tasteAromaWheelNotes, finishAromaWheelNotes, null, null);
    }
}
