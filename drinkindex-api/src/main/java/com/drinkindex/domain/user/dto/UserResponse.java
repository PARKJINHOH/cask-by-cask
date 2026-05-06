package com.drinkindex.domain.user.dto;

import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.entity.enums.Role;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

public record UserResponse(
        @Schema(description = "사용자 고유 ID")
        Long id,
        @Schema(description = "이메일 주소")
        String email,
        @Schema(description = "닉네임")
        String nickname,
        @Schema(description = "역할 (ADMIN, MEMBER, DISTILLERY)")
        Role role,
        @Schema(description = "가입 일시")
        LocalDateTime createdAt
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getNickname(),
                user.getRole(),
                user.getCreatedAt()
        );
    }
}
