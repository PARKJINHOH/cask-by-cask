package com.caskbycask.global.ratelimit;

import org.springframework.security.web.util.matcher.RequestMatcher;

import java.time.Duration;

/**
 * Rate Limit 정책 정의.
 * - name: 메트릭/로그 식별용
 * - matcher: 경로/메서드 매칭 (Spring Security {@link RequestMatcher})
 * - capacity: 버킷 최대 토큰 수
 * - refillPeriod: 토큰 전량 충전 주기 (Greedy refill)
 * - keyType: 키 산출 방식 (IP / USER / IP_OR_USER)
 */
public record RateLimitRule(
        String name,
        RequestMatcher matcher,
        long capacity,
        Duration refillPeriod,
        KeyType keyType
) {
    public enum KeyType {
        /** 항상 client IP 기반 (비인증 엔드포인트용). */
        IP,
        /** 인증 사용자 ID 기반. 비인증 사용자는 매칭 제외. */
        USER,
        /** 인증되면 userId, 아니면 IP. 가장 일반적. */
        IP_OR_USER
    }
}
