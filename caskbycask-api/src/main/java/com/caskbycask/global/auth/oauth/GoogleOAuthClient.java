package com.caskbycask.global.auth.oauth;

import com.caskbycask.domain.user.entity.enums.SocialProvider;
import com.caskbycask.global.config.OAuthProperties;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * 구글 로그인 클라이언트 (OpenID Connect).
 * 식별자: sub. refresh token 을 받으려면 인가 요청에 access_type=offline + prompt=consent 필요.
 */
@Slf4j
@Component
public class GoogleOAuthClient implements OAuthProviderClient {

    private static final String AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final String TOKEN_URL = "https://oauth2.googleapis.com/token";
    private static final String USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
    private static final String REVOKE_URL = "https://oauth2.googleapis.com/revoke";

    private final OAuthProperties.Provider config;
    private final RestClient restClient = RestClient.create();

    public GoogleOAuthClient(OAuthProperties properties) {
        this.config = properties.google();
    }

    @Override
    public SocialProvider provider() {
        return SocialProvider.GOOGLE;
    }

    @Override
    public String buildAuthorizeUrl(String redirectUri, String state) {
        requireConfigured();
        return AUTHORIZE_URL
                + "?response_type=code"
                + "&client_id=" + enc(config.clientId())
                + "&redirect_uri=" + enc(redirectUri)
                + "&scope=" + enc("openid email profile")
                + "&state=" + enc(state)
                + "&access_type=offline"
                + "&prompt=consent";
    }

    @Override
    public OAuthTokenBundle exchangeCode(String code, String redirectUri, String state) {
        requireConfigured();
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "authorization_code");
        form.add("client_id", config.clientId());
        form.add("client_secret", config.clientSecret());
        form.add("code", code);
        form.add("redirect_uri", redirectUri);

        Map<?, ?> body = postForm(TOKEN_URL, form);
        String accessToken = str(body, "access_token");
        if (accessToken == null) {
            log.warn("Google token exchange returned no access_token: {}", body);
            throw new CustomException(ErrorCode.OAUTH_PROVIDER_ERROR);
        }
        return new OAuthTokenBundle(accessToken, str(body, "refresh_token"));
    }

    @Override
    public OAuthUserInfo fetchUserInfo(String accessToken) {
        Map<?, ?> body = getJson(USERINFO_URL, accessToken);
        String sub = str(body, "sub");
        if (sub == null) {
            throw new CustomException(ErrorCode.OAUTH_PROVIDER_ERROR);
        }
        Object verified = body.get("email_verified");
        boolean emailVerified = Boolean.TRUE.equals(verified) || "true".equalsIgnoreCase(String.valueOf(verified));
        return new OAuthUserInfo(
                sub,
                str(body, "email"),
                emailVerified,
                str(body, "name"),
                str(body, "picture")
        );
    }

    @Override
    public boolean unlink(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank() || !config.isConfigured()) {
            return false;
        }
        try {
            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("token", refreshToken);
            postForm(REVOKE_URL, form);
            return true;
        } catch (Exception e) {
            log.warn("Google revoke failed (best-effort): {}", e.getMessage());
            return false;
        }
    }

    private void requireConfigured() {
        if (!config.isConfigured()) {
            throw new CustomException(ErrorCode.OAUTH_PROVIDER_NOT_CONFIGURED);
        }
    }

    private Map<?, ?> postForm(String url, MultiValueMap<String, String> form) {
        try {
            return restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(Map.class);
        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Google POST {} failed: {}", url, e.getMessage());
            throw new CustomException(ErrorCode.OAUTH_PROVIDER_ERROR);
        }
    }

    private Map<?, ?> getJson(String url, String accessToken) {
        try {
            return restClient.get()
                    .uri(url)
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .body(Map.class);
        } catch (Exception e) {
            log.warn("Google GET {} failed: {}", url, e.getMessage());
            throw new CustomException(ErrorCode.OAUTH_PROVIDER_ERROR);
        }
    }

    private static String str(Map<?, ?> map, String key) {
        Object v = map.get(key);
        return v == null ? null : v.toString();
    }

    private static String enc(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
