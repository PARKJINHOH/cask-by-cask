package com.drinkindex.domain.community.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class SendMessageRequest {

    @NotBlank(message = "수신자 닉네임을 입력해주세요.")
    private String receiverNickname;

    @NotBlank(message = "내용을 입력해주세요.")
    @Size(max = 5000)
    private String content;
}
