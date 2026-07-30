package com.caskbycask.global.config;

import com.caskbycask.domain.seo.service.SpiritSeoService;
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
 * spiritSeo 캐시: 주류 SEO 조회(canonical·title·description) 결과를 60초간 보관.
 *   - 주류 페이지 요청의 임계 경로다. Next.js proxy 가 canonical 판정을 위해 호출하고
 *     클라이언트도 상세 진입 시 호출하며, 한 번에 5~6개 쿼리가 나간다.
 *   - expireAfterWrite 60s : 이미 존재하는 지연(proxy 5분, Next.js ISR 3600초)보다 짧으므로
 *                            색인 신호의 최악 지연을 늘리지 않는다.
 *   - maximumSize 2,000    : 엔트리마다 에디션 목록을 포함하므로 사용자 캐시보다 작게 제한
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
        manager.registerCustomCache(SpiritSeoService.SEO_CACHE_NAME, Caffeine.newBuilder()
                .expireAfterWrite(Duration.ofSeconds(60))
                .maximumSize(2_000)
                .recordStats()
                .build());
        return manager;
    }
}
