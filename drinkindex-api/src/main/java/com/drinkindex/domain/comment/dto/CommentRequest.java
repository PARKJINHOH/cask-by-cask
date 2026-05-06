package com.drinkindex.domain.comment.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CommentRequest(
        @Schema(description = "댓글 내용 (1000자 이내)")
        @NotBlank(message = "댓글 내용을 입력해주세요.")
        @Size(max = 1000, message = "댓글은 1000자 이내여야 합니다.")
        String content,

        @Schema(description = "부모 댓글 ID (대댓글인 경우 설정, 최상위 댓글이면 null)")
        Long parentId
) {}
