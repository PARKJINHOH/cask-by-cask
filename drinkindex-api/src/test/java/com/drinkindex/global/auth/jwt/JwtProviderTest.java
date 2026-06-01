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
    private static final String PRIMARY_SECRET  = "drinkindex-test-secret-key-must-be-at-least-32-chars!!";
    private static final String PREVIOUS_SECRET = "drinkindex-PREVIOUS-secret-key-also-at-least-32-chars!";
    private static final long ACCESS_EXPIRY  = 3_600_000L;   // 1h
    private static final long REFRESH_EXPIRY = 604_800_000L; // 7d

    private JwtProvider jwtProvider;

    @BeforeEach
    void setUp() {
        // 기본 시나리오: previous 키 없음
        jwtProvider = new JwtProvider(PRIMARY_SECRET, "", ACCESS_EXPIRY, REFRESH_EXPIRY);
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
        JwtProvider shortLived = new JwtProvider(PRIMARY_SECRET, "", 1L, REFRESH_EXPIRY); // 1ms 만료
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
    @DisplayName("토큰 용도 구분 — Access Token 은 isAccessToken=true, isRefreshToken=false")
    void accessTokenTypeClaim() {
        String token = jwtProvider.generateAccessToken(1L, Role.MEMBER);

        assertThat(jwtProvider.isAccessToken(token)).isTrue();
        assertThat(jwtProvider.isRefreshToken(token)).isFalse();
    }

    @Test
    @DisplayName("토큰 용도 구분 — Refresh Token 은 isRefreshToken=true, isAccessToken=false")
    void refreshTokenTypeClaim() {
        String token = jwtProvider.generateRefreshToken(1L, Role.MEMBER);

        assertThat(jwtProvider.isRefreshToken(token)).isTrue();
        assertThat(jwtProvider.isAccessToken(token)).isFalse();
    }

    @Test
    @DisplayName("getRefreshTokenExpiry 는 설정값 반환")
    void getRefreshTokenExpiry() {
        assertThat(jwtProvider.getRefreshTokenExpiry()).isEqualTo(REFRESH_EXPIRY);
    }

    // ───── 키 회전 시나리오 ─────

    @Test
    @DisplayName("키 회전: PREVIOUS 키로 발급된 토큰을 PRIMARY+PREVIOUS 환경에서 검증 성공")
    void verifyTokenIssuedWithPreviousKey() {
        // 1단계: 회전 전 — PREVIOUS_SECRET 로만 운영
        JwtProvider beforeRotation = new JwtProvider(PREVIOUS_SECRET, "", ACCESS_EXPIRY, REFRESH_EXPIRY);
        String legacyToken = beforeRotation.generateAccessToken(7L, Role.MEMBER);

        // 2단계: 회전 후 — PRIMARY 가 신규 키, PREVIOUS 가 기존 키
        JwtProvider afterRotation = new JwtProvider(PRIMARY_SECRET, PREVIOUS_SECRET, ACCESS_EXPIRY, REFRESH_EXPIRY);

        assertThat(afterRotation.isTokenValid(legacyToken)).isTrue();
        assertThat(afterRotation.extractUserId(legacyToken)).isEqualTo(7L);
        assertThat(afterRotation.extractRole(legacyToken)).isEqualTo(Role.MEMBER);
    }

    @Test
    @DisplayName("키 회전: PRIMARY 키로 새로 발급된 토큰은 우선 PRIMARY 로 검증 성공")
    void verifyTokenIssuedWithPrimaryKey() {
        JwtProvider afterRotation = new JwtProvider(PRIMARY_SECRET, PREVIOUS_SECRET, ACCESS_EXPIRY, REFRESH_EXPIRY);
        String newToken = afterRotation.generateAccessToken(8L, Role.MEMBER);

        assertThat(afterRotation.isTokenValid(newToken)).isTrue();
        assertThat(afterRotation.extractUserId(newToken)).isEqualTo(8L);
    }

    @Test
    @DisplayName("키 회전 종료 후 — PREVIOUS 제거 시 옛 키 토큰은 INVALID_TOKEN")
    void afterRotationCompletePreviousTokenInvalid() {
        // 회전 중 PREVIOUS 키로 발급된 토큰
        JwtProvider midRotation = new JwtProvider(PRIMARY_SECRET, PREVIOUS_SECRET, ACCESS_EXPIRY, REFRESH_EXPIRY);
        // 실제로는 회전 전 (PREVIOUS_SECRET 가 당시의 PRIMARY) 발급
        JwtProvider beforeRotation = new JwtProvider(PREVIOUS_SECRET, "", ACCESS_EXPIRY, REFRESH_EXPIRY);
        String legacyToken = beforeRotation.generateAccessToken(9L, Role.MEMBER);

        // 회전 완료 — PREVIOUS 제거
        JwtProvider afterCleanup = new JwtProvider(PRIMARY_SECRET, "", ACCESS_EXPIRY, REFRESH_EXPIRY);

        assertThat(midRotation.isTokenValid(legacyToken)).isTrue();
        assertThat(afterCleanup.isTokenValid(legacyToken)).isFalse();

        assertThatThrownBy(() -> afterCleanup.extractUserId(legacyToken))
                .isInstanceOf(CustomException.class)
                .satisfies(e ->
                        assertThat(((CustomException) e).getErrorCode()).isEqualTo(ErrorCode.INVALID_TOKEN)
                );
    }
}
