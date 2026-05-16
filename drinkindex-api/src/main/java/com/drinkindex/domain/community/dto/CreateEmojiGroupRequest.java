package com.drinkindex.domain.community.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CreateEmojiGroupRequest {

    @NotBlank(message = "그룹 이름을 입력해주세요.")
    @Size(max = 50)
    private String name;
}
