package com.caskbycask.global.auth.jwt;

import com.caskbycask.global.auth.security.CustomUserDetailsService;
import com.caskbycask.global.exception.CustomException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtProvider jwtProvider;
    private final CustomUserDetailsService customUserDetailsService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String token = resolveToken(request);

        if (StringUtils.hasText(token) && jwtProvider.isTokenValid(token)) {
            try {
                // [보안] Refresh Token 을 Access Token 처럼 사용하는 것을 차단.
                // (Refresh Token 은 7일 만료 → 유출 시 장기 인증 우회에 악용될 수 있음)
                if (!jwtProvider.isAccessToken(token)) {
                    log.warn("JWT 인증 거부 — Access Token 이 아님 (Refresh Token 오용 가능성)");
                    SecurityContextHolder.clearContext();
                    sendUnauthorized(response, "AUTH_001", "인증이 필요합니다.");
                    return;
                }

                Long userId = jwtProvider.extractUserId(token);
                UserDetails userDetails = customUserDetailsService.loadUserById(userId);

                if (!userDetails.isEnabled()) {
                    sendUnauthorized(response, "AUTH_001", "비활성화된 계정입니다.");
                    return;
                }

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);

            } catch (CustomException e) {
                log.warn("JWT 인증 실패 — 계정 조회 불가: {}", e.getMessage());
                SecurityContextHolder.clearContext();
                sendUnauthorized(response, "AUTH_001", "인증이 필요합니다.");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader(AUTHORIZATION_HEADER);
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith(BEARER_PREFIX)) {
            return bearerToken.substring(BEARER_PREFIX.length());
        }
        return null;
    }

    private void sendUnauthorized(HttpServletResponse response, String code, String message) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(
                String.format("{\"success\":false,\"data\":null,\"code\":\"%s\",\"message\":\"%s\"}", code, message)
        );
    }
}
