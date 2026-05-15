package com.drinkindex.domain.community.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class EmojiReactionRequest {

    @NotNull(message = "이모지 ID를 입력해주세요.")
    private Long emojiId;
}
