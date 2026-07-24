package com.caskbycask.domain.social.service;

import com.caskbycask.domain.social.config.SocialPublishingProperties;
import com.caskbycask.domain.social.dto.SocialAdminDtos;
import com.caskbycask.domain.social.entity.SocialAccountConnection;
import com.caskbycask.domain.social.entity.SocialOAuthState;
import com.caskbycask.domain.social.entity.enums.SocialConnectionStatus;
import com.caskbycask.domain.social.entity.enums.SocialPlatform;
import com.caskbycask.domain.social.repository.SocialAccountConnectionRepository;
import com.caskbycask.domain.social.repository.SocialOAuthStateRepository;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SocialAccountService {

    private final SocialPublishingProperties properties;
    private final SocialOAuthStateRepository stateRepository;
    private final SocialAccountConnectionRepository connectionRepository;
    private final UserRepository userRepository;
    private final SocialTokenCipher tokenCipher;
    private final MetaSocialClient metaClient;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public SocialAdminDtos.OAuthUrlResponse startOAuth(
            SocialPlatform platform, Long userId, String returnUrl) {
        validateProviderConfig(platform);
        User user = userRepository.getByIdOrThrow(userId);
        String normalizedReturnUrl = normalizeReturnUrl(returnUrl);
        byte[] stateBytes = new byte[32];
        secureRandom.nextBytes(stateBytes);
        String rawState = Base64.getUrlEncoder().withoutPadding().encodeToString(stateBytes);
        stateRepository.save(SocialOAuthState.builder()
                .stateHash(sha256(rawState))
                .platform(platform)
                .requestedBy(user)
                .returnUrl(normalizedReturnUrl)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .build());
        return new SocialAdminDtos.OAuthUrlResponse(metaClient.authorizationUrl(platform, rawState));
    }

    @Transactional
    public String completeOAuth(String rawState, String code) {
        SocialOAuthState state = stateRepository.findByStateHash(sha256(rawState))
                .filter(value -> value.isUsable(LocalDateTime.now()))
                .orElseThrow(() -> new CustomException(ErrorCode.SOCIAL_OAUTH_STATE_INVALID));
        MetaSocialClient.TokenResult token = metaClient.exchangeCode(state.getPlatform(), code);
        if (token.userId() == null || token.accessToken() == null) {
            throw new CustomException(ErrorCode.SOCIAL_OAUTH_STATE_INVALID);
        }
        LocalDateTime expiresAt = LocalDateTime.now().plusSeconds(token.expiresInSeconds());
        String encrypted = tokenCipher.encrypt(token.accessToken());
        String scopes = provider(state.getPlatform()).getScopes();
        SocialAccountConnection connection = connectionRepository.findByPlatform(state.getPlatform())
                .orElseGet(() -> SocialAccountConnection.builder()
                        .platform(state.getPlatform())
                        .externalUserId(token.userId())
                        .username(token.username())
                        .encryptedAccessToken(encrypted)
                        .tokenExpiresAt(expiresAt)
                        .grantedScopes(scopes)
                        .status(SocialConnectionStatus.CONNECTED)
                        .lastVerifiedAt(LocalDateTime.now())
                        .lastRefreshedAt(LocalDateTime.now())
                        .connectedBy(state.getRequestedBy())
                        .build());
        if (connection.getId() != null) {
            connection.reconnect(token.userId(), token.username(), encrypted,
                    expiresAt, scopes, state.getRequestedBy());
        }
        connectionRepository.save(connection);
        state.consume();
        return state.getReturnUrl();
    }

    @Transactional(readOnly = true)
    public List<SocialAdminDtos.AccountResponse> status() {
        return connectionRepository.findAll().stream()
                .map(SocialAdminDtos.AccountResponse::from)
                .toList();
    }

    @Transactional
    public SocialAdminDtos.AccountResponse verify(SocialPlatform platform) {
        SocialAccountConnection connection = requiredConnection(platform);
        try {
            var profile = metaClient.getProfile(platform,
                    tokenCipher.decrypt(connection.getEncryptedAccessToken()));
            connection.verified(profile.username());
        } catch (Exception e) {
            connection.markStatus(SocialConnectionStatus.INVALID, safeMessage(e));
        }
        return SocialAdminDtos.AccountResponse.from(connection);
    }

    @Transactional
    public void disconnect(SocialPlatform platform) {
        connectionRepository.findByPlatform(platform).ifPresent(connectionRepository::delete);
    }

    @Transactional
    public void refreshExpiringTokens() {
        LocalDateTime threshold = LocalDateTime.now().plusDays(14);
        for (SocialAccountConnection connection : connectionRepository.findByTokenExpiresAtBefore(threshold)) {
            try {
                String current = tokenCipher.decrypt(connection.getEncryptedAccessToken());
                MetaSocialClient.TokenResult refreshed = metaClient.refreshLongLived(
                        connection.getPlatform(), current);
                connection.refreshed(
                        tokenCipher.encrypt(refreshed.accessToken()),
                        LocalDateTime.now().plusSeconds(refreshed.expiresInSeconds())
                );
            } catch (Exception e) {
                SocialConnectionStatus status = connection.getTokenExpiresAt().isBefore(LocalDateTime.now())
                        ? SocialConnectionStatus.EXPIRED : SocialConnectionStatus.EXPIRING;
                connection.markStatus(status, safeMessage(e));
                if (status == SocialConnectionStatus.EXPIRED) {
                    log.error("SNS access token expired and automatic refresh failed: platform={}",
                            connection.getPlatform(), e);
                } else {
                    log.warn("SNS access token refresh failed: platform={}, expiresAt={}",
                            connection.getPlatform(), connection.getTokenExpiresAt(), e);
                }
            }
        }
        stateRepository.deleteByExpiresAtBefore(LocalDateTime.now().minusDays(1));
    }

    private SocialAccountConnection requiredConnection(SocialPlatform platform) {
        return connectionRepository.findByPlatform(platform)
                .orElseThrow(() -> new CustomException(ErrorCode.SOCIAL_ACCOUNT_NOT_CONNECTED));
    }

    private void validateProviderConfig(SocialPlatform platform) {
        var provider = provider(platform);
        if (provider.getAppId().isBlank() || provider.getAppSecret().isBlank()
                || properties.getOauthRedirectUri().isBlank()) {
            throw new CustomException(ErrorCode.SOCIAL_ACCOUNT_NOT_CONNECTED);
        }
    }

    private SocialPublishingProperties.Provider provider(SocialPlatform platform) {
        return platform == SocialPlatform.INSTAGRAM
                ? properties.getInstagram() : properties.getThreads();
    }

    private static String normalizeReturnUrl(String returnUrl) {
        if (returnUrl == null || returnUrl.isBlank()) return "/admin/social";
        String value = returnUrl.trim();
        if (!value.startsWith("/") || value.startsWith("//") || value.contains("://")
                || value.contains("\r") || value.contains("\n")) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        return value.length() <= 500 ? value : "/admin/social";
    }

    private static String sha256(String value) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static String safeMessage(Exception e) {
        String message = e.getMessage();
        if (message == null) return e.getClass().getSimpleName();
        return message.length() <= 1000 ? message : message.substring(0, 1000);
    }
}
