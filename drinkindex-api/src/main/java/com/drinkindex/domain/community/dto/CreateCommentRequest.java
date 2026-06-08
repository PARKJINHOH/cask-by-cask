package com.drinkindex.domain.community.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CreateCommentRequest {

    @NotBlank(message = "댓글 내용을 입력해주세요.")
    private String content;

    private Long parentId;

    private Long mentionedUserId;

    private Boolean isSecret = false;
}
