package com.caskbycask.domain.community.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UpdateSeriesRequest {

    @Size(max = 200)
    private String title;

    @Size(max = 500)
    private String description;
}
