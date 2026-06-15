package com.caskbycask.domain.user.dto;

import com.caskbycask.domain.user.entity.enums.Role;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record ChangeRoleRequest(
        @Schema(description = "변경할 역할 (SUPER_ADMIN 제외)")
        @NotNull(message = "역할은 필수입니다.") Role role,
        @Schema(description = "관리자 메모(역할/권한 설명)")
        String description,
        @Schema(description = "담당 증류소 ID (PARTNER/DISTILLERY_STAFF 역할 시 선택)")
        Long producerId,
        @Schema(description = "접근 허용 메뉴 키(라우트 path) 목록")
        List<String> allowedMenus
) {}
