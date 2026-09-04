package com.caskbycask.domain.venue.dto;

import com.caskbycask.domain.spirit.entity.enums.RequestStatus;
import com.caskbycask.domain.venue.entity.VenueRegisterRequest;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

public record VenueRequestResponse(
        @Schema(description = "요청 고유 ID")
        Long id,
        @Schema(description = "신청자 회원 ID")
        Long userId,
        @Schema(description = "신청자 닉네임")
        String nickname,
        @Schema(description = "처리 상태 (PENDING/APPROVED/REJECTED)")
        RequestStatus status,
        @Schema(description = "거절 사유")
        String rejectReason,
        @Schema(description = "승인으로 만들어진 장소 ID")
        Long createdVenueId,
        @Schema(description = "신청 내용")
        VenueRequestBody venue,
        @Schema(description = "신청 일시")
        LocalDateTime createdAt,
        @Schema(description = "처리 일시")
        LocalDateTime reviewedAt
) {
    public static VenueRequestResponse from(VenueRegisterRequest request, VenueRequestBody body) {
        return new VenueRequestResponse(
                request.getId(),
                request.getUser().getId(),
                request.getUser().getNickname(),
                request.getStatus(),
                request.getRejectReason(),
                request.getCreatedVenueId(),
                body,
                request.getCreatedAt(),
                request.getReviewedAt()
        );
    }
}
