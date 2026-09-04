package com.caskbycask.domain.venue.dto;

import com.caskbycask.domain.venue.entity.VenueComment;
import com.caskbycask.domain.venue.entity.VenueCommentImage;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 장소 댓글 응답.
 *
 * <p>숨겨진 댓글도 <b>자리는 남긴다</b>. 목록에서 통째로 빼 버리면 거기 달린 대댓글이
 * 부모를 잃고, 사용자에게는 대화가 어긋난 것처럼 보인다. 대신 본문과 사진을 비우고
 * {@code hidden} 만 참으로 준다 — 화면은 "숨김 처리된 댓글입니다"로 그린다.
 */
public record VenueCommentResponse(
        @Schema(description = "댓글 고유 ID")
        Long id,
        @Schema(description = "작성자 사용자 ID. 숨김·삭제된 댓글은 null")
        Long userId,
        @Schema(description = "작성자 닉네임. 숨김 처리된 댓글은 null")
        String nickname,
        @Schema(description = "작성자 프로필 이미지 URL")
        String profileImageUrl,
        @Schema(description = "본문. 숨김 처리된 댓글은 null")
        String content,
        @Schema(description = "첨부 사진 (최대 5장, sortOrder 순). 숨김 처리된 댓글은 빈 목록")
        List<VenueCommentImageResponse> images,
        @Schema(description = "숨김 처리 여부 — 신고 누적 또는 관리자 조치")
        boolean hidden,
        @Schema(description = "작성 일시")
        LocalDateTime createdAt,
        @Schema(description = "수정 일시")
        LocalDateTime updatedAt,
        @Schema(description = "대댓글 목록 (1단까지만)")
        List<VenueCommentResponse> replies
) {
    public static VenueCommentResponse from(VenueComment comment,
                                            List<VenueCommentImage> images,
                                            List<VenueCommentResponse> replies) {
        boolean hidden = Boolean.TRUE.equals(comment.getIsHidden());
        return new VenueCommentResponse(
                comment.getId(),
                hidden ? null : comment.getUser().getId(),
                hidden ? null : comment.getUser().getNickname(),
                hidden ? null : comment.getUser().getProfileImageUrl(),
                hidden ? null : comment.getContent(),
                hidden ? List.of() : images.stream().map(VenueCommentImageResponse::from).toList(),
                hidden,
                comment.getCreatedAt(),
                comment.getUpdatedAt(),
                replies
        );
    }
}
