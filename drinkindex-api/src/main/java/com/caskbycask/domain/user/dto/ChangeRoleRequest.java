package com.caskbycask.domain.user.dto;

import com.caskbycask.domain.user.entity.enums.Role;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record ChangeRoleRequest(
        @Schema(description = "변경할 역할 (SUPER_ADMIN 제외)")
        @NotNull(message = "역할은 필수입니다.") Role role,
        @Schema(description = "역할 타입 ID (ADMIN/PARTNER 역할 시 선택)")
        Long roleTypeId,
        @Schema(description = "담당 증류소 ID (PARTNER 역할 시 선택)")
        Long producerId
) {}
