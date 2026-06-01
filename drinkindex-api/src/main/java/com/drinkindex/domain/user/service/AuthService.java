package com.drinkindex.domain.user.service;

import com.drinkindex.domain.legal.entity.LegalDocument;
import com.drinkindex.domain.legal.entity.enums.LegalDocumentType;
import com.drinkindex.domain.legal.repository.LegalDocumentRepository;
import com.drinkindex.domain.nicknamebadword.service.NicknameBadWordValidator;
import com.drinkindex.domain.score.service.AttendanceService;
import com.drinkindex.domain.user.dto.*;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.entity.enums.Role;
import com.drinkindex.domain.user.policy.AccountPolicy;
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
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AttendanceService attendanceService;
    private final EmailVerificationService emailVerificationService;
    private final NicknameBadWordValidator nicknameBadWordValidator;
    private final LegalDocumentRepository legalDocumentRepository;
    private final LoginAttemptService loginAttemptService;

    @Value("${app.email.verification-required:true}")
    private boolean emailVerificationRequired;

    @Transactional
    public UserResponse signup(SignupRequest request) {
        if (AccountPolicy.isReservedEmail(request.email()) || userRepository.existsByEmail(request.email())) {
            throw new CustomException(ErrorCode.DUPLICATE_EMAIL);
        }
        if (AccountPolicy.isReservedNickname(request.nickname()) || userRepository.existsByNickname(request.nickname())) {
            throw new CustomException(ErrorCode.DUPLICATE_NICKNAME);
        }
        nicknameBadWordValidator.validate(request.nickname());
        LocalDateTime now = LocalDateTime.now();
        boolean preVerified = emailVerificationRequired && emailVerificationService.isPreVerified(request.email());
        // 동의 시점의 활성 약관/처리방침 버전을 스냅샷으로 기록 (법적 증빙용)
        String termsVersion = activeVersion(LegalDocumentType.TERMS);
        String privacyVersion = activeVersion(LegalDocumentType.PRIVACY_POLICY);
        User user = User.builder()
                .email(request.email())
                .password(passwordEncoder.encode(request.password()))
                .nickname(request.nickname())
                .role(Role.MEMBER)
                .emailVerified(preVerified || !emailVerificationRequired)
                .passwordChangedAt(now)
                .termsAgreedAt(now)
                .privacyAgreedAt(now)
                .termsAgreedVersion(termsVersion)
                .privacyAgreedVersion(privacyVersion)
                .emailSubscribed(request.emailSubscribed())
                .build();
        userRepository.save(user);
        if (preVerified) {
            emailVerificationService.clearPreVerified(request.email());
        } else if (emailVerificationRequired) {
            emailVerificationService.sendCode(request.email());
        }
        return UserResponse.from(user);
    }

    private String activeVersion(LegalDocumentType type) {
        return legalDocumentRepository.findByTypeAndIsActiveTrue(type)
                .map(LegalDocument::getVersion)
                .orElse(null);
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        // 무차별 대입 방어 — 연속 실패로 잠긴 계정은 비밀번호 검증 전 차단
        if (loginAttemptService.isLocked(request.email())) {
            throw new CustomException(ErrorCode.ACCOUNT_LOCKED);
        }

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            loginAttemptService.recordFailure(request.email());
            throw new CustomException(ErrorCode.INVALID_PASSWORD);
        }

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new CustomException(ErrorCode.ACCOUNT_INACTIVE);
        }

        if (user.getSuspendedUntil() != null && user.getSuspendedUntil().isAfter(LocalDateTime.now())) {
            throw new CustomException(ErrorCode.ACCOUNT_SUSPENDED,
                    new SuspensionDetail(user.getSuspendedUntil(), user.getSuspendReason()));
        }

        // 휴면 계정은 정상 로그인 차단 → 이메일 재인증(reactivate)으로만 해제 가능
        if (Boolean.TRUE.equals(user.getDormant())) {
            throw new CustomException(ErrorCode.ACCOUNT_DORMANT);
        }

        if (emailVerificationRequired && !Boolean.TRUE.equals(user.getEmailVerified())) {
            throw new CustomException(ErrorCode.EMAIL_NOT_VERIFIED);
        }

        loginAttemptService.reset(request.email());
        user.recordLogin();
        TokenResponse tokens = issueTokens(user.getId(), user.getRole());
        return LoginResponse.of(tokens, attendanceService.checkAttendance(user.getId()),
                user.isPasswordChangeRequired(), Boolean.TRUE.equals(user.getMustChangePassword()));
    }

    /**
     * 휴면 계정 해제 — 비밀번호 검증 + 이메일 인증코드 확인 후 휴면을 풀고 즉시 로그인 처리.
     */
    @Transactional
    public LoginResponse reactivate(ReactivateRequest request) {
        if (loginAttemptService.isLocked(request.email())) {
            throw new CustomException(ErrorCode.ACCOUNT_LOCKED);
        }

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            loginAttemptService.recordFailure(request.email());
            throw new CustomException(ErrorCode.INVALID_PASSWORD);
        }

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new CustomException(ErrorCode.ACCOUNT_INACTIVE);
        }

        if (user.getSuspendedUntil() != null && user.getSuspendedUntil().isAfter(LocalDateTime.now())) {
            throw new CustomException(ErrorCode.ACCOUNT_SUSPENDED,
                    new SuspensionDetail(user.getSuspendedUntil(), user.getSuspendReason()));
        }

        // 인증코드 검증 (실패 시 예외) — 본인 이메일 소유 확인
        emailVerificationService.verifyCode(request.email(), request.code());

        loginAttemptService.reset(request.email());
        user.reactivate();
        TokenResponse tokens = issueTokens(user.getId(), user.getRole());
        return LoginResponse.of(tokens, attendanceService.checkAttendance(user.getId()),
                user.isPasswordChangeRequired(), Boolean.TRUE.equals(user.getMustChangePassword()));
    }

    public CheckAvailableResponse checkEmail(String email) {
        boolean available = !AccountPolicy.isReservedEmail(email) && !userRepository.existsByEmail(email);
        return new CheckAvailableResponse(available);
    }

    public CheckAvailableResponse checkNickname(String nickname) {
        nicknameBadWordValidator.validate(nickname);
        boolean available = !AccountPolicy.isReservedNickname(nickname) && !userRepository.existsByNickname(nickname);
        return new CheckAvailableResponse(available);
    }

    @Transactional
    public void sendVerificationCode(String email) {
        emailVerificationService.sendCode(email);
    }

    @Transactional
    public void verifyEmail(String email, String code) {
        emailVerificationService.verifyCode(email, code);
        userRepository.findByEmail(email).ifPresentOrElse(
            User::verifyEmail,
            () -> emailVerificationService.markPreVerified(email)
        );
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
