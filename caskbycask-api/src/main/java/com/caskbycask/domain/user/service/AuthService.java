package com.caskbycask.domain.user.service;

import com.caskbycask.domain.legal.entity.LegalDocument;
import com.caskbycask.domain.legal.entity.enums.LegalDocumentType;
import com.caskbycask.domain.legal.repository.LegalDocumentRepository;
import com.caskbycask.domain.nicknamebadword.service.NicknameBadWordValidator;
import com.caskbycask.domain.score.service.AttendanceService;
import com.caskbycask.domain.user.dto.*;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.entity.enums.Role;
import com.caskbycask.domain.user.policy.AccountPolicy;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.auth.jwt.JwtProvider;
import com.caskbycask.global.auth.jwt.RefreshTokenRepository;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.email.EmailVerificationService;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
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
    public AuthLoginResult login(LoginRequest request) {
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
        return buildLoginResult(user);
    }

    /**
     * 휴면 계정 해제 — 비밀번호 검증 + 이메일 인증코드 확인 후 휴면을 풀고 즉시 로그인 처리.
     */
    @Transactional
    public AuthLoginResult reactivate(ReactivateRequest request) {
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
        return buildLoginResult(user);
    }

    /** 토큰 발급 + 로그인 응답 바디 구성 (login/reactivate 공통). refresh 토큰은 캐리어로 분리. */
    private AuthLoginResult buildLoginResult(User user) {
        TokenResponse tokens = issueTokens(user.getId(), user.getRole());
        LoginResponse body = LoginResponse.of(
                tokens.accessToken(),
                null,
                user.isPasswordChangeRequired(),
                Boolean.TRUE.equals(user.getMustChangePassword()));
        return new AuthLoginResult(body, tokens.refreshToken());
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

    /**
     * 아이디(가입 이메일) 찾기 — 닉네임으로 계정을 조회해 마스킹된 이메일을 반환한다.
     * 이메일 전체를 노출하지 않아 열거(enumeration) 위험을 낮춘다.
     */
    public FindEmailResponse findEmailByNickname(String nickname) {
        User user = userRepository.findByNicknameAndNotDeleted(nickname)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
        return new FindEmailResponse(maskEmail(user.getEmail()));
    }

    /**
     * 비밀번호 재설정 코드 발송 — 가입된 이메일에만 실제 발송하되,
     * 응답은 계정 존재 여부와 무관하게 항상 성공 처리해 계정 열거를 차단한다.
     */
    @Transactional(readOnly = true)
    public void sendPasswordResetCode(String email) {
        if (userRepository.existsByEmail(email)) {
            emailVerificationService.sendPasswordResetCode(email);
        }
    }

    /** 비밀번호 재설정 코드 검증 (코드 소모 없이 유효성만 확인). */
    public void verifyPasswordResetCode(String email, String code) {
        emailVerificationService.verifyPasswordResetCode(email, code, false);
    }

    /**
     * 비밀번호 재설정 확정 — 코드 검증·소모 후 새 비밀번호로 교체.
     * 잠금/실패 카운트를 초기화하고 기존 세션(refresh token)을 무효화한다.
     */
    @Transactional
    public void resetPassword(String email, String code, String newPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        // 코드 검증 + 소모 (재사용 차단)
        emailVerificationService.verifyPasswordResetCode(email, code, true);

        user.updatePassword(passwordEncoder.encode(newPassword));

        // 무차별 대입 잠금 해제 + 기존 세션 강제 만료 (탈취 대비)
        loginAttemptService.reset(email);
        refreshTokenRepository.deleteByUserId(user.getId());
    }

    /** 이메일 로컬파트 앞 2자만 남기고 마스킹. (예: drinkindex@gmail.com → dr***@gmail.com) */
    private String maskEmail(String email) {
        int at = email.indexOf('@');
        if (at <= 0) {
            return "***";
        }
        String local = email.substring(0, at);
        String domain = email.substring(at);
        String visible = local.length() >= 2 ? local.substring(0, 2) : local.substring(0, 1);
        return visible + "***" + domain;
    }

    @Transactional
    public AuthRefreshResult refresh(String incomingToken) {
        // 토큰 서명·만료 검증 (이상 시 CustomException 발생)
        Long userId = jwtProvider.extractUserId(incomingToken);

        // [보안] Access Token 을 재발급에 사용하는 것을 차단 (Redis 대조와 이중 방어)
        if (!jwtProvider.isRefreshToken(incomingToken)) {
            throw new CustomException(ErrorCode.INVALID_TOKEN);
        }

        // Redis에 저장된 토큰과 대조
        String savedToken = refreshTokenRepository.findByUserId(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.REFRESH_TOKEN_NOT_FOUND));

        if (!savedToken.equals(incomingToken)) {
            throw new CustomException(ErrorCode.INVALID_TOKEN);
        }

        // 계정이 삭제(탈퇴)되었거나 비활성화된 경우 — 재발급 거부 후 남은 토큰 정리.
        // (재발급을 막아야 프론트가 401 → refresh 실패 → 강제 로그아웃 흐름을 탄다)
        User user = userRepository.findById(userId).orElse(null);
        if (user == null || Boolean.FALSE.equals(user.getIsActive())) {
            refreshTokenRepository.deleteByUserId(userId);
            throw new CustomException(user == null ? ErrorCode.USER_NOT_FOUND : ErrorCode.ACCOUNT_INACTIVE);
        }

        // Rotation: 기존 삭제 후 신규 발급
        refreshTokenRepository.deleteByUserId(userId);
        // 토큰 클레임의 과거 역할이 아니라 DB의 현재 역할로 회전한다.
        // 역할 변경/통합 직후에도 재로그인 없이 최신 권한이 반영된다.
        TokenResponse tokens = issueTokens(userId, user.getRole());
        return new AuthRefreshResult(tokens.accessToken(), tokens.refreshToken());
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
