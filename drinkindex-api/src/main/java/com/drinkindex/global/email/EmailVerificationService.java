package com.drinkindex.global.email;

import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;

@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private static final Duration CODE_TTL = Duration.ofMinutes(5);
    private static final Duration COOLDOWN_TTL = Duration.ofSeconds(60);
    private static final String CODE_PREFIX = "email:verify:";
    private static final String COOLDOWN_PREFIX = "email:cooldown:";

    private final StringRedisTemplate redisTemplate;
    private final EmailSender emailSender;

    public void sendCode(String email) {
        if (Boolean.TRUE.equals(redisTemplate.hasKey(COOLDOWN_PREFIX + email))) {
            throw new CustomException(ErrorCode.VERIFICATION_COOLDOWN);
        }

        String code = generateCode();
        redisTemplate.opsForValue().set(CODE_PREFIX + email, code, CODE_TTL);
        redisTemplate.opsForValue().set(COOLDOWN_PREFIX + email, "1", COOLDOWN_TTL);

        emailSender.send(
            email,
            "[DrinkIndex] 이메일 인증 코드",
            buildBody(code)
        );
    }

    public void verifyCode(String email, String code) {
        String stored = redisTemplate.opsForValue().get(CODE_PREFIX + email);
        if (stored == null) {
            throw new CustomException(ErrorCode.VERIFICATION_CODE_EXPIRED);
        }
        if (!stored.equals(code)) {
            throw new CustomException(ErrorCode.INVALID_VERIFICATION_CODE);
        }
        redisTemplate.delete(CODE_PREFIX + email);
        redisTemplate.delete(COOLDOWN_PREFIX + email);
    }

    private String generateCode() {
        return String.format("%06d", new SecureRandom().nextInt(1_000_000));
    }

    private String buildBody(String code) {
        return """
                안녕하세요, DrinkIndex 이메일 인증 코드입니다.

                인증 코드: %s

                이 코드는 5분간 유효합니다.
                본인이 요청하지 않았다면 이 이메일을 무시해주세요.
                """.formatted(code);
    }
}
