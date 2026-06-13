package com.caskbycask.global.auth.internal;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * 내부 전용 API({@code /api/internal/**}) 인증 필터.
 * {@code X-Internal-Key} 헤더가 설정값(caskbycask.internal-api-key)과 일치해야 통과, 불일치 시 401.
 * JWT 체인 앞단에 배치되어, 일치하지 않으면 컨트롤러까지 도달하지 않는다.
 */
@Slf4j
public class InternalKeyAuthFilter extends OncePerRequestFilter {

    private static final String HEADER = "X-Internal-Key";
    private static final String PROTECTED_PREFIX = "/api/internal/";

    private final String internalKey;

    public InternalKeyAuthFilter(String internalKey) {
        this.internalKey = internalKey;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        if (request.getRequestURI().startsWith(PROTECTED_PREFIX)) {
            if (!isValid(request.getHeader(HEADER))) {
                log.warn("내부 API 인증 실패 — {} (key {})", request.getRequestURI(),
                        (internalKey == null || internalKey.isBlank()) ? "미설정" : "불일치");
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write(
                        "{\"success\":false,\"data\":null,\"code\":\"AUTH_001\",\"message\":\"인증이 필요합니다.\"}"
                );
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    /** 타이밍 공격 방어를 위해 상수 시간 비교(MessageDigest.isEqual). */
    private boolean isValid(String provided) {
        if (internalKey == null || internalKey.isBlank() || provided == null) {
            return false;
        }
        return MessageDigest.isEqual(
                internalKey.getBytes(StandardCharsets.UTF_8),
                provided.getBytes(StandardCharsets.UTF_8)
        );
    }
}
