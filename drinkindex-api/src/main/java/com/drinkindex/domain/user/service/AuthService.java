package com.drinkindex.domain.user.service;

import com.drinkindex.domain.score.service.AttendanceService;
import com.drinkindex.domain.user.dto.*;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.entity.enums.Role;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.auth.jwt.JwtProvider;
import com.drinkindex.global.auth.jwt.RefreshTokenRepository;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
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

    @Transactional
    public UserResponse signup(SignupRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new CustomException(ErrorCode.DUPLICATE_EMAIL);
        }
        User user = User.builder()
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .nickname(request.nickname())
                .role(Role.MEMBER)
                .build();
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new CustomException(ErrorCode.INVALID_PASSWORD);
        }

        TokenResponse tokens = issueTokens(user.getId(), user.getRole());
        return LoginResponse.of(tokens, attendanceService.checkAttendance(user.getId()));
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
