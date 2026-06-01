package com.drinkindex.global.auth.jwt;

import com.drinkindex.domain.user.entity.enums.Role;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JWT 발급/검증.
 *
 * 키 회전 전략 — Primary + Previous 이중 키:
 *   - 발급: 항상 Primary 키 사용 (jwt.secret)
 *   - 검증: Primary 우선, INVALID_TOKEN 시 Previous(jwt.secret-previous) 로 재시도
 *
 * 회전 절차:
 *   1. 새 키를 JWT_SECRET 로 배포, 기존 키를 JWT_SECRET_PREVIOUS 로 이전
 *   2. Refresh Token TTL (7일) 동안 두 키 병행 검증 → 무중단 회전
 *   3. 7일 경과 후 JWT_SECRET_PREVIOUS 제거 (또는 비워둠)
 */
@Slf4j
@Component
public class JwtProvider {

    // [보안] 토큰 용도 구분 클레임 — Refresh Token 을 Access Token 으로 오용하는 것을 차단.
    private static final String CLAIM_TYPE = "type";
    private static final String TYPE_ACCESS = "access";
    private static final String TYPE_REFRESH = "refresh";

    private final SecretKey primaryKey;
    private final SecretKey previousKey;   // nullable — 회전 중에만 설정
    private final long accessTokenExpiry;
    private final long refreshTokenExpiry;

    public JwtProvider(
            @Value("${jwt.secret}") String primarySecret,
            @Value("${jwt.secret-previous:}") String previousSecret,
            @Value("${jwt.access-token-expiry}") long accessTokenExpiry,
            @Value("${jwt.refresh-token-expiry}") long refreshTokenExpiry
    ) {
        this.primaryKey = Keys.hmacShaKeyFor(primarySecret.getBytes(StandardCharsets.UTF_8));
        this.previousKey = (previousSecret != null && !previousSecret.isBlank())
                ? Keys.hmacShaKeyFor(previousSecret.getBytes(StandardCharsets.UTF_8))
                : null;
        this.accessTokenExpiry = accessTokenExpiry;
        this.refreshTokenExpiry = refreshTokenExpiry;

        if (this.previousKey != null) {
            log.info("JWT key rotation active — previous key configured for verification fallback.");
        }
    }

    public String generateAccessToken(Long userId, Role role) {
        return buildToken(userId, role, accessTokenExpiry, TYPE_ACCESS);
    }

    public String generateRefreshToken(Long userId, Role role) {
        return buildToken(userId, role, refreshTokenExpiry, TYPE_REFRESH);
    }

    /**
     * 토큰이 Access Token 용도인지 확인 (API 인증 필터용).
     * 레거시 토큰(type 클레임 미포함)은 호환을 위해 허용 — Refresh Token TTL(7일) 경과 후 자연 소멸.
     */
    public boolean isAccessToken(String token) {
        String type = parseClaims(token).get(CLAIM_TYPE, String.class);
        return type == null || TYPE_ACCESS.equals(type);
    }

    /**
     * 토큰이 Refresh Token 용도인지 확인 (재발급 엔드포인트용).
     * 레거시 토큰(type 클레임 미포함)은 호환을 위해 허용.
     */
    public boolean isRefreshToken(String token) {
        String type = parseClaims(token).get(CLAIM_TYPE, String.class);
        return type == null || TYPE_REFRESH.equals(type);
    }

    public Long extractUserId(String token) {
        return Long.valueOf(parseClaims(token).getSubject());
    }

    public Role extractRole(String token) {
        return Role.valueOf(parseClaims(token).get("role", String.class));
    }

    public boolean isTokenValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (CustomException e) {
            return false;
        }
    }

    public long getRefreshTokenExpiry() {
        return refreshTokenExpiry;
    }

    private String buildToken(Long userId, Role role, long expiry, String type) {
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("role", role.name())
                .claim(CLAIM_TYPE, type)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expiry))
                .signWith(primaryKey, Jwts.SIG.HS256)
                .compact();
    }

    private Claims parseClaims(String token) {
        try {
            return parseWith(token, primaryKey);
        } catch (ExpiredJwtException e) {
            // 서명은 일치하나 만료 — fallback 불필요.
            throw new CustomException(ErrorCode.EXPIRED_TOKEN);
        } catch (JwtException primaryEx) {
            if (previousKey == null) {
                throw new CustomException(ErrorCode.INVALID_TOKEN);
            }
            // Primary 서명 불일치 — Previous 키로 fallback (회전 진행 중 발급된 토큰 케이스)
            try {
                Claims claims = parseWith(token, previousKey);
                log.debug("Token verified with PREVIOUS key — issued before current rotation.");
                return claims;
            } catch (ExpiredJwtException e) {
                throw new CustomException(ErrorCode.EXPIRED_TOKEN);
            } catch (JwtException previousEx) {
                throw new CustomException(ErrorCode.INVALID_TOKEN);
            }
        }
    }

    private Claims parseWith(String token, SecretKey key) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
