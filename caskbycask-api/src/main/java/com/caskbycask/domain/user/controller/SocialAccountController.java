package com.caskbycask.domain.user.controller;

import com.caskbycask.domain.user.dto.OAuthCodeRequest;
import com.caskbycask.domain.user.dto.OAuthLinkRequest;
import com.caskbycask.domain.user.dto.SocialAccountsResponse;
import com.caskbycask.domain.user.service.OAuthService;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 내 소셜 연동 관리 (인증 필요). 마이페이지 계정설정의 소셜 연동 섹션이 사용한다.
 */
@RestController
@RequestMapping("/api/users/me/social")
@RequiredArgsConstructor
public class SocialAccountController {

    private final OAuthService oAuthService;

    /** 내 연동 현황 조회. */
    @GetMapping
    public ResponseEntity<ApiResponse<SocialAccountsResponse>> list(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(oAuthService.socialAccounts(userDetails.getUserId())));
    }

    /** 마이페이지에서 직접 연동 (코드 기반). */
    @PostMapping("/connect")
    public ResponseEntity<ApiResponse<SocialAccountsResponse>> connect(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody OAuthCodeRequest request) {
        return ResponseEntity.ok(ApiResponse.success(oAuthService.connect(userDetails.getUserId(), request)));
    }

    /** 로그인 시점 NEEDS_LINK 후 연동 (티켓 기반). */
    @PostMapping("/link")
    public ResponseEntity<ApiResponse<SocialAccountsResponse>> link(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody OAuthLinkRequest request) {
        return ResponseEntity.ok(ApiResponse.success(oAuthService.linkWithTicket(userDetails.getUserId(), request)));
    }

    /** 연동 해제 (제공자측 연결도 best-effort 해지). */
    @DeleteMapping("/{provider}")
    public ResponseEntity<ApiResponse<SocialAccountsResponse>> unlink(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable String provider) {
        return ResponseEntity.ok(ApiResponse.success(oAuthService.unlink(userDetails.getUserId(), provider)));
    }
}
