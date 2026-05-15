package com.drinkindex.domain.community.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
public class VoteRequest {

    @NotEmpty(message = "투표 항목을 선택해주세요.")
    private List<Long> optionIds;
}
