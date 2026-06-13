package com.caskbycask.domain.community.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CreateBadWordRequest {

    @NotBlank(message = "금지어를 입력해주세요.")
    @Size(max = 100, message = "금지어는 100자 이내여야 합니다.")
    private String word;
}
