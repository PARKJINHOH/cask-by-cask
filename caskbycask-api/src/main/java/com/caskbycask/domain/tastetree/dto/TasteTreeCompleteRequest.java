package com.caskbycask.domain.tastetree.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record TasteTreeCompleteRequest(
        @NotEmpty List<Answer> answers
) {
    public record Answer(
            @NotBlank String nodeKey,
            @NotEmpty List<@NotBlank String> optionKeys
    ) {}
}
