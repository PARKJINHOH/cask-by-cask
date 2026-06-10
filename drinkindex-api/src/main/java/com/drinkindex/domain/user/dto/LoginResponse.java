package com.drinkindex.domain.user.dto;

import com.drinkindex.domain.score.dto.AttendanceResult;

/**
 * 로그인/재활성화 응답 바디.
 * refresh 토큰은 httpOnly 쿠키로만 전달되므로 바디에는 포함하지 않는다 (access 토큰만).
 */
public record LoginResponse(
        String accessToken,
        String tokenType,
        AttendanceResult attendance,
        boolean passwordChangeRequired,
        boolean mustChangePassword
) {
    public static LoginResponse of(String accessToken, AttendanceResult attendance,
                                   boolean passwordChangeRequired, boolean mustChangePassword) {
        return new LoginResponse(accessToken, "Bearer", attendance, passwordChangeRequired, mustChangePassword);
    }
}
