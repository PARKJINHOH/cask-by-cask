package com.caskbycask.domain.user.controller;

import com.caskbycask.domain.user.dto.*;
import com.caskbycask.domain.user.service.AuthService;
import com.caskbycask.global.auth.RefreshTokenCookieProvider;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Validated
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenCookieProvider refreshTokenCookieProvider;

    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<UserResponse>> signup(@Valid @RequestBody SignupRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(authService.signup(request)));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthLoginResult result = authService.login(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshTokenCookieProvider.create(result.refreshToken()).toString())
                .body(ApiResponse.success(result.body()));
    }

    /** 토큰 재발급 — refresh 토큰은 httpOnly 쿠키에서 읽고, 회전된 쿠키를 다시 내려준다. */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AccessTokenResponse>> refresh(HttpServletRequest request) {
        String refreshToken = refreshTokenCookieProvider.resolve(request);
        if (refreshToken == null) {
            throw new CustomException(ErrorCode.REFRESH_TOKEN_NOT_FOUND);
        }
        AuthRefreshResult result = authService.refresh(refreshToken);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshTokenCookieProvider.create(result.refreshToken()).toString())
                .body(ApiResponse.success(AccessTokenResponse.of(result.accessToken())));
    }

    @PostMapping("/reactivate")
    public ResponseEntity<ApiResponse<LoginResponse>> reactivate(@Valid @RequestBody ReactivateRequest request) {
        AuthLoginResult result = authService.reactivate(request);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshTokenCookieProvider.create(result.refreshToken()).toString())
                .body(ApiResponse.success(result.body()));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@AuthenticationPrincipal CustomUserDetails userDetails) {
        authService.logout(userDetails);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshTokenCookieProvider.clear().toString())
                .body(ApiResponse.success());
    }

    @GetMapping("/check-email")
    public ResponseEntity<ApiResponse<CheckAvailableResponse>> checkEmail(
            @RequestParam @Email @NotBlank String email) {
        return ResponseEntity.ok(ApiResponse.success(authService.checkEmail(email)));
    }

    @GetMapping("/check-nickname")
    public ResponseEntity<ApiResponse<CheckAvailableResponse>> checkNickname(
            @RequestParam @NotBlank @Size(min = 2, max = 100) String nickname) {
        return ResponseEntity.ok(ApiResponse.success(authService.checkNickname(nickname)));
    }

    @PostMapping("/send-verification")
    public ResponseEntity<ApiResponse<Void>> sendVerification(@Valid @RequestBody SendVerificationRequest request) {
        authService.sendVerificationCode(request.email());
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PostMapping("/verify-email")
    public ResponseEntity<ApiResponse<Void>> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        authService.verifyEmail(request.email(), request.code());
        return ResponseEntity.ok(ApiResponse.success());
    }

    /** 아이디(가입 이메일) 찾기 — 닉네임으로 마스킹된 이메일 조회 */
    @PostMapping("/find-email")
    public ResponseEntity<ApiResponse<FindEmailResponse>> findEmail(@Valid @RequestBody FindEmailRequest request) {
        return ResponseEntity.ok(ApiResponse.success(authService.findEmailByNickname(request.nickname())));
    }

    /** 비밀번호 재설정 — 인증 코드 발송 (계정 존재 여부와 무관하게 성공 응답) */
    @PostMapping("/password-reset/send-code")
    public ResponseEntity<ApiResponse<Void>> sendPasswordResetCode(@Valid @RequestBody SendVerificationRequest request) {
        authService.sendPasswordResetCode(request.email());
        return ResponseEntity.ok(ApiResponse.success());
    }

    /** 비밀번호 재설정 — 코드 검증 (소모하지 않음) */
    @PostMapping("/password-reset/verify-code")
    public ResponseEntity<ApiResponse<Void>> verifyPasswordResetCode(@Valid @RequestBody PasswordResetVerifyRequest request) {
        authService.verifyPasswordResetCode(request.email(), request.code());
        return ResponseEntity.ok(ApiResponse.success());
    }

    /** 비밀번호 재설정 — 새 비밀번호 확정 */
    @PostMapping("/password-reset/confirm")
    public ResponseEntity<ApiResponse<Void>> confirmPasswordReset(@Valid @RequestBody PasswordResetConfirmRequest request) {
        authService.resetPassword(request.email(), request.code(), request.newPassword());
        return ResponseEntity.ok(ApiResponse.success());
    }
}
