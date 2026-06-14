package com.caskbycask.global.auth.oauth;

/**
 * 제공자별 응답을 정규화한 사용자 정보.
 * providerUserId(네이버 id / 구글 sub)만 필수이며, email 은 미제공/미인증일 수 있다.
 */
public record OAuthUserInfo(
        String providerUserId,
        String email,
        boolean emailVerified,
        String nickname,
        String profileImageUrl
) {
}
