package com.drinkindex.domain.user.dto;

import com.drinkindex.domain.user.entity.enums.Role;
import io.swagger.v3.oas.annotations.media.Schema;

public record UserSearchCondition(
        @Schema(description = "검색어 (이메일·닉네임 부분 일치)")
        String keyword,
        @Schema(description = "역할 필터 (null이면 전체)")
        Role role,
        @Schema(description = "활성화 여부 필터 (null이면 전체)")
        Boolean isActive
) {}
