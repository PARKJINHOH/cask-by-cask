package com.drinkindex.domain.report.dto;

import com.drinkindex.domain.report.entity.enums.ReportTargetType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReportRequest(
        @NotNull(message = "신고 대상 유형은 필수입니다.") ReportTargetType targetType,
        @NotNull(message = "신고 대상 ID는 필수입니다.") Long targetId,
        @Size(max = 500, message = "신고 사유는 500자 이내여야 합니다.") String reason
) {}
