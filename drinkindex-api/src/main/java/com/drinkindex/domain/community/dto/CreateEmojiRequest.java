package com.drinkindex.domain.community.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CreateEmojiRequest {

    // unicode 또는 imageUrl 중 하나는 필수 (서비스 레이어에서 검증)
    @Size(max = 10)
    private String unicode;

    @Size(max = 500)
    private String imageUrl;

    @NotBlank(message = "이모지 레이블을 입력해주세요.")
    @Size(max = 50)
    private String label;

    private Long groupId;
}
