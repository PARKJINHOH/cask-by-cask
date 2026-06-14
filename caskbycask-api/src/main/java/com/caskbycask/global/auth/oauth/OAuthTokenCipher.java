package com.caskbycask.global.auth.oauth;

import com.caskbycask.global.config.OAuthProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * 제공자 refresh token 보관용 대칭 암호화기 (AES-256-GCM).
 *
 * - 키: 설정값 oauth.token-encryption-key (Base64 인코딩된 32바이트). JWT 시크릿과 동일하게 env 주입.
 * - 출력 형식: Base64( IV(12B) || ciphertext+tag ). 복호화는 앞 12바이트를 IV 로 분리해 수행.
 *
 * refresh token 은 탈퇴/연동해제 시 access token 재발급 → 네이버 grant_type=delete / 구글 revoke 에만 쓰인다.
 */
@Slf4j
@Component
public class OAuthTokenCipher {

    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int IV_LENGTH = 12;
    private static final int TAG_LENGTH_BITS = 128;

    private final SecretKeySpec keySpec;
    private final SecureRandom random = new SecureRandom();

    public OAuthTokenCipher(OAuthProperties properties) {
        byte[] key = Base64.getDecoder().decode(properties.tokenEncryptionKey());
        if (key.length != 16 && key.length != 24 && key.length != 32) {
            throw new IllegalStateException(
                    "oauth.token-encryption-key must decode to 16/24/32 bytes (got " + key.length + ").");
        }
        this.keySpec = new SecretKeySpec(key, "AES");
    }

    /** 평문 토큰 → Base64(IV||cipher). null/blank 이면 null 반환. */
    public String encrypt(String plain) {
        if (plain == null || plain.isBlank()) {
            return null;
        }
        try {
            byte[] iv = new byte[IV_LENGTH];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            byte[] encrypted = cipher.doFinal(plain.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            byte[] out = ByteBuffer.allocate(iv.length + encrypted.length).put(iv).put(encrypted).array();
            return Base64.getEncoder().encodeToString(out);
        } catch (Exception e) {
            throw new IllegalStateException("OAuth token encryption failed", e);
        }
    }

    /** Base64(IV||cipher) → 평문. 복호화 실패/null 이면 null 반환(연동해지는 best-effort 이므로 예외로 막지 않음). */
    public String decrypt(String encoded) {
        if (encoded == null || encoded.isBlank()) {
            return null;
        }
        try {
            byte[] all = Base64.getDecoder().decode(encoded);
            ByteBuffer buffer = ByteBuffer.wrap(all);
            byte[] iv = new byte[IV_LENGTH];
            buffer.get(iv);
            byte[] cipherBytes = new byte[buffer.remaining()];
            buffer.get(cipherBytes);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, keySpec, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            return new String(cipher.doFinal(cipherBytes), java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.warn("OAuth token decryption failed — skipping provider unlink: {}", e.getMessage());
            return null;
        }
    }
}
