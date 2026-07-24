package com.caskbycask.domain.social.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "social-publishing")
public class SocialPublishingProperties {

    private boolean enabled = false;
    private String siteUrl = "https://www.caskbycask.net";
    private String publicMediaBaseUrl = "https://www.caskbycask.net";
    private String oauthRedirectUri = "http://localhost:8080/api/admin/social/accounts/oauth/callback";
    private String tokenEncryptionKey = "";
    private final Provider instagram = new Provider();
    private final Provider threads = new Provider();

    @Getter
    @Setter
    public static class Provider {
        private String appId = "";
        private String appSecret = "";
        private String authorizationUrl = "";
        private String oauthApiBaseUrl = "";
        private String apiBaseUrl = "";
        private String scopes = "";
    }
}
