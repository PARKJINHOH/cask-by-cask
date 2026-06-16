package com.caskbycask.global.config;

import com.caskbycask.global.auth.security.AuthUserCache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * 인메모리 캐시 설정 (Caffeine).
 *
 * authUser 캐시: 인증 필터 hot-path 의 사용자 조회 결과(CustomUserDetails)를 60초간 보관.
 *   - expireAfterWrite 60s : 권한·활성여부 변경의 staleness 상한 (무효화 누락 시 안전망)
 *   - maximumSize 50,000   : 동시 활성 사용자 상한 가정 — 초과 시 LRU 유사 정책으로 방출
 *
 * ※ 단일 인스턴스 인메모리 캐시. 추후 다중 인스턴스로 확장하면 캐시 무효화가 인스턴스별로만
 *   적용되므로(최대 60초 불일치), 그때 Redis 캐시로 전환하거나 TTL 을 더 짧게 조정할 것.
 */
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager(AuthUserCache.CACHE_NAME);
        manager.setCaffeine(Caffeine.newBuilder()
                .expireAfterWrite(Duration.ofSeconds(60))
                .maximumSize(50_000)
                .recordStats());
        return manager;
    }
}
