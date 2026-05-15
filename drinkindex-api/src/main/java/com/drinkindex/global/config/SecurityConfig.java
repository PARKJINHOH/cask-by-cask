package com.drinkindex.global.config;

import com.drinkindex.global.auth.jwt.JwtAuthenticationFilter;
import com.drinkindex.global.auth.jwt.JwtProvider;
import com.drinkindex.global.auth.security.CustomUserDetailsService;
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

    @Value("${cors.allowed-origins}")
    private String allowedOriginsRaw;

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
        return http
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
                        .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/notices/images/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/popups/images/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/spirits/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/notices/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/popups/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/banners/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/signup").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/refresh").permitAll()
                        .requestMatchers("/api/admin/spirits/**").hasAnyRole("ADMIN", "DISTILLERY")
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
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
                .addFilterBefore(
                        new JwtAuthenticationFilter(jwtProvider, customUserDetailsService),
                        UsernamePasswordAuthenticationFilter.class
                )
                .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
