package com.caskbycask.global.auth.oauth;

import com.caskbycask.domain.user.entity.enums.SocialProvider;

/**
 * 소셜 제공자별 OAuth2 연동 클라이언트 (커스텀 REST 코드교환 방식).
 * 신원 확인은 항상 서버가 code 교환으로 수행하며, 클라이언트가 보낸 신원은 신뢰하지 않는다.
 */
public interface OAuthProviderClient {

    SocialProvider provider();

    /** 인가 URL 생성 (state 포함). redirectUri 는 호출 측에서 화이트리스트 검증 후 전달. */
    String buildAuthorizeUrl(String redirectUri, String state);

    /** authorization code → 토큰 교환. */
    OAuthTokenBundle exchangeCode(String code, String redirectUri, String state);

    /** access token 으로 사용자 정보 조회 (정규화). */
    OAuthUserInfo fetchUserInfo(String accessToken);

    /**
     * 우리 서비스 ↔ 제공자 연결 해지 (네이버 grant_type=delete / 구글 revoke).
     * best-effort — 실패해도 예외를 던지지 않고 false 를 반환한다.
     */
    boolean unlink(String refreshToken);
}
