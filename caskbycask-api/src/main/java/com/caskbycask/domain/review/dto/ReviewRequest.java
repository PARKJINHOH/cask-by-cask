package com.caskbycask.domain.review.dto;

import com.caskbycask.domain.review.constant.ReviewCommentLimits;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;
import com.caskbycask.domain.social.dto.SocialPublishSelection;

public record ReviewRequest(
        @Schema(description = "향(Nose) 점수 (0.0~100.0, 소수점 1자리). 셋 다 비우면 점수 없는 리뷰가 된다.")
        @DecimalMin(value = "0.0", message = "점수는 0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "점수는 100 이하이어야 합니다.")
        BigDecimal noseScore,

        @Schema(description = "맛(Taste) 점수 (0.0~100.0, 소수점 1자리)")
        @DecimalMin(value = "0.0", message = "점수는 0 이상이어야 합니다.")
        @DecimalMax(value = "100.0", message = "점수는 100 이하이어야 합니다.")
        BigDecimal tasteScore,

        @Schema(description = "피니시(Finish) 점수 (0.0~100.0, 소수점 1자리)")
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

        @Schema(description = "종합평가 (제한형 에디터 HTML, 본문 600자 이내, 선택)")
        @Size(max = ReviewCommentLimits.MAX_HTML_LENGTH,
                message = "종합평가에 사용한 서식이 너무 많습니다.")
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
    /**
     * 점수가 셋 다 있는가 — 셋 다 없으면 "점수 없는 리뷰"다.
     * 그 사이(부분 입력)는 총점을 낼 수 없어 {@link #hasPartialScore()} 로 걸러 낸다.
     */
    public boolean hasAllScores() {
        return noseScore != null && tasteScore != null && finishScore != null;
    }

    /** 셋 중 일부만 채운 상태 — 허용하지 않는다. */
    public boolean hasPartialScore() {
        boolean any = noseScore != null || tasteScore != null || finishScore != null;
        return any && !hasAllScores();
    }

    public ReviewRequest(
            BigDecimal noseScore, BigDecimal tasteScore, BigDecimal finishScore,
            String noseNote, String tasteNote, String finishNote, String comment,
            String noseAromaWheelNotes, String tasteAromaWheelNotes, String finishAromaWheelNotes
    ) {
        this(noseScore, tasteScore, finishScore, noseNote, tasteNote, finishNote, comment,
                noseAromaWheelNotes, tasteAromaWheelNotes, finishAromaWheelNotes, null, null);
    }
}
