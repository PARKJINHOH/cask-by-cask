package com.caskbycask.domain.user.service;

import com.caskbycask.domain.nicknamebadword.service.NicknameBadWordValidator;
import com.caskbycask.domain.score.dto.AttendanceResult;
import com.caskbycask.domain.score.service.AttendanceService;
import com.caskbycask.domain.user.dto.*;
import com.caskbycask.domain.legal.repository.LegalDocumentRepository;
import com.caskbycask.global.email.EmailVerificationService;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.entity.enums.Role;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.auth.jwt.JwtProvider;
import com.caskbycask.global.auth.jwt.RefreshTokenRepository;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
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
    @Mock private LegalDocumentRepository legalDocumentRepository;
    @Mock private LoginAttemptService loginAttemptService;

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

        AuthLoginResult result = authService.login(request);

        assertThat(result.body().accessToken()).isEqualTo("access_token");
        // refresh 토큰은 바디가 아닌 캐리어(→ httpOnly 쿠키)로 전달
        assertThat(result.refreshToken()).isEqualTo("refresh_token");
        assertThat(result.body().tokenType()).isEqualTo("Bearer");
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
        given(jwtProvider.extractUserId("old_refresh")).willReturn(1L);
        given(jwtProvider.extractRole("old_refresh")).willReturn(Role.MEMBER);
        given(jwtProvider.isRefreshToken("old_refresh")).willReturn(true);
        given(refreshTokenRepository.findByUserId(1L)).willReturn(Optional.of("old_refresh"));
        given(userRepository.findById(1L)).willReturn(Optional.of(
                User.builder().email("test@example.com").password("hashed").nickname("tester").role(Role.MEMBER).build()));
        given(jwtProvider.generateAccessToken(1L, Role.MEMBER)).willReturn("new_access");
        given(jwtProvider.generateRefreshToken(1L, Role.MEMBER)).willReturn("new_refresh");
        given(jwtProvider.getRefreshTokenExpiry()).willReturn(604_800_000L);

        AuthRefreshResult result = authService.refresh("old_refresh");

        assertThat(result.accessToken()).isEqualTo("new_access");
        assertThat(result.refreshToken()).isEqualTo("new_refresh");
        then(refreshTokenRepository).should().deleteByUserId(1L);
        then(refreshTokenRepository).should().save(eq(1L), eq("new_refresh"), any());
    }

    @Test
    @DisplayName("Refresh Token 갱신 실패 — Redis에 토큰 없음")
    void refresh_fail_tokenNotFound() {
        given(jwtProvider.extractUserId("orphan_refresh")).willReturn(1L);
        given(jwtProvider.extractRole("orphan_refresh")).willReturn(Role.MEMBER);
        given(jwtProvider.isRefreshToken("orphan_refresh")).willReturn(true);
        given(refreshTokenRepository.findByUserId(1L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refresh("orphan_refresh"))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(ErrorCode.REFRESH_TOKEN_NOT_FOUND));
    }

    @Test
    @DisplayName("Refresh Token 갱신 실패 — Redis 토큰과 불일치")
    void refresh_fail_tokenMismatch() {
        given(jwtProvider.extractUserId("incoming_token")).willReturn(1L);
        given(jwtProvider.extractRole("incoming_token")).willReturn(Role.MEMBER);
        given(jwtProvider.isRefreshToken("incoming_token")).willReturn(true);
        given(refreshTokenRepository.findByUserId(1L)).willReturn(Optional.of("different_token"));

        assertThatThrownBy(() -> authService.refresh("incoming_token"))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(ErrorCode.INVALID_TOKEN));
    }

    @Test
    @DisplayName("Refresh Token 갱신 실패 — Access Token 을 재발급에 사용")
    void refresh_fail_accessTokenUsed() {
        given(jwtProvider.extractUserId("access_token")).willReturn(1L);
        given(jwtProvider.extractRole("access_token")).willReturn(Role.MEMBER);
        given(jwtProvider.isRefreshToken("access_token")).willReturn(false);

        assertThatThrownBy(() -> authService.refresh("access_token"))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(ErrorCode.INVALID_TOKEN));
        then(refreshTokenRepository).should(never()).save(any(), any(), any());
    }

    @Test
    @DisplayName("Refresh Token 갱신 실패 — 계정 삭제(탈퇴)됨, 남은 토큰 정리")
    void refresh_fail_userDeleted() {
        given(jwtProvider.extractUserId("valid_refresh")).willReturn(1L);
        given(jwtProvider.extractRole("valid_refresh")).willReturn(Role.MEMBER);
        given(jwtProvider.isRefreshToken("valid_refresh")).willReturn(true);
        given(refreshTokenRepository.findByUserId(1L)).willReturn(Optional.of("valid_refresh"));
        given(userRepository.findById(1L)).willReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refresh("valid_refresh"))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(ErrorCode.USER_NOT_FOUND));
        then(refreshTokenRepository).should().deleteByUserId(1L);
        then(refreshTokenRepository).should(never()).save(any(), any(), any());
    }

    @Test
    @DisplayName("Refresh Token 갱신 실패 — 비활성화된 계정, 남은 토큰 정리")
    void refresh_fail_userInactive() {
        User inactive = User.builder().email("test@example.com").password("hashed").nickname("tester").role(Role.MEMBER).build();
        inactive.deactivate();

        given(jwtProvider.extractUserId("valid_refresh")).willReturn(1L);
        given(jwtProvider.extractRole("valid_refresh")).willReturn(Role.MEMBER);
        given(jwtProvider.isRefreshToken("valid_refresh")).willReturn(true);
        given(refreshTokenRepository.findByUserId(1L)).willReturn(Optional.of("valid_refresh"));
        given(userRepository.findById(1L)).willReturn(Optional.of(inactive));

        assertThatThrownBy(() -> authService.refresh("valid_refresh"))
                .isInstanceOf(CustomException.class)
                .satisfies(e -> assertThat(((CustomException) e).getErrorCode())
                        .isEqualTo(ErrorCode.ACCOUNT_INACTIVE));
        then(refreshTokenRepository).should().deleteByUserId(1L);
        then(refreshTokenRepository).should(never()).save(any(), any(), any());
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
