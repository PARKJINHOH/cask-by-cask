package com.caskbycask.domain.user.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 소셜 신규가입 완료 요청.
 * email/emailCode 는 제공자가 검증된 이메일을 주지 않은 경우에만 필수(서비스에서 판정).
 */
public record OAuthSignupRequest(
        @NotBlank String signupTicket,

        @Size(min = 2, max = 8, message = "닉네임은 2자 이상 8자 이하로 입력해주세요.")
        @Pattern(regexp = "^[가-힣a-zA-Z0-9]+$", message = "닉네임은 한글, 영문 또는 숫자만 사용 가능합니다.")
        @NotBlank(message = "닉네임을 입력해주세요.")
        String nickname,

        String email,
        String emailCode,

        @AssertTrue(message = "이용약관에 동의해주세요.")
        boolean agreedToTerms,

        @AssertTrue(message = "개인정보 처리방침에 동의해주세요.")
        boolean agreedToPrivacy,

        boolean emailSubscribed
) {}
