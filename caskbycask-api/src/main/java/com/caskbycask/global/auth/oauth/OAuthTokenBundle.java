package com.caskbycask.global.auth.oauth;

/** 제공자 토큰 교환 결과. refreshToken 은 제공자가 주지 않을 수 있어 nullable. */
public record OAuthTokenBundle(String accessToken, String refreshToken) {
}
