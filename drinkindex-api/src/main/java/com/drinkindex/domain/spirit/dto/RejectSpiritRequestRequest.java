package com.drinkindex.domain.spirit.dto;

import jakarta.validation.constraints.NotBlank;

public record RejectSpiritRequestRequest(
        @NotBlank(message = "거절 사유를 입력해주세요.") String rejectReason
) {}
