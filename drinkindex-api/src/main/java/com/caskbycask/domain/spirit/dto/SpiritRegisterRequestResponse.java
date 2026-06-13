package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.enums.RequestStatus;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

public record SpiritRegisterRequestResponse(
        @Schema(description = "술 등록 요청 고유 ID")
        Long id,
        @Schema(description = "한글 제품명")
        String nameKo,
        @Schema(description = "영문 제품명")
        String nameEn,
        @Schema(description = "카테고리")
        SpiritCategory category,
        @Schema(description = "처리 상태 (PENDING, APPROVED, REJECTED)")
        RequestStatus status,
        @Schema(description = "거절 사유 (REJECTED인 경우)")
        String rejectReason,
        @Schema(description = "요청 일시")
        LocalDateTime createdAt,
        @Schema(description = "관리자 처리 일시")
        LocalDateTime reviewedAt
) {}
