package com.drinkindex.domain.user.dto;

import com.drinkindex.domain.user.entity.enums.Role;

public record UserSearchCondition(
        String keyword,
        Role role,
        Boolean isActive
) {}
