package com.caskbycask.domain.spirit.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

public record RejectSpiritRequestRequest(
        @Schema(description = "거절 사유")
        @NotBlank(message = "거절 사유를 입력해주세요.") String rejectReason
) {}
