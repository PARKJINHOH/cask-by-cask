package com.caskbycask.global.auth.jwt;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Repository;

import java.time.Duration;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class RefreshTokenRepository {

    private static final String KEY_PREFIX = "refresh:token:";

    private final RedisTemplate<String, String> redisTemplate;

    public void save(Long userId, String refreshToken, Duration duration) {
        redisTemplate.opsForValue().set(buildKey(userId), refreshToken, duration);
    }

    public Optional<String> findByUserId(Long userId) {
        return Optional.ofNullable(redisTemplate.opsForValue().get(buildKey(userId)));
    }

    public void deleteByUserId(Long userId) {
        redisTemplate.delete(buildKey(userId));
    }

    private String buildKey(Long userId) {
        return KEY_PREFIX + userId;
    }
}
