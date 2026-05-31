package com.drinkindex.domain.user.service;

import com.drinkindex.domain.nicknamebadword.service.NicknameBadWordValidator;
import com.drinkindex.domain.score.dto.AttendanceResult;
import com.drinkindex.domain.score.service.AttendanceService;
import com.drinkindex.domain.user.dto.*;
import com.drinkindex.global.email.EmailVerificationService;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.entity.enums.Role;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.auth.jwt.JwtProvider;
import com.drinkindex.global.auth.jwt.RefreshTokenRepository;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @InjectMocks
    private AuthService authService;

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtProvider jwtProvider;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private AttendanceService attendanceService;
    @Mock private EmailVerificationService emailVerificationService;
    @Mock private NicknameBadWordValidator nicknameBadWordValidator;

    // ───────────────────── signup ─────────────────────

    @Test
    @DisplayName("회원가입 성공")
    void signup_success() {
        SignupRequest request = new SignupRequest("new@example.com", "password123", "tester", true, true, false);
        User savedUser = User.builder()
                .email(request.email()).password("hashed").nickname(request.nickname()).role(Role.MEMBER)
                .build();

        given(userRepository.existsByEmail(request.email())).willReturn(false);
        given(passwordEncoder.encode(request.password())).willReturn("hashed");
        given(userRepository.save(any(User.class))).willReturn(savedUser);

        UserResponse response = authService.signup(request);

        assertThat(response.email()).isEqualTo(request.email());
        assertThat(response.nickname()).isEqualTo(request.nickname());
        assertThat(response.role()).isEqualTo(Role.MEMBER);
        then(userRepository).should().save(any(User.class));
    }

    @Test
    @DisplayName("회원가입 실패 — 이메일 중복")
    void signup_fail_duplicateEmail() {
        SignupRequest request = new SignupRequest("dup@example.com", "password123", "tester", true, true, false);
        given(userRepository.existsByEmail(request.email())).willReturn(true);

        assertThatThrownBy(() -> authService.signup(request))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(ErrorCode.DUPLICATE_EMAIL));

        then(userRepository).should(never()).save(any());
    }

    // ───────────────────── login ─────────────────────

    @Test
    @DisplayName("로그인 성공")
    void login_success() {
        LoginRequest request = new LoginRequest("test@example.com", "password123");
        User user = User.builder()
                .email(request.email()).password("hashed").nickname("tester").role(Role.MEMBER)
                .build();

        given(userRepository.findByEmail(request.email())).willReturn(Optional.of(user));
        given(passwordEncoder.matches(request.password(), "hashed")).willReturn(true);
        given(jwtProvider.generateAccessToken(any(), eq(Role.MEMBER))).willReturn("access_token");
        given(jwtProvider.generateRefreshToken(any(), eq(Role.MEMBER))).willReturn("refresh_token");
        given(jwtProvider.getRefreshTokenExpiry()).willReturn(604_800_000L);
        given(attendanceService.checkAttendance(any())).willReturn(AttendanceResult.ofAlreadyChecked());

        LoginResponse response = authService.login(request);

        assertThat(response.accessToken()).isEqualTo("access_token");
        assertThat(response.refreshToken()).isEqualTo("refresh_token");
        assertThat(response.tokenType()).isEqualTo("Bearer");
        then(refreshTokenRepository).should().save(any(), eq("refresh_token"), any());
    }

    @Test
    @DisplayName("로그인 실패 — 존재하지 않는 이메일")
    void login_fail_userNotFound() {
        LoginRequest request = new LoginRequest("nouser@example.com", "password123");
        given(userRepository.findByEmail(request.email())).willReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(ErrorCode.USER_NOT_FOUND));
    }

    @Test
    @DisplayName("로그인 실패 — 비밀번호 불일치")
    void login_fail_wrongPassword() {
        LoginRequest request = new LoginRequest("test@example.com", "wrongpw");
        User user = User.builder()
                .email(request.email()).password("hashed").nickname("tester").role(Role.MEMBER)
                .build();

        given(userRepository.findByEmail(request.email())).willReturn(Optional.of(user));
        given(passwordEncoder.matches(request.password(), "hashed")).willReturn(false);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(ErrorCode.INVALID_PASSWORD));
    }

    // ───────────────────── refresh ─────────────────────

    @Test
    @DisplayName("Refresh Token 갱신 성공 — Rotation 적용")
    void refresh_success() {
        RefreshRequest request = new RefreshRequest("old_refresh");

        given(jwtProvider.extractUserId("old_refresh")).willReturn(1L);
        given(jwtProvider.extractRole("old_refresh")).willReturn(Role.MEMBER);
        given(refreshTokenRepository.findByUserId(1L)).willReturn(Optional.of("old_refresh"));
        given(jwtProvider.generateAccessToken(1L, Role.MEMBER)).willReturn("new_access");
        given(jwtProvider.generateRefreshToken(1L, Role.MEMBER)).willReturn("new_refresh");
        given(jwtProvider.getRefreshTokenExpiry()).willReturn(604_800_000L);

        TokenResponse response = authService.refresh(request);

        assertThat(response.accessToken()).isEqualTo("new_access");
        assertThat(response.refreshToken()).isEqualTo("new_refresh");
        then(refreshTokenRepository).should().deleteByUserId(1L);
        then(refreshTokenRepository).should().save(eq(1L), eq("new_refresh"), any());
    }

    @Test
    @DisplayName("Refresh Token 갱신 실패 — Redis에 토큰 없음")
    void refresh_fail_tokenNotFound() {
        RefreshRequest request = new RefreshRequest("orphan_refresh");

        given(jwtProvider.extractUserId("orphan_refresh")).willReturn(1L);
        given(jwtProvider.extractRole("orphan_refresh")).willReturn(Role.MEMBER);
        given(refreshTokenRepository.findByUserId(1L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refresh(request))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(ErrorCode.REFRESH_TOKEN_NOT_FOUND));
    }

    @Test
    @DisplayName("Refresh Token 갱신 실패 — Redis 토큰과 불일치")
    void refresh_fail_tokenMismatch() {
        RefreshRequest request = new RefreshRequest("incoming_token");

        given(jwtProvider.extractUserId("incoming_token")).willReturn(1L);
        given(jwtProvider.extractRole("incoming_token")).willReturn(Role.MEMBER);
        given(refreshTokenRepository.findByUserId(1L)).willReturn(Optional.of("different_token"));

        assertThatThrownBy(() -> authService.refresh(request))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(ErrorCode.INVALID_TOKEN));
    }

    // ───────────────────── logout ─────────────────────

    @Test
    @DisplayName("로그아웃 성공 — Redis에서 Refresh Token 삭제")
    void logout_success() {
        CustomUserDetails userDetails = new CustomUserDetails(42L, "test@example.com", "pw", Role.MEMBER, true);

        authService.logout(userDetails);

        then(refreshTokenRepository).should().deleteByUserId(42L);
    }
}
