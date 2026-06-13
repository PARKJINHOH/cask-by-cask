package com.caskbycask.domain.community.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdateEmojiRequest {

    @Size(max = 10)
    private String unicode;

    @Size(max = 500)
    private String imageUrl;

    @Size(max = 50)
    private String label;

    private Long groupId;
}
