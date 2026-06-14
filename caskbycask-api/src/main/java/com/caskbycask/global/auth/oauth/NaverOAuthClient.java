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
 * 네이버 로그인 클라이언트.
 * 식별자: response.id. 이메일은 필수 동의여도 미제공(null)일 수 있다.
 */
@Slf4j
@Component
public class NaverOAuthClient implements OAuthProviderClient {

    private static final String AUTHORIZE_URL = "https://nid.naver.com/oauth2.0/authorize";
    private static final String TOKEN_URL = "https://nid.naver.com/oauth2.0/token";
    private static final String USERINFO_URL = "https://openapi.naver.com/v1/nid/me";

    private final OAuthProperties.Provider config;
    private final RestClient restClient = RestClient.create();

    public NaverOAuthClient(OAuthProperties properties) {
        this.config = properties.naver();
    }

    @Override
    public SocialProvider provider() {
        return SocialProvider.NAVER;
    }

    @Override
    public String buildAuthorizeUrl(String redirectUri, String state) {
        requireConfigured();
        return AUTHORIZE_URL
                + "?response_type=code"
                + "&client_id=" + enc(config.clientId())
                + "&redirect_uri=" + enc(redirectUri)
                + "&state=" + enc(state);
    }

    @Override
    public OAuthTokenBundle exchangeCode(String code, String redirectUri, String state) {
        requireConfigured();
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "authorization_code");
        form.add("client_id", config.clientId());
        form.add("client_secret", config.clientSecret());
        form.add("code", code);
        form.add("state", state);

        Map<?, ?> body = postForm(TOKEN_URL, form);
        String accessToken = str(body, "access_token");
        if (accessToken == null) {
            log.warn("Naver token exchange returned no access_token: {}", body);
            throw new CustomException(ErrorCode.OAUTH_PROVIDER_ERROR);
        }
        return new OAuthTokenBundle(accessToken, str(body, "refresh_token"));
    }

    @Override
    public OAuthUserInfo fetchUserInfo(String accessToken) {
        Map<?, ?> body = getJson(USERINFO_URL, accessToken);
        Object responseObj = body.get("response");
        if (!(responseObj instanceof Map<?, ?> response)) {
            log.warn("Naver userinfo missing response object: {}", body);
            throw new CustomException(ErrorCode.OAUTH_PROVIDER_ERROR);
        }
        String id = str(response, "id");
        if (id == null) {
            throw new CustomException(ErrorCode.OAUTH_PROVIDER_ERROR);
        }
        String email = str(response, "email");
        // 네이버는 email_verified 플래그를 제공하지 않음 — 제공된 이메일은 검증된 것으로 간주.
        return new OAuthUserInfo(
                id,
                email,
                email != null,
                str(response, "nickname"),
                str(response, "profile_image")
        );
    }

    @Override
    public boolean unlink(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank() || !config.isConfigured()) {
            return false;
        }
        try {
            // 저장된 refresh token → 새 access token 재발급
            MultiValueMap<String, String> refreshForm = new LinkedMultiValueMap<>();
            refreshForm.add("grant_type", "refresh_token");
            refreshForm.add("client_id", config.clientId());
            refreshForm.add("client_secret", config.clientSecret());
            refreshForm.add("refresh_token", refreshToken);
            Map<?, ?> refreshed = postForm(TOKEN_URL, refreshForm);
            String accessToken = str(refreshed, "access_token");
            if (accessToken == null) {
                return false;
            }
            // grant_type=delete 로 연결 해지
            MultiValueMap<String, String> deleteForm = new LinkedMultiValueMap<>();
            deleteForm.add("grant_type", "delete");
            deleteForm.add("client_id", config.clientId());
            deleteForm.add("client_secret", config.clientSecret());
            deleteForm.add("access_token", accessToken);
            deleteForm.add("service_provider", "NAVER");
            postForm(TOKEN_URL, deleteForm);
            return true;
        } catch (Exception e) {
            log.warn("Naver unlink failed (best-effort): {}", e.getMessage());
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
            log.warn("Naver POST {} failed: {}", url, e.getMessage());
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
            log.warn("Naver GET {} failed: {}", url, e.getMessage());
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
