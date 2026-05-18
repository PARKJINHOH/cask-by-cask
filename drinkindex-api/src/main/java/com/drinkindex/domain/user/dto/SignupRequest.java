package com.drinkindex.domain.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @Schema(description = "이메일 주소")
        @Email(message = "이메일 형식이 올바르지 않습니다.")
        @NotBlank(message = "이메일을 입력해주세요.")
        String email,

        @Schema(description = "비밀번호 (영문+숫자+특수문자 포함, 7~100자)")
        @NotBlank(message = "비밀번호를 입력해주세요.")
        @Size(min = 7, max = 100, message = "비밀번호는 7자 이상 100자 이하로 입력해주세요.")
        @Pattern(regexp = "^[a-zA-Z\\d!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?]+$",
                 message = "비밀번호는 영문, 숫자, 특수문자만 사용 가능합니다.")
        @Pattern(regexp = ".*\\d.*",
                 message = "비밀번호에 숫자가 최소 1개 포함되어야 합니다.")
        @Pattern(regexp = ".*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>/?].*",
                 message = "비밀번호에 특수문자가 최소 1개 포함되어야 합니다.")
        String password,

        @Schema(description = "닉네임 (한글 또는 영문, 2~8자)")
        @NotBlank(message = "닉네임을 입력해주세요.")
        @Size(min = 2, max = 8, message = "닉네임은 2자 이상 8자 이하로 입력해주세요.")
        @Pattern(regexp = "^[가-힣a-zA-Z]+$", message = "닉네임은 한글 또는 영문만 사용 가능합니다.")
        String nickname,

        @Schema(description = "이용약관 동의 여부")
        @AssertTrue(message = "이용약관에 동의해주세요.")
        boolean agreedToTerms,

        @Schema(description = "개인정보 처리방침 동의 여부")
        @AssertTrue(message = "개인정보 처리방침에 동의해주세요.")
        boolean agreedToPrivacy
) {}
