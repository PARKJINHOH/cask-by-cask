package com.caskbycask.domain.social.service;

import com.caskbycask.domain.social.config.SocialPublishingProperties;
import com.caskbycask.domain.social.entity.enums.SocialPlatform;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

@Component
@RequiredArgsConstructor
public class MetaSignedRequestVerifier {

    private static final String EXPECTED_ALGORITHM = "HMAC-SHA256";

    private final SocialPublishingProperties properties;
    private final ObjectMapper objectMapper;

    public Payload verify(SocialPlatform platform, String signedRequest) {
        if (signedRequest == null || signedRequest.isBlank()) {
            throw new InvalidMetaSignedRequestException("signed_request is required.");
        }
        String[] parts = signedRequest.split("\\.", 2);
        if (parts.length != 2 || parts[0].isBlank() || parts[1].isBlank()) {
            throw new InvalidMetaSignedRequestException("signed_request format is invalid.");
        }

        try {
            byte[] signature = decodeBase64Url(parts[0]);
            byte[] expected = hmacSha256(parts[1], appSecret(platform));
            if (!MessageDigest.isEqual(signature, expected)) {
                throw new InvalidMetaSignedRequestException("signed_request signature is invalid.");
            }

            JsonNode payload = objectMapper.readTree(decodeBase64Url(parts[1]));
            String algorithm = payload.path("algorithm").asText();
            String userId = payload.path("user_id").asText();
            if (!EXPECTED_ALGORITHM.equalsIgnoreCase(algorithm) || userId.isBlank()) {
                throw new InvalidMetaSignedRequestException("signed_request payload is invalid.");
            }
            return new Payload(userId);
        } catch (InvalidMetaSignedRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new InvalidMetaSignedRequestException("signed_request could not be verified.");
        }
    }

    private String appSecret(SocialPlatform platform) {
        String secret = platform == SocialPlatform.INSTAGRAM
                ? properties.getInstagram().getAppSecret()
                : properties.getThreads().getAppSecret();
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("Meta app secret is not configured for " + platform);
        }
        return secret;
    }

    private static byte[] hmacSha256(String encodedPayload, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return mac.doFinal(encodedPayload.getBytes(StandardCharsets.UTF_8));
    }

    private static byte[] decodeBase64Url(String value) {
        int padding = (4 - value.length() % 4) % 4;
        return Base64.getUrlDecoder().decode(value + "=".repeat(padding));
    }

    public record Payload(String userId) {
    }
}
