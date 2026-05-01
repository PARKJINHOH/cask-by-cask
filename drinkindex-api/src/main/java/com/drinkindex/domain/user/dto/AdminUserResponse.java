package com.drinkindex.domain.user.dto;

import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.entity.enums.Role;

import java.time.LocalDateTime;

public record AdminUserResponse(
        Long id,
        String email,
        String nickname,
        Role role,
        Boolean isActive,
        Long distilleryId,
        String distilleryNameKo,
        LocalDateTime createdAt
) {
    public static AdminUserResponse from(User user) {
        return new AdminUserResponse(
                user.getId(),
                user.getEmail(),
                user.getNickname(),
                user.getRole(),
                user.getIsActive(),
                user.getDistillery() != null ? user.getDistillery().getId() : null,
                user.getDistillery() != null ? user.getDistillery().getNameKo() : null,
                user.getCreatedAt()
        );
    }
}
