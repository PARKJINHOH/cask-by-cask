package com.caskbycask.domain.byob.dto;

import com.caskbycask.domain.byob.entity.enums.ByobStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ChangeByobStatusRequest {

    @NotNull
    private ByobStatus status;
}
