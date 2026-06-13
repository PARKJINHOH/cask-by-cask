package com.caskbycask.domain.community.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdateReportCountRequest {

    @NotNull
    @Min(0)
    private Integer count;
}
