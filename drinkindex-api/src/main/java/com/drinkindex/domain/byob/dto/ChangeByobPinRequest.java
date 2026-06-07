package com.drinkindex.domain.byob.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ChangeByobPinRequest {

    // BYOB 게시판 공지(고정글) 설정 여부
    @NotNull
    private Boolean isPinned;
}
