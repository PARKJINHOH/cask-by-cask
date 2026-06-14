package com.caskbycask.global.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * 소셜 로그인(OAuth2) 설정.
 *
 * redirect-uri 는 프론트의 콜백 URL 로, 클라이언트가 보낸 값을 allowed-redirect-uris 화이트리스트와
 * 대조해 검증한다(오픈 리다이렉트 방지). client secret 등은 서버에만 둔다.
 */
@ConfigurationProperties(prefix = "oauth")
public record OAuthProperties(
        String tokenEncryptionKey,
        List<String> allowedRedirectUris,
        Provider naver,
        Provider google
) {
    public record Provider(String clientId, String clientSecret) {
        public boolean isConfigured() {
            return clientId != null && !clientId.isBlank()
                    && clientSecret != null && !clientSecret.isBlank();
        }
    }

    public boolean isAllowedRedirectUri(String redirectUri) {
        return allowedRedirectUris != null && allowedRedirectUris.contains(redirectUri);
    }
}
