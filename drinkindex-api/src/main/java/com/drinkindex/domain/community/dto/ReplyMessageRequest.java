package com.drinkindex.domain.community.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ReplyMessageRequest {

    @NotBlank(message = "내용을 입력해주세요.")
    @Size(max = 5000)
    private String content;
}
