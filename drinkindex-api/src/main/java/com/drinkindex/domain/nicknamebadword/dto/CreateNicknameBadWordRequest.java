package com.drinkindex.domain.nicknamebadword.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CreateNicknameBadWordRequest {

    @NotBlank(message = "금지 단어를 입력해주세요.")
    @Size(max = 100, message = "금지 단어는 100자 이내여야 합니다.")
    private String word;
}
