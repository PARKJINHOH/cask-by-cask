package com.drinkindex.domain.community.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class PostLikeRequest {

    @NotNull(message = "추천/비추천 여부를 입력해주세요.")
    private Boolean isLike;
}
