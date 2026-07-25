package com.caskbycask.domain.social.service;

import com.caskbycask.domain.social.config.SocialPublishingProperties;
import com.caskbycask.domain.social.entity.enums.SocialPlatform;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MetaSignedRequestVerifierTest {

    private static final String SECRET = "threads-secret-for-test";

    private MetaSignedRequestVerifier verifier;

    @BeforeEach
    void setUp() {
        SocialPublishingProperties properties = new SocialPublishingProperties();
        properties.getThreads().setAppSecret(SECRET);
        verifier = new MetaSignedRequestVerifier(properties, new ObjectMapper());
    }

    @Test
    void verifiesValidThreadsSignedRequest() throws Exception {
        String signedRequest = signedRequest("""
                {"algorithm":"HMAC-SHA256","user_id":"threads-user-123","issued_at":1234}
                """);

        var payload = verifier.verify(SocialPlatform.THREADS, signedRequest);

        assertThat(payload.userId()).isEqualTo("threads-user-123");
    }

    @Test
    void rejectsTamperedPayload() throws Exception {
        String signedRequest = signedRequest("""
                {"algorithm":"HMAC-SHA256","user_id":"threads-user-123"}
                """);
        String tampered = signedRequest.substring(0, signedRequest.length() - 1) + "A";

        assertThatThrownBy(() -> verifier.verify(SocialPlatform.THREADS, tampered))
                .isInstanceOf(InvalidMetaSignedRequestException.class);
    }

    @Test
    void rejectsUnexpectedAlgorithm() throws Exception {
        String signedRequest = signedRequest("""
                {"algorithm":"HMAC-SHA1","user_id":"threads-user-123"}
                """);

        assertThatThrownBy(() -> verifier.verify(SocialPlatform.THREADS, signedRequest))
                .isInstanceOf(InvalidMetaSignedRequestException.class)
                .hasMessageContaining("payload");
    }

    private static String signedRequest(String json) throws Exception {
        Base64.Encoder encoder = Base64.getUrlEncoder().withoutPadding();
        String payload = encoder.encodeToString(json.getBytes(StandardCharsets.UTF_8));
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String signature = encoder.encodeToString(
                mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
        return signature + "." + payload;
    }
}
