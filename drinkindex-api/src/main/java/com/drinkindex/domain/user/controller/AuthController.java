package com.drinkindex.domain.user.controller;

import com.drinkindex.domain.user.dto.*;
import com.drinkindex.domain.user.service.AuthService;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.response.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
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

    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<UserResponse>> signup(@Valid @RequestBody SignupRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(authService.signup(request)));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(ApiResponse.success(authService.login(request)));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenResponse>> refresh(@Valid @RequestBody RefreshRequest request) {
        return ResponseEntity.ok(ApiResponse.success(authService.refresh(request)));
    }

    @PostMapping("/reactivate")
    public ResponseEntity<ApiResponse<LoginResponse>> reactivate(@Valid @RequestBody ReactivateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(authService.reactivate(request)));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@AuthenticationPrincipal CustomUserDetails userDetails) {
        authService.logout(userDetails);
        return ResponseEntity.ok(ApiResponse.success());
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
