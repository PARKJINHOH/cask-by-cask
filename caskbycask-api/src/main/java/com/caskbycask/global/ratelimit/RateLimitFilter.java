package com.caskbycask.global.ratelimit;

import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.exception.ErrorCode;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.function.Supplier;

/**
 * Rate Limit 필터.
 *
 * 적용 시점: SecurityConfig 에서 JwtAuthenticationFilter 뒤에 등록되어
 * 인증 컨텍스트가 있을 때는 userId, 없을 때는 client IP 를 키로 사용.
 *
 * 매칭되는 룰이 없으면 통과. /uploads/**, /actuator/** 같은 비-API 경로는 룰이 없어 통과.
 *
 * 차단 시: HTTP 429 + ApiResponse 형식 JSON + Retry-After 헤더.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "rate-limit.enabled", havingValue = "true", matchIfMissing = true)
public class RateLimitFilter extends OncePerRequestFilter {

    private final ProxyManager<byte[]> proxyManager;
    private final List<RateLimitRule> rateLimitRules;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        if (isDirectLoopbackRead(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        RateLimitRule rule = findMatchingRule(request);
        if (rule == null) {
            filterChain.doFilter(request, response);
            return;
        }

        String identifier = resolveIdentifier(request, rule);
        if (identifier == null) {
            // USER 전용 룰인데 비인증 요청 → rate limit 미적용, 일반 인증 체크에 위임
            filterChain.doFilter(request, response);
            return;
        }

        byte[] bucketKey = ("rl:" + rule.name() + ":" + identifier).getBytes(StandardCharsets.UTF_8);
        Supplier<BucketConfiguration> configSupplier = () -> BucketConfiguration.builder()
                .addLimit(Bandwidth.builder()
                        .capacity(rule.capacity())
                        .refillGreedy(rule.capacity(), rule.refillPeriod())
                        .build())
                .build();

        Bucket bucket = proxyManager.builder().build(bucketKey, configSupplier);
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        if (probe.isConsumed()) {
            response.setHeader("X-RateLimit-Remaining", String.valueOf(probe.getRemainingTokens()));
            filterChain.doFilter(request, response);
            return;
        }

        long waitSeconds = Math.max(1, probe.getNanosToWaitForRefill() / 1_000_000_000L);
        log.warn("Rate limit exceeded — rule={}, key={}, retryAfter={}s", rule.name(), identifier, waitSeconds);

        // Jakarta Servlet API 는 SC_TOO_MANY_REQUESTS 상수가 없음 (RFC 6585 미반영) → Spring HttpStatus 사용
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setHeader("Retry-After", String.valueOf(waitSeconds));
        response.setHeader("X-RateLimit-Remaining", "0");
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(String.format(
                "{\"success\":false,\"data\":null,\"code\":\"%s\",\"message\":\"%s\"}",
                ErrorCode.RATE_LIMIT_EXCEEDED.getCode(),
                ErrorCode.RATE_LIMIT_EXCEEDED.getMessage()
        ));
    }

    private RateLimitRule findMatchingRule(HttpServletRequest request) {
        for (RateLimitRule rule : rateLimitRules) {
            if (rule.matcher().matches(request)) {
                return rule;
            }
        }
        return null;
    }

    /**
     * 룰 키 산출:
     * - IP: 항상 IP
     * - USER: 인증된 userId 있을 때만, 아니면 null (필터 skip)
     * - IP_OR_USER: 인증되면 userId, 아니면 IP
     */
    private String resolveIdentifier(HttpServletRequest request, RateLimitRule rule) {
        Long userId = extractUserId();
        return switch (rule.keyType()) {
            case IP -> "ip:" + extractIp(request);
            case USER -> userId != null ? "u:" + userId : null;
            case IP_OR_USER -> userId != null ? "u:" + userId : "ip:" + extractIp(request);
        };
    }

    private Long extractUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof CustomUserDetails ud) {
            return ud.getUserId();
        }
        return null;
    }

    /**
     * 클라이언트 IP 추출.
     *
     * [보안] 신뢰 헤더 우선순위 — Nginx 가 직접 주입하는 헤더만 신뢰한다.
     *   1) CF-Connecting-IP : Nginx 가 $remote_addr(=real_ip 모듈이 복원한 실제 IP)로 설정. 모든 /api 경로에 주입됨.
     *   2) X-Real-IP        : Nginx /api/ 블록이 $remote_addr 로 설정.
     *   3) remoteAddr       : 프록시 없는 로컬 개발 환경 fallback.
     *
     * ※ X-Forwarded-For 는 사용하지 않는다.
     *   Nginx 가 proxy_add_x_forwarded_for 로 클라이언트가 보낸 값을 그대로 앞에 이어붙이므로,
     *   "첫 IP" 는 클라이언트가 위조할 수 있다. 이를 rate-limit 키로 쓰면 IP 기반 버킷이 우회된다.
     */
    private String extractIp(HttpServletRequest request) {
        String cfIp = request.getHeader("CF-Connecting-IP");
        if (StringUtils.hasText(cfIp)) {
            return cfIp.trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (StringUtils.hasText(realIp)) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }

    /**
     * Next.js SSR 이 같은 서버의 localhost API 를 직접 조회하는 GET/HEAD 는 외부 사용자의
     * IP 버킷과 분리한다. 외부 요청은 Nginx 가 아래 프록시 헤더 중 하나 이상을 항상 넣으므로
     * loopback 주소만으로 우회하지 않고, 프록시 헤더가 모두 없는 직접 호출만 허용한다.
     */
    static boolean isDirectLoopbackRead(HttpServletRequest request) {
        String method = request.getMethod();
        if (!HttpMethod.GET.matches(method) && !HttpMethod.HEAD.matches(method)) {
            return false;
        }
        if (StringUtils.hasText(request.getHeader("CF-Connecting-IP"))
                || StringUtils.hasText(request.getHeader("X-Real-IP"))
                || StringUtils.hasText(request.getHeader("X-Forwarded-For"))) {
            return false;
        }

        String remoteAddr = request.getRemoteAddr();
        return "127.0.0.1".equals(remoteAddr)
                || "::1".equals(remoteAddr)
                || "0:0:0:0:0:0:0:1".equals(remoteAddr);
    }
}
