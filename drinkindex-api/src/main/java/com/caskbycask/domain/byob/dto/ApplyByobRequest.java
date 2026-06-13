package com.caskbycask.domain.byob.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
public class ApplyByobRequest {

    @NotEmpty
    @Size(max = 10)
    private List<String> bottleNames;

    private String memo;
}
