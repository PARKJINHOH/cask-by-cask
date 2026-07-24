package com.caskbycask.domain.social.service;

import com.caskbycask.domain.social.config.SocialPublishingProperties;
import org.junit.jupiter.api.Test;

import java.security.SecureRandom;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SocialTokenCipherTest {

    @Test
    void encryptsAndDecryptsWithAes256Gcm() {
        SocialPublishingProperties properties = new SocialPublishingProperties();
        byte[] key = new byte[32];
        new SecureRandom().nextBytes(key);
        properties.setTokenEncryptionKey(Base64.getEncoder().encodeToString(key));
        SocialTokenCipher cipher = new SocialTokenCipher(properties);

        String first = cipher.encrypt("meta-access-token");
        String second = cipher.encrypt("meta-access-token");

        assertThat(first).isNotEqualTo(second);
        assertThat(cipher.decrypt(first)).isEqualTo("meta-access-token");
        assertThat(cipher.decrypt(second)).isEqualTo("meta-access-token");
    }

    @Test
    void rejectsInvalidKeyLength() {
        SocialPublishingProperties properties = new SocialPublishingProperties();
        properties.setTokenEncryptionKey(Base64.getEncoder().encodeToString(new byte[16]));
        SocialTokenCipher cipher = new SocialTokenCipher(properties);

        assertThatThrownBy(() -> cipher.encrypt("token"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("32 bytes");
    }
}
