package com.drinkindex.domain.community.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdatePostRequest {

    private Long prefixId;

    @Size(max = 300, message = "제목은 300자 이내여야 합니다.")
    private String title;

    private String content;
}
