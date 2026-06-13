package com.caskbycask.global.auth.security;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Component;

/**
 * 인증 사용자 캐시 무효화 진입점.
 *
 * JwtAuthenticationFilter 가 매 요청 호출하는 {@code loadUserById} 결과를 캐싱하므로,
 * role / isActive 등 인증 컨텍스트(권한·활성여부)에 영향을 주는 변경이 일어나면
 * 이 메서드를 호출해 해당 사용자의 캐시를 즉시 제거한다.
 *
 * ※ 캐시는 60초 TTL(expireAfterWrite) 이므로, 호출을 누락해도 최대 60초 후 자동 만료된다.
 *   (즉 무효화 호출은 "즉시 반영"을 위한 것이고, 안전망은 TTL 이 담당한다)
 */
@Component
public class AuthUserCache {

    public static final String CACHE_NAME = "authUser";

    @CacheEvict(cacheNames = CACHE_NAME, key = "#userId")
    public void evict(Long userId) {
        // @CacheEvict 부가기능만 필요 — 본문 없음
    }
}
