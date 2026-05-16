package com.drinkindex.domain.community.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
public class ReorderRequest {

    @NotNull
    private List<Long> ids;
}
