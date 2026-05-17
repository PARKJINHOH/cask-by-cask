package com.drinkindex.domain.user.dto;

import com.drinkindex.domain.score.dto.AttendanceResult;

public record LoginResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        AttendanceResult attendance
) {
    public static LoginResponse of(TokenResponse tokens, AttendanceResult attendance) {
        return new LoginResponse(tokens.accessToken(), tokens.refreshToken(), tokens.tokenType(), attendance);
    }
}
