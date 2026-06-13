package com.caskbycask.domain.user.dto;

import com.caskbycask.domain.user.entity.enums.AdminMenuKey;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record UpdateRoleTypeRequest(
        @NotBlank @Size(max = 100)
        String name,
        @Size(max = 500)
        String description,
        @NotNull
        List<AdminMenuKey> allowedMenus,
        @NotNull
        Boolean isActive,
        @NotNull
        Integer sortOrder
) {}
