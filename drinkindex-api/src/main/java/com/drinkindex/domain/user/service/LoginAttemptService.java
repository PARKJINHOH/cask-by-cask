package com.drinkindex.domain.user.service;

import com.drinkindex.domain.user.policy.AccountPolicy;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * 로그인 실패 횟수 추적 및 계정 잠금 (무차별 대입 방어, Redis 기반).
 * {@link AccountPolicy#LOGIN_MAX_FAILURES}회 연속 실패 시
 * {@link AccountPolicy#LOGIN_LOCK_MINUTES}분 동안 잠금.
 */
@Service
@RequiredArgsConstructor
public class LoginAttemptService {

    private static final String FAIL_PREFIX = "login:fail:";
    private static final String LOCK_PREFIX = "login:lock:";
    private static final Duration LOCK_TTL = Duration.ofMinutes(AccountPolicy.LOGIN_LOCK_MINUTES);

    private final StringRedisTemplate redisTemplate;

    /** 현재 잠금 상태 여부 */
    public boolean isLocked(String email) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(LOCK_PREFIX + email));
    }

    /** 남은 잠금 시간(초). 잠금이 아니면 0. */
    public long lockRemainingSeconds(String email) {
        Long ttl = redisTemplate.getExpire(LOCK_PREFIX + email, TimeUnit.SECONDS);
        return ttl != null && ttl > 0 ? ttl : 0;
    }

    /**
     * 로그인 실패 1건 기록. 임계 횟수 도달 시 잠금 설정.
     * @return 잠금이 새로 걸렸으면 true
     */
    public boolean recordFailure(String email) {
        String failKey = FAIL_PREFIX + email;
        Long count = redisTemplate.opsForValue().increment(failKey);
        if (count != null && count == 1L) {
            // 실패 카운트도 잠금 시간만큼 유지 → 일정 시간 후 자동 리셋
            redisTemplate.expire(failKey, LOCK_TTL);
        }
        if (count != null && count >= AccountPolicy.LOGIN_MAX_FAILURES) {
            redisTemplate.opsForValue().set(LOCK_PREFIX + email, "1", LOCK_TTL);
            redisTemplate.delete(failKey);
            return true;
        }
        return false;
    }

    /** 로그인 성공 시 실패/잠금 기록 초기화 */
    public void reset(String email) {
        redisTemplate.delete(FAIL_PREFIX + email);
        redisTemplate.delete(LOCK_PREFIX + email);
    }
}
