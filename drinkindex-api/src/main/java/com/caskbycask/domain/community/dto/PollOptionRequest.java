package com.caskbycask.domain.community.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class PollOptionRequest {

    @NotBlank(message = "투표 항목 텍스트를 입력해주세요.")
    @Size(max = 200)
    private String optionText;

    private int sortOrder;
}
