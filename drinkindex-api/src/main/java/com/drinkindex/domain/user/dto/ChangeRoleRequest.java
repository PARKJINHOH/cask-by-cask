package com.drinkindex.domain.user.dto;

import com.drinkindex.domain.user.entity.enums.Role;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record ChangeRoleRequest(
        @Schema(description = "변경할 역할 (ADMIN, MEMBER, DISTILLERY)")
        @NotNull(message = "역할은 필수입니다.") Role role,
        @Schema(description = "담당 증류소 ID (DISTILLERY 역할 변경 시 필수)")
        Long distilleryId
) {}
