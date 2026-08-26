package com.caskbycask.domain.translation.service;

import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TranslationLockService {

    private static final Duration LOCK_TTL = Duration.ofSeconds(15);
    private static final DefaultRedisScript<Long> RELEASE_SCRIPT = new DefaultRedisScript<>(
            "if redis.call('get', KEYS[1]) == ARGV[1] then " +
                    "return redis.call('del', KEYS[1]) else return 0 end", Long.class);

    private final RedisTemplate<String, String> redisTemplate;

    public LockToken tryAcquire(String key) {
        String redisKey = "translation:miss:" + key;
        String token = UUID.randomUUID().toString();
        try {
            Boolean acquired = redisTemplate.opsForValue().setIfAbsent(redisKey, token, LOCK_TTL);
            return Boolean.TRUE.equals(acquired) ? new LockToken(redisKey, token) : null;
        } catch (RuntimeException e) {
            // 잠금 없이 Google을 호출하면 장애 중 중복 과금이 가능하므로 fail closed 한다.
            throw new CustomException(ErrorCode.TRANSLATION_UNAVAILABLE);
        }
    }

    public void release(LockToken lock) {
        if (lock == null) return;
        try {
            redisTemplate.execute(RELEASE_SCRIPT, List.of(lock.key()), lock.token());
        } catch (RuntimeException ignored) {
            // TTL이 최종 안전장치다. 본문·키·토큰은 로그에 남기지 않는다.
        }
    }

    public record LockToken(String key, String token) {}
}
