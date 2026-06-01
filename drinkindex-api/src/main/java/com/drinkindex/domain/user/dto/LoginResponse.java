package com.drinkindex.domain.user.dto;

import com.drinkindex.domain.score.dto.AttendanceResult;

public record LoginResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        AttendanceResult attendance,
        boolean passwordChangeRequired,
        boolean mustChangePassword
) {
    public static LoginResponse of(TokenResponse tokens, AttendanceResult attendance,
                                   boolean passwordChangeRequired, boolean mustChangePassword) {
        return new LoginResponse(tokens.accessToken(), tokens.refreshToken(), tokens.tokenType(),
                attendance, passwordChangeRequired, mustChangePassword);
    }
}
