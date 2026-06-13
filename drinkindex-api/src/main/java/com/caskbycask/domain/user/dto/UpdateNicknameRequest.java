package com.caskbycask.domain.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateNicknameRequest(
        @Schema(description = "변경할 닉네임 (한글 또는 영문, 2~8자)")
        @NotBlank(message = "닉네임을 입력해주세요.")
        @Size(min = 2, max = 8, message = "닉네임은 2자 이상 8자 이하로 입력해주세요.")
        @Pattern(regexp = "^[가-힣a-zA-Z]+$", message = "닉네임은 한글 또는 영문만 사용 가능합니다.")
        String nickname
) {}
