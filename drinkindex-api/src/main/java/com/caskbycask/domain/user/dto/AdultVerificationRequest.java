package com.caskbycask.domain.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;

import java.time.LocalDate;

/**
 * 자가 선언형 성인인증 요청. 사용자가 입력한 생년월일로 서버에서 만 나이를 재계산해 검증한다.
 */
public record AdultVerificationRequest(
        @Schema(description = "생년월일 (YYYY-MM-DD)", example = "1990-01-01")
        @NotNull(message = "생년월일을 입력해주세요.")
        @Past(message = "생년월일이 올바르지 않습니다.")
        LocalDate birthDate
) {}
