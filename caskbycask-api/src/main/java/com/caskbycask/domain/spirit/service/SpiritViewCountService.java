package com.caskbycask.domain.spirit.service;

import com.caskbycask.domain.spirit.repository.SpiritRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class SpiritViewCountService {

    private final RedisTemplate<String, String> redisTemplate;
    private final SpiritRepository spiritRepository;

    // Key: spirit:view:{spiritId}:ip:{clientIp}  TTL: 12시간 — 중복 조회 방지
    @Transactional
    public void tryIncrementViewCount(Long spiritId, String clientIp) {
        String key = "spirit:view:" + spiritId + ":ip:" + clientIp;

        Boolean isNew = redisTemplate.opsForValue().setIfAbsent(key, "1", Duration.ofHours(12));
        if (Boolean.TRUE.equals(isNew)) {
            spiritRepository.incrementViewCount(spiritId);
        }
    }
}
