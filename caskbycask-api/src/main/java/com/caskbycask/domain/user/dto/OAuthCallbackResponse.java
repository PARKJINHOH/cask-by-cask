package com.caskbycask.domain.user.dto;

/**
 * 소셜 콜백 결과 (로그인/신규가입/연동안내 분기).
 *   - LOGIN        : 이미 연동된 계정 → login 바디(accessToken 등). refresh 토큰은 쿠키로.
 *   - NEEDS_SIGNUP : 신규 → signupTicket + 제공자 이메일/검증여부 + 추천 닉네임으로 가입완료 진행.
 *   - NEEDS_LINK   : 기존 이메일 계정 존재 → 로그인 후 linkTicket 으로 연동.
 */
public record OAuthCallbackResponse(
        Status status,
        LoginResponse login,
        String signupTicket,
        String email,
        boolean emailVerified,
        String suggestedNickname,
        String linkTicket,
        String maskedEmail
) {
    public enum Status { LOGIN, NEEDS_SIGNUP, NEEDS_LINK }

    public static OAuthCallbackResponse login(LoginResponse login) {
        return new OAuthCallbackResponse(Status.LOGIN, login, null, null, false, null, null, null);
    }

    public static OAuthCallbackResponse needsSignup(String signupTicket, String email,
                                                    boolean emailVerified, String suggestedNickname) {
        return new OAuthCallbackResponse(Status.NEEDS_SIGNUP, null, signupTicket, email,
                emailVerified, suggestedNickname, null, null);
    }

    public static OAuthCallbackResponse needsLink(String linkTicket, String maskedEmail) {
        return new OAuthCallbackResponse(Status.NEEDS_LINK, null, null, null, false, null, linkTicket, maskedEmail);
    }
}
