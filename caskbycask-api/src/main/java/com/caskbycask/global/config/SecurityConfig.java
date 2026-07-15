package com.caskbycask.global.config;

import com.caskbycask.global.auth.internal.InternalKeyAuthFilter;
import com.caskbycask.global.auth.jwt.JwtAuthenticationFilter;
import com.caskbycask.global.auth.jwt.JwtProvider;
import com.caskbycask.global.auth.security.CustomUserDetailsService;
import com.caskbycask.global.ratelimit.RateLimitFilter;
import org.springframework.beans.factory.ObjectProvider;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtProvider jwtProvider;
    private final CustomUserDetailsService customUserDetailsService;
    // rate-limit.enabled=false 일 때를 위해 Optional 주입.
    private final ObjectProvider<RateLimitFilter> rateLimitFilterProvider;

    @Value("${cors.allowed-origins}")
    private String allowedOriginsRaw;

    @Value("${caskbycask.internal-api-key:}")
    private String internalApiKey;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        List<String> origins = List.of(allowedOriginsRaw.split(","));
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(origins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        JwtAuthenticationFilter jwtFilter = new JwtAuthenticationFilter(jwtProvider, customUserDetailsService);
        RateLimitFilter rateLimitFilter = rateLimitFilterProvider.getIfAvailable();

        HttpSecurity chain = http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                // [보안] CSRF: 이 API는 JWT Bearer Token 기반 Stateless 구조 (세션 쿠키 미사용).
                // CSRF 취약점 조건(쿠키 기반 세션) 미해당이므로 명시적 비활성화.
                // ※ 향후 쿠키 기반 인증 추가 시 이 설정 반드시 재검토 필요.
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(headers -> headers
                        // [보안] CSP: 인라인 스크립트·외부 리소스·iframe 삽입 차단.
                        // style-src 'unsafe-inline' 은 TipTap 에디터 렌더링에 필요한 최소 허용값.
                        .contentSecurityPolicy(csp -> csp.policyDirectives(
                                "default-src 'self'; " +
                                "script-src 'self'; " +
                                "style-src 'self' 'unsafe-inline'; " +
                                "img-src 'self' data: blob:; " +
                                "font-src 'self'; " +
                                "frame-ancestors 'none'; " +   // [보안] iframe Clickjacking 차단
                                "object-src 'none'; " +        // [보안] Flash·플러그인 차단
                                "base-uri 'self';"             // [보안] <base> 태그 하이재킹 차단
                        ))
                        // [보안] X-Frame-Options: CSP frame-ancestors와 이중 적용 (구형 브라우저 대응)
                        .frameOptions(frame -> frame.deny())
                        // [보안] MIME 스니핑 방어: 브라우저가 Content-Type 임의 변경 차단
                        .contentTypeOptions(Customizer.withDefaults())
                        // [보안] Referrer-Policy: 외부 사이트로 내부 URL 경로 누출 방지
                        .referrerPolicy(referrer -> referrer
                                .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)
                        )
                )
                // [보안] SQL Injection:
                //   이 프로젝트는 Spring Data JPA + QueryDSL 파라미터 바인딩만 사용.
                //   네이티브 쿼리 및 문자열 직접 연결(concatenation) 사용 금지.
                //   코드 리뷰 시 이 주석을 체크포인트로 활용할 것.
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // 내부 크롤러 수신 API: Spring 인증은 통과시키고 InternalKeyAuthFilter 가 X-Internal-Key 로 게이팅.
                        .requestMatchers("/api/internal/**").permitAll()
                        // Actuator: management.server.port=8081 로 분리 노출, 외부 차단.
                        // 8080 으로 들어온 /actuator/** 요청도 함께 permitAll 처리 (필터 통과만, 실제 노출은 management 포트만).
                        .requestMatchers("/actuator/**").permitAll()
                        // SEO: sitemap.xml — 검색엔진 크롤러용
                        .requestMatchers(HttpMethod.GET, "/sitemap.xml").permitAll()
                        .requestMatchers(HttpMethod.GET, "/spirits/{id:\\d+}", "/spirits/{id:\\d+}-*", "/ko/spirits/{id:\\d+}", "/ko/spirits/{id:\\d+}-*", "/en/spirits/{id:\\d+}", "/en/spirits/{id:\\d+}-*").permitAll()
                        .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/notices/images/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/popups/images/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/profiles/images/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/tier-list/images/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/tier-lists/share/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/taste-tree/images/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/taste-trees/official", "/api/taste-trees/share/**", "/api/taste-trees/results/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/taste-trees/share/*/complete").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/tier-list-drafts/claim").authenticated()
                        .requestMatchers("/api/tier-list-drafts", "/api/tier-list-drafts/images").permitAll()
                        // 가격 제보 이미지 서빙 — <img> 태그 GET 은 JWT 헤더 미포함이므로 공개 (UUID 파일명이 접근 차폐)
                        .requestMatchers(HttpMethod.GET, "/api/price-reports/images/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/seo/**").permitAll()
                        // 내 등록요청 조회는 비공개(로그인 필수) — 아래 광범위한 /api/spirits/** permitAll 보다 먼저 선언
                        .requestMatchers(HttpMethod.GET, "/api/spirits/requests/me", "/api/spirits/requests/me/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/spirits/**").permitAll()
                        // 내 등록요청 조회는 비공개(로그인 필수) — 아래 광범위한 /api/producers/** permitAll 보다 먼저 선언
                        .requestMatchers(HttpMethod.GET, "/api/producers/requests/me", "/api/producers/requests/me/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/producers/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/notices/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/popups/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/banners/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/events/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/byob").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/byob/{id:[0-9]+}").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/posts").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/posts/best").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/posts/{id:[0-9]+}").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/posts/images/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/posts/videos/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/posts/{postId:[0-9]+}/comments").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/emojis").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/emojis/images/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/polls/{pollId:[0-9]+}").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/series").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/series/{id:[0-9]+}").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/post-prefixes").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/ranking").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/price-reports/{id:[0-9]+}").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/price-reports/chart").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/price-reports/chart/**").permitAll()
                        // 커뮤니티 에디터의 내 리뷰 카드 목록은 반드시 로그인 사용자 범위로만 조회
                        .requestMatchers(HttpMethod.GET, "/api/users/me/review-embeds").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/users/*/bottles").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/users/*/reviews").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/score-history/level-config").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/legal/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/faq").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/inquiries").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/feedbacks/images/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/signup").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/refresh").permitAll()
                        .requestMatchers(HttpMethod.GET,  "/api/auth/check-email").permitAll()
                        .requestMatchers(HttpMethod.GET,  "/api/auth/check-nickname").permitAll()
                        .requestMatchers(HttpMethod.GET,  "/api/auth/admin-credentials").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/send-verification").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/verify-email").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/reactivate").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/find-email").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/password-reset/**").permitAll()
                        // 소셜 로그인 공개 엔드포인트 (인가 URL/콜백/신규가입). 연동·해제(/api/users/me/social/**)는 인증 필요.
                        .requestMatchers(HttpMethod.POST, "/api/auth/oauth/**").permitAll()
                        .requestMatchers("/api/admin/logs/**").hasAnyRole("SUPER_ADMIN", "ADMIN")
                        .requestMatchers("/api/admin/spirits/**").hasAnyRole("SUPER_ADMIN", "ADMIN", "PARTNER", "DISTILLERY_STAFF", "IMPORTER")
                        .requestMatchers("/api/admin/producers/**").hasAnyRole("SUPER_ADMIN", "ADMIN", "PARTNER", "DISTILLERY_STAFF", "IMPORTER")
                        .requestMatchers("/api/admin/wineries/**").hasAnyRole("SUPER_ADMIN", "ADMIN", "PARTNER", "DISTILLERY_STAFF", "IMPORTER")
                        .requestMatchers("/api/admin/cognac-houses/**").hasAnyRole("SUPER_ADMIN", "ADMIN", "PARTNER", "DISTILLERY_STAFF", "IMPORTER")
                        .requestMatchers("/api/admin/**").hasAnyRole("SUPER_ADMIN", "ADMIN")
                        // 개선·문의 상태/진척률 변경은 관리자(SUPER_ADMIN·ADMIN)만 — 그 외 엔드포인트는 로그인만 필요
                        .requestMatchers(HttpMethod.PATCH, "/api/feedbacks/*/status").hasAnyRole("SUPER_ADMIN", "ADMIN")
                        .anyRequest().authenticated()
                )
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint((request, response, e) -> {
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.setContentType("application/json;charset=UTF-8");
                            response.getWriter().write(
                                    "{\"success\":false,\"code\":\"AUTH_001\",\"message\":\"인증이 필요합니다.\"}"
                            );
                        })
                        .accessDeniedHandler((request, response, e) -> {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType("application/json;charset=UTF-8");
                            response.getWriter().write(
                                    "{\"success\":false,\"code\":\"AUTH_002\",\"message\":\"접근 권한이 없습니다.\"}"
                            );
                        })
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                // 내부 API 키 검증을 JWT 필터보다 앞단에 배치 — /api/internal/** 은 여기서 가려진다.
                .addFilterBefore(new InternalKeyAuthFilter(internalApiKey), JwtAuthenticationFilter.class);

        // JWT 인증 직후에 RateLimit 적용 — 인증된 요청은 userId, 비인증은 IP 기반.
        if (rateLimitFilter != null) {
            chain.addFilterAfter(rateLimitFilter, JwtAuthenticationFilter.class);
        }

        return chain.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
