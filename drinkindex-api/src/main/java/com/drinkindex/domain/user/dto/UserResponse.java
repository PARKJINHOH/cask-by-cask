package com.drinkindex.domain.user.dto;

import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.entity.enums.Role;

public record UserResponse(
        Long id,
        String email,
        String nickname,
        Role role
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getNickname(),
                user.getRole()
        );
    }
}
