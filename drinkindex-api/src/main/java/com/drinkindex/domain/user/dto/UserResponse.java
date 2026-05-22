package com.drinkindex.domain.user.dto;

import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.entity.enums.AdminMenuKey;
import com.drinkindex.domain.user.entity.enums.Role;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.List;

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
        LocalDateTime createdAt,
        @Schema(description = "현재 숙성력 총합")
        Integer maturingPower,
        @Schema(description = "현재 레벨 (1~11)")
        Integer currentLevel,
        @Schema(description = "현재 연속 출석 일수")
        Integer consecutiveAttendance,
        @Schema(description = "고정닉 여부")
        Boolean nicknameFixed,
        @Schema(description = "마지막 닉네임 변경 일시 (null이면 변경 이력 없음)")
        LocalDateTime nicknameChangedAt,
        @Schema(description = "프로필 이미지 URL (null이면 기본 아바타)")
        String profileImageUrl,
        @Schema(description = "마지막 프로필 이미지 변경 일시 (null이면 변경 이력 없음)")
        LocalDateTime profileImageChangedAt,
        @Schema(description = "이메일 수신 동의 여부")
        Boolean emailSubscribed,
        @Schema(description = "허용된 관리자 메뉴 (DISTILLERY 역할 전용)")
        List<AdminMenuKey> allowedMenus
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getNickname(),
                user.getRole(),
                user.getCreatedAt(),
                user.getMaturingPower(),
                user.getCurrentLevel(),
                user.getConsecutiveAttendance(),
                user.getNicknameFixed(),
                user.getNicknameChangedAt(),
                user.getProfileImageUrl(),
                user.getProfileImageChangedAt(),
                user.getEmailSubscribed(),
                user.getRoleType() != null ? List.copyOf(user.getRoleType().getAllowedMenus()) : List.of()
        );
    }
}
