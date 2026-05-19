package com.drinkindex.domain.user.dto;

import com.drinkindex.domain.user.entity.enums.AdminMenuKey;
import com.drinkindex.domain.user.entity.enums.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateRoleTypeRequest(
        @NotBlank @Size(max = 100)
        String name,
        @Size(max = 500)
        String description,
        @NotNull
        Role systemRole,
        List<AdminMenuKey> allowedMenus,
        Integer sortOrder
) {}
