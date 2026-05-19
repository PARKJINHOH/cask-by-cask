package com.drinkindex.domain.user.dto;

import com.drinkindex.domain.user.entity.enums.AdminMenuKey;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record UpdateUserMenusRequest(
        @NotNull
        List<AdminMenuKey> menus
) {}
