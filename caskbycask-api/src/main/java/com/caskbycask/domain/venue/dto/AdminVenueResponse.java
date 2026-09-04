package com.caskbycask.domain.venue.dto;

import com.caskbycask.domain.venue.entity.Venue;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

/**
 * 관리자 목록·상세 응답.
 *
 * <p>공개 응답과 달리 HIDDEN 도 실리고, "왜 이 장소가 지도에 안 보이지"를 화면에서 바로 알 수 있도록
 * {@code mappable} 과 {@code status} 를 함께 준다.
 */
public record AdminVenueResponse(
        @Schema(description = "공개 응답과 동일한 본문")
        VenueDetailResponse venue,
        @Schema(description = "제보자 닉네임. 관리자가 직접 등록했으면 null")
        String submittedByNickname,
        @Schema(description = "제보자 회원 ID")
        Long submittedById,
        @Schema(description = "등록 일시")
        LocalDateTime createdAt,
        @Schema(description = "수정 일시")
        LocalDateTime updatedAt
) {
    public static AdminVenueResponse from(Venue venue) {
        return new AdminVenueResponse(
                VenueDetailResponse.from(venue),
                venue.getSubmittedBy() != null ? venue.getSubmittedBy().getNickname() : null,
                venue.getSubmittedBy() != null ? venue.getSubmittedBy().getId() : null,
                venue.getCreatedAt(),
                venue.getUpdatedAt()
        );
    }
}
