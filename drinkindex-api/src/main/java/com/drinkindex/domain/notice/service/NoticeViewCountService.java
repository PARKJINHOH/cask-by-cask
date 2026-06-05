package com.drinkindex.domain.notice.service;

import com.drinkindex.domain.notice.repository.NoticeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

/**
 * [패치 7] 공지 조회수 중복 방지 — 게시글(PostViewCountService)과 동일한 Redis TTL 1시간 정책.
 */
@Service
@RequiredArgsConstructor
public class NoticeViewCountService {

    private final RedisTemplate<String, String> redisTemplate;
    private final NoticeRepository noticeRepository;

    // Key: notice:view:{noticeId}:{userId or ip}  TTL: 1시간 — 중복 조회 방지
    @Transactional
    public void tryIncrementViewCount(Long noticeId, Long userId, String clientIp) {
        String identifier = userId != null ? "user:" + userId : "ip:" + clientIp;
        String key = "notice:view:" + noticeId + ":" + identifier;

        Boolean isNew = redisTemplate.opsForValue().setIfAbsent(key, "1", Duration.ofHours(1));
        if (Boolean.TRUE.equals(isNew)) {
            noticeRepository.incrementViewCount(noticeId);
        }
    }
}
