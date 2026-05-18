package com.drinkindex.domain.user.dto;

import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.entity.enums.Role;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;

public record AdminUserResponse(
        @Schema(description = "사용자 고유 ID")
        Long id,
        @Schema(description = "이메일 주소")
        String email,
        @Schema(description = "닉네임")
        String nickname,
        @Schema(description = "역할 (ADMIN, MEMBER, DISTILLERY)")
        Role role,
        @Schema(description = "계정 활성화 여부")
        Boolean isActive,
        @Schema(description = "담당 증류소 ID (DISTILLERY 역할인 경우)")
        Long distilleryId,
        @Schema(description = "담당 증류소 한글명 (DISTILLERY 역할인 경우)")
        String distilleryNameKo,
        @Schema(description = "가입 일시")
        LocalDateTime createdAt,
        @Schema(description = "징계 종료 일시 (null이면 징계 없음)")
        LocalDateTime suspendedUntil,
        @Schema(description = "징계 사유")
        String suspendReason
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
                user.getCreatedAt(),
                user.getSuspendedUntil(),
                user.getSuspendReason()
        );
    }
}
