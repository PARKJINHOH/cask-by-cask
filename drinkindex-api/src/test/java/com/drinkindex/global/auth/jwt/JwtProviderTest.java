package com.drinkindex.global.auth.jwt;

import com.drinkindex.domain.user.entity.enums.Role;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

class JwtProviderTest {

    // 32자 이상 (256bit+) 필수
    private static final String SECRET = "drinkindex-test-secret-key-must-be-at-least-32-chars!!";
    private static final long ACCESS_EXPIRY  = 3_600_000L;   // 1h
    private static final long REFRESH_EXPIRY = 604_800_000L; // 7d

    private JwtProvider jwtProvider;

    @BeforeEach
    void setUp() {
        jwtProvider = new JwtProvider(SECRET, ACCESS_EXPIRY, REFRESH_EXPIRY);
    }

    @Test
    @DisplayName("Access Token 생성 후 userId·role 추출 성공")
    void generateAndExtractAccessToken() {
        String token = jwtProvider.generateAccessToken(1L, Role.MEMBER);

        assertThat(token).isNotBlank();
        assertThat(jwtProvider.extractUserId(token)).isEqualTo(1L);
        assertThat(jwtProvider.extractRole(token)).isEqualTo(Role.MEMBER);
    }

    @Test
    @DisplayName("Refresh Token 생성 후 userId·role 추출 성공")
    void generateAndExtractRefreshToken() {
        String token = jwtProvider.generateRefreshToken(2L, Role.ADMIN);

        assertThat(jwtProvider.extractUserId(token)).isEqualTo(2L);
        assertThat(jwtProvider.extractRole(token)).isEqualTo(Role.ADMIN);
    }

    @Test
    @DisplayName("유효한 토큰은 isTokenValid = true")
    void validTokenReturnsTrue() {
        String token = jwtProvider.generateAccessToken(1L, Role.MEMBER);

        assertThat(jwtProvider.isTokenValid(token)).isTrue();
    }

    @Test
    @DisplayName("잘못된 형식의 토큰은 isTokenValid = false")
    void malformedTokenReturnsFalse() {
        assertThat(jwtProvider.isTokenValid("not.a.jwt")).isFalse();
    }

    @Test
    @DisplayName("만료된 토큰 파싱 시 EXPIRED_TOKEN 예외 발생")
    void expiredTokenThrowsExpiredTokenError() throws InterruptedException {
        JwtProvider shortLived = new JwtProvider(SECRET, 1L, REFRESH_EXPIRY); // 1ms 만료
        String token = shortLived.generateAccessToken(1L, Role.MEMBER);

        Thread.sleep(10);

        assertThatThrownBy(() -> shortLived.extractUserId(token))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode()).isEqualTo(ErrorCode.EXPIRED_TOKEN)
                );
    }

    @Test
    @DisplayName("위조된 토큰 파싱 시 INVALID_TOKEN 예외 발생")
    void tamperedTokenThrowsInvalidTokenError() {
        String token = jwtProvider.generateAccessToken(1L, Role.MEMBER);
        String tampered = token.substring(0, token.lastIndexOf('.') + 1) + "invalidsignature";

        assertThatThrownBy(() -> jwtProvider.extractUserId(tampered))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode()).isEqualTo(ErrorCode.INVALID_TOKEN)
                );
    }

    @Test
    @DisplayName("getRefreshTokenExpiry 는 설정값 반환")
    void getRefreshTokenExpiry() {
        assertThat(jwtProvider.getRefreshTokenExpiry()).isEqualTo(REFRESH_EXPIRY);
    }
}
