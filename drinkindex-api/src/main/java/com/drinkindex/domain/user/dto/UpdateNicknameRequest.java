package com.drinkindex.domain.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateNicknameRequest(
        @NotBlank(message = "닉네임을 입력해주세요.")
        @Size(min = 2, max = 100, message = "닉네임은 2자 이상 100자 이하로 입력해주세요.")
        String nickname
) {}
