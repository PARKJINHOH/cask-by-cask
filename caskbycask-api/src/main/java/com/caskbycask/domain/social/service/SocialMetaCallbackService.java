package com.caskbycask.domain.social.service;

import com.caskbycask.domain.social.config.SocialPublishingProperties;
import com.caskbycask.domain.social.entity.SocialAccountConnection;
import com.caskbycask.domain.social.entity.SocialDataDeletionRequest;
import com.caskbycask.domain.social.entity.enums.SocialDataDeletionStatus;
import com.caskbycask.domain.social.entity.enums.SocialPlatform;
import com.caskbycask.domain.social.repository.SocialAccountConnectionRepository;
import com.caskbycask.domain.social.repository.SocialDataDeletionRequestRepository;
import com.caskbycask.domain.social.repository.SocialPublicationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
@Slf4j
public class SocialMetaCallbackService {

    private final MetaSignedRequestVerifier signedRequestVerifier;
    private final SocialPublishingProperties properties;
    private final SocialAccountConnectionRepository connectionRepository;
    private final SocialPublicationRepository publicationRepository;
    private final SocialDataDeletionRequestRepository deletionRequestRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public void deauthorize(SocialPlatform platform, String signedRequest) {
        String userId = signedRequestVerifier.verify(platform, signedRequest).userId();
        connectionRepository.findByPlatformAndExternalUserId(platform, userId)
                .ifPresent(connectionRepository::delete);
        log.info("Meta account deauthorized: platform={}, externalUserIdHash={}",
                platform, shortHash(userId));
    }

    @Transactional
    public DeletionResult deleteData(SocialPlatform platform, String signedRequest) {
        String userId = signedRequestVerifier.verify(platform, signedRequest).userId();
        SocialAccountConnection connection = connectionRepository
                .findByPlatformAndExternalUserId(platform, userId)
                .orElse(null);
        if (connection != null) {
            connectionRepository.delete(connection);
            publicationRepository.eraseProviderDataByPlatform(platform);
        }

        String confirmationCode = newConfirmationCode();
        LocalDateTime completedAt = LocalDateTime.now();
        deletionRequestRepository.save(SocialDataDeletionRequest.builder()
                .confirmationCode(confirmationCode)
                .platform(platform)
                .status(SocialDataDeletionStatus.COMPLETED)
                .completedAt(completedAt)
                .build());

        String statusUrl = properties.getSiteUrl().replaceAll("/+$", "")
                + "/api/social/meta/data-deletion/status/" + confirmationCode;
        log.info("Meta data deletion completed: platform={}, confirmationCode={}",
                platform, confirmationCode);
        return new DeletionResult(statusUrl, confirmationCode);
    }

    @Transactional(readOnly = true)
    public SocialDataDeletionRequest status(String confirmationCode) {
        return deletionRequestRepository.findByConfirmationCode(confirmationCode)
                .orElse(null);
    }

    private String newConfirmationCode() {
        for (int i = 0; i < 5; i++) {
            byte[] bytes = new byte[16];
            secureRandom.nextBytes(bytes);
            String code = HexFormat.of().formatHex(bytes);
            if (!deletionRequestRepository.existsByConfirmationCode(code)) {
                return code;
            }
        }
        throw new IllegalStateException("Could not allocate a unique data deletion confirmation code.");
    }

    private static String shortHash(String value) {
        return sha256(value).substring(0, 12);
    }

    private static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public record DeletionResult(String statusUrl, String confirmationCode) {
    }
}
