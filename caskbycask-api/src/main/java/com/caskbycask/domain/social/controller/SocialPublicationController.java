package com.caskbycask.domain.social.controller;

import com.caskbycask.domain.social.dto.SocialPublicationResponse;
import com.caskbycask.domain.social.entity.enums.SocialSourceType;
import com.caskbycask.domain.social.service.SocialPublishRequestService;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import com.caskbycask.global.response.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/social-publications")
@RequiredArgsConstructor
public class SocialPublicationController {

    private final SocialPublishRequestService publishRequestService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<PageResponse<SocialPublicationResponse>>> myHistory(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(
                publishRequestService.myHistory(user.getUserId(), page, size))));
    }

    @GetMapping("/source/{type}/{sourceId}")
    public ResponseEntity<ApiResponse<List<SocialPublicationResponse>>> states(
            @PathVariable SocialSourceType type,
            @PathVariable Long sourceId,
            @AuthenticationPrincipal CustomUserDetails user) {
        boolean admin = user.getRole() == com.caskbycask.domain.user.entity.enums.Role.SUPER_ADMIN
                || user.getRole() == com.caskbycask.domain.user.entity.enums.Role.ADMIN;
        return ResponseEntity.ok(ApiResponse.success(
                publishRequestService.states(type, sourceId, user.getUserId(), admin)));
    }

    @PostMapping("/{id}/retry")
    public ResponseEntity<ApiResponse<SocialPublicationResponse>> retry(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(
                publishRequestService.retry(id, user.getUserId(), false)));
    }
}
