package com.caskbycask.global.config;

import com.caskbycask.domain.seo.service.SpiritSeoService;
import com.caskbycask.global.auth.security.AuthUserCache;
import com.github.benmanes.caffeine.cache.Cache;
import org.junit.jupiter.api.Test;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 캐시 등록 계약 검증.
 *
 * spiritSeo 캐시는 주류 페이지 요청의 임계 경로에 있다(Next.js proxy 의 canonical 판정 + 클라이언트 조회).
 * 이름이 어긋나거나 등록이 누락되면 캐시가 조용히 동작하지 않으므로 회귀를 막는다.
 */
class CacheConfigTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(CacheConfig.class);

    @Test
    void registersAuthUserAndSpiritSeoCaches() {
        contextRunner.run(context -> {
            assertThat(context).hasNotFailed();
            CacheManager manager = context.getBean(CacheManager.class);

            assertThat(manager.getCacheNames())
                    .contains(AuthUserCache.CACHE_NAME, SpiritSeoService.SEO_CACHE_NAME);
            assertThat(manager.getCache(SpiritSeoService.SEO_CACHE_NAME)).isNotNull();
        });
    }

    @Test
    void spiritSeoCacheStoresAndReturnsValuesUnderItsOwnBounds() {
        contextRunner.run(context -> {
            CacheManager manager = context.getBean(CacheManager.class);
            var cache = manager.getCache(SpiritSeoService.SEO_CACHE_NAME);
            assertThat(cache).isNotNull();

            cache.put(244L, "canonical");
            assertThat(cache.get(244L)).isNotNull();
            assertThat(cache.get(244L).get()).isEqualTo("canonical");

            // 엔트리마다 에디션 목록을 담으므로 사용자 캐시(50,000)보다 작게 제한한다.
            Cache<Object, Object> nativeCache = ((CaffeineCache) cache).getNativeCache();
            assertThat(nativeCache.policy().eviction()).isPresent();
            assertThat(nativeCache.policy().eviction().get().getMaximum()).isEqualTo(2_000L);

            // TTL 은 proxy(5분)·ISR(3600초) 지연보다 짧아야 색인 신호의 최악 지연을 늘리지 않는다.
            assertThat(nativeCache.policy().expireAfterWrite()).isPresent();
            assertThat(nativeCache.policy().expireAfterWrite().get().getExpiresAfter().toSeconds())
                    .isEqualTo(60L);
        });
    }
}
