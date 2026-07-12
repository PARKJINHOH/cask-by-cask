package com.caskbycask.global.ratelimit;

import io.github.bucket4j.distributed.proxy.ProxyManager;
import io.github.bucket4j.redis.lettuce.cas.LettuceBasedProxyManager;
import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.codec.ByteArrayCodec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;

import java.time.Duration;
import java.util.List;

/**
 * Rate Limit 통합 설정.
 *
 * 정책 변경 시 {@link #rateLimitRules()} 만 수정. 정책은 위에서 아래 순서로 매칭되며
 * 첫 번째 매칭 룰이 적용됨. default 룰은 항상 마지막에 위치할 것.
 *
 * Redis 연결은 Spring Boot 의 spring.data.redis.* 값을 재사용하되,
 * Bucket4j 전용 Lettuce 네이티브 클라이언트를 별도 빈으로 분리해서 codec 충돌 회피.
 *
 * 경로 매칭은 Spring Security 6.5+ 의 {@link PathPatternRequestMatcher} 사용
 * (구 AntPathRequestMatcher 는 deprecated, 제거 예정).
 */
@Configuration
@ConditionalOnProperty(name = "rate-limit.enabled", havingValue = "true", matchIfMissing = true)
public class RateLimitConfig {

    @Value("${spring.data.redis.host:localhost}")
    private String redisHost;

    @Value("${spring.data.redis.port:6379}")
    private int redisPort;

    @Value("${spring.data.redis.password:}")
    private String redisPassword;

    @Bean(destroyMethod = "shutdown")
    public RedisClient rateLimitRedisClient() {
        RedisURI.Builder builder = RedisURI.builder()
                .withHost(redisHost)
                .withPort(redisPort);
        if (redisPassword != null && !redisPassword.isBlank()) {
            builder.withPassword(redisPassword.toCharArray());
        }
        return RedisClient.create(builder.build());
    }

    @Bean(destroyMethod = "close")
    public StatefulRedisConnection<byte[], byte[]> rateLimitRedisConnection(RedisClient redisClient) {
        return redisClient.connect(ByteArrayCodec.INSTANCE);
    }

    @Bean
    public ProxyManager<byte[]> rateLimitProxyManager(StatefulRedisConnection<byte[], byte[]> connection) {
        return LettuceBasedProxyManager.builderFor(connection).build();
    }

    /**
     * 정책 정의 — 위에서 아래로 우선순위 매칭.
     *
     * - 로그인/회원가입/메일발송: IP 기준 강한 제한 (계정 무차별 대입 방어)
     * - 인증/리프레시: IP 기준 중간 제한
     * - 검색/조회 GET: 인증 사용자는 userId, 비인증은 IP
     * - default: 모든 /api/** 에 대한 fallback
     */
    @Bean
    public List<RateLimitRule> rateLimitRules() {
        PathPatternRequestMatcher.Builder pp = PathPatternRequestMatcher.withDefaults();
        return List.of(
                new RateLimitRule(
                        "login",
                        pp.matcher(HttpMethod.POST, "/api/auth/login"),
                        10, Duration.ofMinutes(1), RateLimitRule.KeyType.IP),
                new RateLimitRule(
                        "signup",
                        pp.matcher(HttpMethod.POST, "/api/auth/signup"),
                        5, Duration.ofMinutes(1), RateLimitRule.KeyType.IP),
                new RateLimitRule(
                        "email-verification-send",
                        pp.matcher(HttpMethod.POST, "/api/auth/send-verification"),
                        3, Duration.ofMinutes(1), RateLimitRule.KeyType.IP),
                new RateLimitRule(
                        "email-verification-confirm",
                        pp.matcher(HttpMethod.POST, "/api/auth/verify-email"),
                        10, Duration.ofMinutes(1), RateLimitRule.KeyType.IP),
                new RateLimitRule(
                        "token-refresh",
                        pp.matcher(HttpMethod.POST, "/api/auth/refresh"),
                        30, Duration.ofMinutes(1), RateLimitRule.KeyType.IP),
                new RateLimitRule(
                        "inquiry-submit",
                        pp.matcher(HttpMethod.POST, "/api/inquiries"),
                        5, Duration.ofMinutes(1), RateLimitRule.KeyType.IP),
                new RateLimitRule(
                        "guest-tier-list-draft-create",
                        pp.matcher(HttpMethod.POST, "/api/tier-list-drafts"),
                        10, Duration.ofMinutes(1), RateLimitRule.KeyType.IP),
                new RateLimitRule(
                        "guest-tier-list-draft-update",
                        pp.matcher(HttpMethod.PUT, "/api/tier-list-drafts"),
                        20, Duration.ofMinutes(1), RateLimitRule.KeyType.IP),
                new RateLimitRule(
                        "guest-tier-list-image-upload",
                        pp.matcher(HttpMethod.POST, "/api/tier-list-drafts/images"),
                        10, Duration.ofMinutes(1), RateLimitRule.KeyType.IP),
                new RateLimitRule(
                        "post-write",
                        pp.matcher(HttpMethod.POST, "/api/posts"),
                        20, Duration.ofMinutes(1), RateLimitRule.KeyType.IP_OR_USER),
                new RateLimitRule(
                        "comment-write",
                        pp.matcher(HttpMethod.POST, "/api/posts/*/comments"),
                        30, Duration.ofMinutes(1), RateLimitRule.KeyType.IP_OR_USER),
                new RateLimitRule(
                        "message-send",
                        pp.matcher(HttpMethod.POST, "/api/messages"),
                        20, Duration.ofMinutes(1), RateLimitRule.KeyType.IP_OR_USER),
                new RateLimitRule(
                        "spirit-search",
                        pp.matcher(HttpMethod.GET, "/api/spirits"),
                        120, Duration.ofMinutes(1), RateLimitRule.KeyType.IP_OR_USER),
                new RateLimitRule(
                        "spirit-autocomplete",
                        pp.matcher(HttpMethod.GET, "/api/spirits/autocomplete"),
                        60, Duration.ofMinutes(1), RateLimitRule.KeyType.IP_OR_USER),
                new RateLimitRule(
                        "default-api",
                        pp.matcher("/api/**"),
                        300, Duration.ofMinutes(1), RateLimitRule.KeyType.IP_OR_USER)
        );
    }
}
