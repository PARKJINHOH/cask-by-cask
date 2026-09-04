package com.caskbycask.domain.venue.dto;

import com.caskbycask.domain.venue.entity.VenueComment;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record VenueCommentRequest(
        @Schema(description = "본문(평문). 서식은 지원하지 않는다")
        @NotBlank(message = "내용을 입력해주세요.")
        @Size(max = VenueComment.MAX_CONTENT_LENGTH, message = "내용은 1000자 이하로 입력해주세요.")
        String content,

        @Schema(description = "부모 댓글 ID. 대댓글일 때만 채운다 (1단까지만 허용)")
        Long parentId
) {
}
