package com.drinkindex.domain.user.dto;

import com.drinkindex.domain.user.entity.enums.Role;
import jakarta.validation.constraints.NotNull;

public record ChangeRoleRequest(
        @NotNull(message = "역할은 필수입니다.") Role role,
        Long distilleryId
) {}
