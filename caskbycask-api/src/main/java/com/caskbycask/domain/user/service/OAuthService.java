package com.caskbycask.domain.user.service;

import com.caskbycask.domain.legal.entity.LegalDocument;
import com.caskbycask.domain.legal.entity.enums.LegalDocumentType;
import com.caskbycask.domain.legal.repository.LegalDocumentRepository;
import com.caskbycask.domain.nicknamebadword.service.NicknameBadWordValidator;
import com.caskbycask.domain.score.service.AttendanceService;
import com.caskbycask.domain.user.dto.*;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.entity.UserSocialAccount;
import com.caskbycask.domain.user.entity.enums.Role;
import com.caskbycask.domain.user.entity.enums.SignupMethod;
import com.caskbycask.domain.user.entity.enums.SocialProvider;
import com.caskbycask.domain.user.policy.AccountPolicy;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.domain.user.repository.UserSocialAccountRepository;
import com.caskbycask.global.auth.jwt.JwtProvider;
import com.caskbycask.global.auth.jwt.RefreshTokenRepository;
import com.caskbycask.global.auth.oauth.*;
import com.caskbycask.global.config.OAuthProperties;
import com.caskbycask.global.email.EmailVerificationService;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * 소셜 로그인(네이버·구글) 오케스트레이션.
 *
 * 신뢰 경계: 제공자 신원은 항상 서버가 code 교환으로 확인한다. 단계 간 전달은 Redis 단명 티켓으로만 하며,
 * 클라이언트가 보낸 provider 신원/이메일은 신뢰하지 않는다. 계정 매핑 기준은 (provider, providerUserId)
 * (네이버 id / 구글 sub) 이고 이메일은 보조 스냅샷일 뿐이다.
 */
@Service
@RequiredArgsConstructor
public class OAuthService {

    private final UserRepository userRepository;
    private final UserSocialAccountRepository socialAccountRepository;
    private final OAuthClientRegistry clientRegistry;
    private final OAuthTicketStore ticketStore;
    private final OAuthTokenCipher tokenCipher;
    private final OAuthProperties properties;
    private final JwtProvider jwtProvider;
    private final RefreshTokenRepository refreshTokenRepository;
    private final AttendanceService attendanceService;
    private final EmailVerificationService emailVerificationService;
    private final NicknameBadWordValidator nicknameBadWordValidator;
    private final LegalDocumentRepository legalDocumentRepository;

    // ── 인가 URL ────────────────────────────────────────────────
    public OAuthAuthorizeUrlResponse authorizeUrl(OAuthAuthorizeUrlRequest request) {
        SocialProvider provider = parseProvider(request.provider());
        validateRedirectUri(request.redirectUri());
        OAuthProviderClient client = clientRegistry.get(provider);
        String state = ticketStore.issueState(provider);
        return new OAuthAuthorizeUrlResponse(client.buildAuthorizeUrl(request.redirectUri(), state));
    }

    // ── 콜백 (로그인/신규가입/연동안내 분기) ─────────────────────
    @Transactional
    public OAuthCallbackResult callback(OAuthCodeRequest request) {
        SocialProvider provider = parseProvider(request.provider());
        validateRedirectUri(request.redirectUri());
        ticketStore.consumeState(request.state(), provider);

        OAuthProviderClient client = clientRegistry.get(provider);
        // 네트워크 호출(토큰/유저정보)은 DB 쓰기 전에 수행 — 지연 커넥션 획득으로 DB 점유 없음.
        OAuthTokenBundle bundle = client.exchangeCode(request.code(), request.redirectUri(), request.state());
        OAuthUserInfo info = client.fetchUserInfo(bundle.accessToken());
        String refreshEnc = tokenCipher.encrypt(bundle.refreshToken());

        // 1) 이미 연동된 계정 → 로그인
        var linked = socialAccountRepository.findByProviderAndProviderUserId(provider, info.providerUserId());
        if (linked.isPresent()) {
            return loginExisting(linked.get(), info.email(), refreshEnc);
        }

        // 2) (검증된) 이메일이 기존 계정과 일치 → 본인확인 후 연동 안내
        if (info.email() != null && info.emailVerified() && userRepository.existsByEmail(info.email())) {
            String ticket = ticketStore.issueTicket(toTicket(provider, info, refreshEnc));
            return new OAuthCallbackResult(
                    OAuthCallbackResponse.needsLink(ticket, maskEmail(info.email())), null);
        }

        // 3) 신규가입 진행
        String ticket = ticketStore.issueTicket(toTicket(provider, info, refreshEnc));
        return new OAuthCallbackResult(
                OAuthCallbackResponse.needsSignup(
                        ticket, info.email(), info.emailVerified(), sanitizeNickname(info.nickname())),
                null);
    }

    private OAuthCallbackResult loginExisting(UserSocialAccount account, String latestEmail, String refreshEnc) {
        User user = account.getUser();
        assertLoginable(user);
        if (Boolean.TRUE.equals(user.getDormant())) {
            // 소셜 인증 성공은 본인확인이므로 휴면 자동 해제
            user.reactivate();
        }
        account.updateRefreshToken(refreshEnc);
        if (latestEmail != null) {
            account.updateEmail(latestEmail);
        }
        user.recordLogin();

        TokenResponse tokens = issueTokens(user.getId(), user.getRole());
        LoginResponse body = LoginResponse.of(
                tokens.accessToken(),
                attendanceService.checkAttendance(user.getId()),
                user.isPasswordChangeRequired(),
                Boolean.TRUE.equals(user.getMustChangePassword()));
        return new OAuthCallbackResult(OAuthCallbackResponse.login(body), tokens.refreshToken());
    }

    // ── 신규가입 완료 ───────────────────────────────────────────
    @Transactional
    public AuthLoginResult completeSignup(OAuthSignupRequest request) {
        OAuthTicket ticket = ticketStore.consumeTicket(request.signupTicket());

        // 동시성: 콜백~가입 사이 동일 소셜이 연동되었을 수 있음
        if (socialAccountRepository
                .findByProviderAndProviderUserId(ticket.provider(), ticket.providerUserId()).isPresent()) {
            throw new CustomException(ErrorCode.OAUTH_ALREADY_LINKED);
        }

        // 이메일 결정: 티켓에 검증된 이메일이 있으면 그대로, 없으면 사용자 입력+인증코드 검증
        String email;
        if (ticket.email() != null && ticket.emailVerified()) {
            email = ticket.email();
        } else {
            if (isBlank(request.email()) || isBlank(request.emailCode())) {
                throw new CustomException(ErrorCode.OAUTH_EMAIL_REQUIRED);
            }
            emailVerificationService.verifyCode(request.email(), request.emailCode());
            email = request.email();
        }

        if (AccountPolicy.isReservedEmail(email) || userRepository.existsByEmail(email)) {
            throw new CustomException(ErrorCode.DUPLICATE_EMAIL);
        }
        if (AccountPolicy.isReservedNickname(request.nickname()) || userRepository.existsByNickname(request.nickname())) {
            throw new CustomException(ErrorCode.DUPLICATE_NICKNAME);
        }
        nicknameBadWordValidator.validate(request.nickname());

        LocalDateTime now = LocalDateTime.now();
        User user = User.builder()
                .email(email)
                .password(null)                 // 소셜 전용 계정 — 비밀번호 없음
                .nickname(request.nickname())
                .role(Role.MEMBER)
                .signupMethod(SignupMethod.valueOf(ticket.provider().name()))  // 가입 경로: NAVER/GOOGLE
                .emailVerified(true)            // 제공자 검증 또는 우리 인증코드로 확인됨
                .termsAgreedAt(now)
                .privacyAgreedAt(now)
                .termsAgreedVersion(activeVersion(LegalDocumentType.TERMS))
                .privacyAgreedVersion(activeVersion(LegalDocumentType.PRIVACY_POLICY))
                .emailSubscribed(request.emailSubscribed())
                .build();
        userRepository.save(user);

        socialAccountRepository.save(UserSocialAccount.builder()
                .user(user)
                .provider(ticket.provider())
                .providerUserId(ticket.providerUserId())
                .email(email)
                .providerRefreshTokenEnc(ticket.refreshTokenEnc())
                .linkedAt(now)
                .build());

        user.recordLogin();
        TokenResponse tokens = issueTokens(user.getId(), user.getRole());
        LoginResponse body = LoginResponse.of(
                tokens.accessToken(),
                attendanceService.checkAttendance(user.getId()),
                false,
                false);
        return new AuthLoginResult(body, tokens.refreshToken());
    }

    // ── 연동 (티켓 기반: 로그인 시점 NEEDS_LINK 후) ─────────────
    @Transactional
    public SocialAccountsResponse linkWithTicket(Long userId, OAuthLinkRequest request) {
        OAuthTicket ticket = ticketStore.consumeTicket(request.linkTicket());
        attachSocial(userId, ticket.provider(), ticket.providerUserId(), ticket.email(), ticket.refreshTokenEnc());
        return socialAccounts(userId);
    }

    // ── 연동 (코드 기반: 마이페이지에서 직접 연동) ──────────────
    @Transactional
    public SocialAccountsResponse connect(Long userId, OAuthCodeRequest request) {
        SocialProvider provider = parseProvider(request.provider());
        validateRedirectUri(request.redirectUri());
        ticketStore.consumeState(request.state(), provider);

        OAuthProviderClient client = clientRegistry.get(provider);
        OAuthTokenBundle bundle = client.exchangeCode(request.code(), request.redirectUri(), request.state());
        OAuthUserInfo info = client.fetchUserInfo(bundle.accessToken());
        String refreshEnc = tokenCipher.encrypt(bundle.refreshToken());

        attachSocial(userId, provider, info.providerUserId(), info.email(), refreshEnc);
        return socialAccounts(userId);
    }

    private void attachSocial(Long userId, SocialProvider provider, String providerUserId,
                              String email, String refreshEnc) {
        var existing = socialAccountRepository.findByProviderAndProviderUserId(provider, providerUserId);
        if (existing.isPresent()) {
            if (!existing.get().getUser().getId().equals(userId)) {
                throw new CustomException(ErrorCode.OAUTH_ALREADY_LINKED);
            }
            // 동일 사용자 재연동 — 토큰만 갱신 (멱등)
            existing.get().updateRefreshToken(refreshEnc);
            if (email != null) {
                existing.get().updateEmail(email);
            }
            return;
        }
        if (socialAccountRepository.existsByUserIdAndProvider(userId, provider)) {
            // 같은 제공자의 다른 계정을 추가로 붙이는 것은 막는다 (제공자당 1개)
            throw new CustomException(ErrorCode.OAUTH_ALREADY_LINKED);
        }
        User user = userRepository.getByIdOrThrow(userId);
        socialAccountRepository.save(UserSocialAccount.builder()
                .user(user)
                .provider(provider)
                .providerUserId(providerUserId)
                .email(email)
                .providerRefreshTokenEnc(refreshEnc)
                .linkedAt(LocalDateTime.now())
                .build());
    }

    // ── 연동 현황 ───────────────────────────────────────────────
    @Transactional(readOnly = true)
    public SocialAccountsResponse socialAccounts(Long userId) {
        User user = userRepository.getByIdOrThrow(userId);
        var accounts = socialAccountRepository.findByUserId(userId).stream()
                .map(SocialAccountResponse::from)
                .toList();
        return new SocialAccountsResponse(accounts, user.hasPassword());
    }

    // ── 연동 해제 ───────────────────────────────────────────────
    @Transactional
    public SocialAccountsResponse unlink(Long userId, String providerRaw) {
        SocialProvider provider = parseProvider(providerRaw);
        UserSocialAccount account = socialAccountRepository.findByUserIdAndProvider(userId, provider)
                .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND));
        User user = userRepository.getByIdOrThrow(userId);

        // 마지막 로그인 수단 보호 — 비밀번호 없고 이 연동이 유일한 수단이면 해제 불가
        long total = socialAccountRepository.countByUserId(userId);
        if (!user.hasPassword() && total <= 1) {
            throw new CustomException(ErrorCode.OAUTH_LAST_LOGIN_METHOD);
        }

        // 제공자측 연결 해지 (best-effort)
        String refresh = tokenCipher.decrypt(account.getProviderRefreshTokenEnc());
        if (refresh != null) {
            clientRegistry.get(provider).unlink(refresh);
        }
        socialAccountRepository.delete(account);
        return socialAccounts(userId);
    }

    // ── helpers ─────────────────────────────────────────────────
    private void assertLoginable(User user) {
        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new CustomException(ErrorCode.ACCOUNT_INACTIVE);
        }
        if (user.getSuspendedUntil() != null && user.getSuspendedUntil().isAfter(LocalDateTime.now())) {
            throw new CustomException(ErrorCode.ACCOUNT_SUSPENDED,
                    new SuspensionDetail(user.getSuspendedUntil(), user.getSuspendReason()));
        }
    }

    private OAuthTicket toTicket(SocialProvider provider, OAuthUserInfo info, String refreshEnc) {
        return new OAuthTicket(provider, info.providerUserId(), info.email(), info.emailVerified(),
                refreshEnc, sanitizeNickname(info.nickname()));
    }

    private SocialProvider parseProvider(String raw) {
        try {
            return SocialProvider.valueOf(raw.trim().toUpperCase());
        } catch (Exception e) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }

    private void validateRedirectUri(String redirectUri) {
        if (!properties.isAllowedRedirectUri(redirectUri)) {
            throw new CustomException(ErrorCode.OAUTH_REDIRECT_URI_NOT_ALLOWED);
        }
    }

    private TokenResponse issueTokens(Long userId, Role role) {
        String accessToken = jwtProvider.generateAccessToken(userId, role);
        String refreshToken = jwtProvider.generateRefreshToken(userId, role);
        refreshTokenRepository.save(userId, refreshToken,
                Duration.ofMillis(jwtProvider.getRefreshTokenExpiry()));
        return TokenResponse.of(accessToken, refreshToken);
    }

    private String activeVersion(LegalDocumentType type) {
        return legalDocumentRepository.findByTypeAndIsActiveTrue(type)
                .map(LegalDocument::getVersion)
                .orElse(null);
    }

    /** 제공자 닉네임을 우리 정책(한글/영문/숫자, 2~8자)에 맞게 정제. 부적합하면 null(사용자가 직접 입력). */
    private String sanitizeNickname(String raw) {
        if (raw == null) {
            return null;
        }
        String cleaned = raw.replaceAll("[^가-힣a-zA-Z0-9]", "");
        if (cleaned.length() > 8) {
            cleaned = cleaned.substring(0, 8);
        }
        return cleaned.length() >= 2 ? cleaned : null;
    }

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

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
