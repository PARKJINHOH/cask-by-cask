package com.caskbycask.domain.user.dto;

import com.caskbycask.domain.user.entity.RoleType;
import com.caskbycask.domain.user.entity.enums.AdminMenuKey;
import com.caskbycask.domain.user.entity.enums.Role;

import java.util.List;

public record RoleTypeResponse(
        Long id,
        String name,
        String description,
        Role systemRole,
        List<AdminMenuKey> allowedMenus,
        Boolean isActive,
        Integer sortOrder
) {
    public static RoleTypeResponse from(RoleType rt) {
        return new RoleTypeResponse(
                rt.getId(),
                rt.getName(),
                rt.getDescription(),
                rt.getSystemRole(),
                List.copyOf(rt.getAllowedMenus()),
                rt.getIsActive(),
                rt.getSortOrder()
        );
    }
}
