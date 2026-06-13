package com.caskbycask.domain.user.dto;

import com.caskbycask.domain.user.entity.enums.AdminMenuKey;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record UpdateUserMenusRequest(
        @NotNull
        List<AdminMenuKey> menus
) {}
