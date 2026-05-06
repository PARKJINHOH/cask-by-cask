package com.drinkindex.domain.report.dto;

import com.drinkindex.domain.report.entity.enums.ReportTargetType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReportRequest(
        @Schema(description = "신고 대상 유형 (REVIEW, COMMENT, IMAGE)")
        @NotNull(message = "신고 대상 유형은 필수입니다.") ReportTargetType targetType,
        @Schema(description = "신고 대상 고유 ID")
        @NotNull(message = "신고 대상 ID는 필수입니다.") Long targetId,
        @Schema(description = "신고 사유 (500자 이내, 선택)")
        @Size(max = 500, message = "신고 사유는 500자 이내여야 합니다.") String reason
) {}
