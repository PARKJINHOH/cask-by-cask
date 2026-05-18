package com.drinkindex.domain.user.service;

import com.drinkindex.domain.score.service.AttendanceService;
import com.drinkindex.domain.user.dto.*;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.entity.enums.Role;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.auth.jwt.JwtProvider;
import com.drinkindex.global.auth.jwt.RefreshTokenRepository;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.email.EmailVerificationService;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AttendanceService attendanceService;
    private final EmailVerificationService emailVerificationService;

    @Value("${app.email.verification-required:true}")
    private boolean emailVerificationRequired;

    @Transactional
    public UserResponse signup(SignupRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new CustomException(ErrorCode.DUPLICATE_EMAIL);
        }
        if (userRepository.existsByNickname(request.nickname())) {
            throw new CustomException(ErrorCode.DUPLICATE_NICKNAME);
        }
        User user = User.builder()
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .nickname(request.nickname())
                .role(Role.MEMBER)
                .emailVerified(!emailVerificationRequired)
                .build();
        userRepository.save(user);
        if (emailVerificationRequired) {
            emailVerificationService.sendCode(request.email());
        }
        return UserResponse.from(user);
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new CustomException(ErrorCode.INVALID_PASSWORD);
        }

        if (emailVerificationRequired && !Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new CustomException(ErrorCode.EMAIL_NOT_VERIFIED);
        }

        TokenResponse tokens = issueTokens(user.getId(), user.getRole());
        return LoginResponse.of(tokens, attendanceService.checkAttendance(user.getId()));
    }

    public CheckAvailableResponse checkEmail(String email) {
        return new CheckAvailableResponse(!userRepository.existsByEmail(email));
    }

    public CheckAvailableResponse checkNickname(String nickname) {
        return new CheckAvailableResponse(!userRepository.existsByNickname(nickname));
    }

    @Transactional
    public void sendVerificationCode(String email) {
        emailVerificationService.sendCode(email);
    }

    @Transactional
    public void verifyEmail(String email, String code) {
        emailVerificationService.verifyCode(email, code);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        user.verifyEmail();
    }

    @Transactional
    public TokenResponse refresh(RefreshRequest request) {
        String incomingToken = request.refreshToken();

        // 토큰 서명·만료 검증 (이상 시 CustomException 발생)
        Long userId = jwtProvider.extractUserId(incomingToken);
        Role role = jwtProvider.extractRole(incomingToken);

        // Redis에 저장된 토큰과 대조
        String savedToken = refreshTokenRepository.findByUserId(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.REFRESH_TOKEN_NOT_FOUND));

        if (!savedToken.equals(incomingToken)) {
            throw new CustomException(ErrorCode.INVALID_TOKEN);
        }

        // Rotation: 기존 삭제 후 신규 발급
        refreshTokenRepository.deleteByUserId(userId);
        return issueTokens(userId, role);
    }

    @Transactional
    public void logout(CustomUserDetails userDetails) {
        refreshTokenRepository.deleteByUserId(userDetails.getUserId());
    }

    private TokenResponse issueTokens(Long userId, Role role) {
        String accessToken = jwtProvider.generateAccessToken(userId, role);
        String refreshToken = jwtProvider.generateRefreshToken(userId, role);
        refreshTokenRepository.save(
                userId,
                refreshToken,
                Duration.ofMillis(jwtProvider.getRefreshTokenExpiry())
        );
        return TokenResponse.of(accessToken, refreshToken);
    }
}
