package com.drinkindex.global.ratelimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.Refill;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;

// [보안] Rate Limiting: 이미지 업로드 API 남용 방지
//   Key: rate:notice:image-upload:{userId}
//   버킷: 20 토큰, 1분마다 전체 리필 (intervally — 분 시작 시 일괄 지급)
//   초과 시: RateLimitExceededException → 429 응답
@Component
@RequiredArgsConstructor
public class NoticeImageRateLimiter {

    private static final String KEY_PREFIX = "rate:notice:image-upload:";

    private static final BucketConfiguration BUCKET_CONFIG = BucketConfiguration.builder()
            .addLimit(Bandwidth.classic(20, Refill.intervally(20, Duration.ofMinutes(1))))
            .build();

    private final ProxyManager<String> bucket4jProxyManager;

    /**
     * 토큰 1개 소비 시도. false이면 한도 초과.
     */
    public boolean tryConsume(Long userId) {
        String key = KEY_PREFIX + userId;
        Bucket bucket = bucket4jProxyManager.builder().build(key, () -> BUCKET_CONFIG);
        return bucket.tryConsume(1);
    }
}
