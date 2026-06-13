package com.caskbycask.domain.byob.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CreateByobCommentRequest {

    @NotBlank
    @Size(max = 200)
    private String content;

    private Long parentId;
}
