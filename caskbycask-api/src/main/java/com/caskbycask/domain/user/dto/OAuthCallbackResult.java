package com.caskbycask.domain.user.dto;

/**
 * 콜백 결과 내부 캐리어. refreshToken 은 LOGIN 일 때만 채워지며 컨트롤러가 httpOnly 쿠키로 내려보낸다.
 */
public record OAuthCallbackResult(OAuthCallbackResponse body, String refreshToken) {
}
