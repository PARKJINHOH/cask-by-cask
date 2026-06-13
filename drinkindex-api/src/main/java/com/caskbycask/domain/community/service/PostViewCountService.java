package com.caskbycask.domain.community.service;

import com.caskbycask.domain.community.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class PostViewCountService {

    private final RedisTemplate<String, String> redisTemplate;
    private final PostRepository postRepository;

    // Key: post:view:{postId}:{userId or ip}  TTL: 1시간 — 중복 조회 방지
    @Transactional
    public void tryIncrementViewCount(Long postId, Long userId, String clientIp) {
        String identifier = userId != null ? "user:" + userId : "ip:" + clientIp;
        String key = "post:view:" + postId + ":" + identifier;

        Boolean isNew = redisTemplate.opsForValue().setIfAbsent(key, "1", Duration.ofHours(1));
        if (Boolean.TRUE.equals(isNew)) {
            postRepository.incrementViewCount(postId);
        }
    }
}
