package com.caskbycask.domain.community.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ReplyMessageRequest {

    // [패치 4] 프론트(100자)와 백엔드 검증 일치 (기존 5000)
    @NotBlank(message = "내용을 입력해주세요.")
    @Size(max = 100, message = "쪽지는 100자 이내로 입력해주세요.")
    private String content;
}
