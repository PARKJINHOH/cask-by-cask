package com.caskbycask.domain.user.dto;

import com.caskbycask.domain.community.entity.enums.BoardType;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.entity.enums.Role;
import com.caskbycask.domain.user.entity.enums.SignupMethod;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

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
        @Schema(description = "휴면 계정 여부")
        Boolean dormant,
        @Schema(description = "마지막 로그인 일시 (null이면 로그인 이력 없음)")
        LocalDateTime lastLoginAt,
        @Schema(description = "담당 증류소 ID (DISTILLERY 역할인 경우)")
        Long producerId,
        @Schema(description = "담당 증류소 한글명 (DISTILLERY 역할인 경우)")
        String producerNameKo,
        @Schema(description = "가입 일시")
        LocalDateTime createdAt,
        @Schema(description = "가입 경로 (EMAIL, NAVER, GOOGLE)")
        SignupMethod signupMethod,
        @Schema(description = "징계 종료 일시 (null이면 징계 없음)")
        LocalDateTime suspendedUntil,
        @Schema(description = "징계 사유")
        String suspendReason,
        @Schema(description = "관리자 메모(역할/권한 설명)")
        String description,
        @Schema(description = "접근 허용 메뉴 키(라우트 path) 목록")
        List<String> allowedMenus,
        @Schema(description = "게시판 권한 (MODERATOR 역할 전용)")
        Set<BoardType> boardPermissions
) {
    public static AdminUserResponse from(User user) {
        return new AdminUserResponse(
                user.getId(),
                user.getEmail(),
                user.getNickname(),
                user.getRole(),
                user.getIsActive(),
                user.getDormant(),
                user.getLastLoginAt(),
                user.getProducer() != null ? user.getProducer().getId() : null,
                user.getProducer() != null ? user.getProducer().getNameKo() : null,
                user.getCreatedAt(),
                user.getSignupMethod(),
                user.getSuspendedUntil(),
                user.getSuspendReason(),
                user.getDescription(),
                List.copyOf(user.getAllowedMenus()),
                user.getRole() == Role.MODERATOR ? user.getBoardPermissions() : null
        );
    }
}
