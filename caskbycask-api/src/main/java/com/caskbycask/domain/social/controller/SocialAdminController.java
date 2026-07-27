package com.caskbycask.domain.social.controller;

import com.caskbycask.domain.social.dto.SocialAdminDtos;
import com.caskbycask.domain.social.dto.SocialPublicationResponse;
import com.caskbycask.domain.social.entity.enums.SocialPlatform;
import com.caskbycask.domain.social.entity.enums.SocialPublicationStatus;
import com.caskbycask.domain.social.service.*;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import com.caskbycask.global.response.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/admin/social")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
public class SocialAdminController {

    private final SocialPublicationQueryService queryService;
    private final SocialPublishRequestService publishRequestService;
    private final SocialThumbnailTemplateService templateService;
    private final SocialAccountService accountService;

    @GetMapping("/publications")
    public ResponseEntity<ApiResponse<PageResponse<SocialPublicationResponse>>> publications(
            @RequestParam(required = false) SocialPlatform platform,
            @RequestParam(required = false) SocialPublicationStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(
                queryService.adminHistory(platform, status, page, size))));
    }

    @PostMapping("/publications/{id}/retry")
    public ResponseEntity<ApiResponse<SocialPublicationResponse>> retry(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(
                publishRequestService.retry(id, user.getUserId(), true)));
    }

    @PostMapping("/publications/{id}/republish")
    public ResponseEntity<ApiResponse<SocialPublicationResponse>> republish(
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                publishRequestService.republish(id)));
    }

    @GetMapping("/templates")
    public ResponseEntity<ApiResponse<List<SocialAdminDtos.TemplateResponse>>> templates() {
        return ResponseEntity.ok(ApiResponse.success(templateService.allTemplates()));
    }

    @PostMapping("/templates")
    public ResponseEntity<ApiResponse<SocialAdminDtos.TemplateResponse>> createTemplate(
            @Valid @RequestBody SocialAdminDtos.TemplateRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(
                templateService.create(request, user.getUserId())));
    }

    @PutMapping("/templates/{id}")
    public ResponseEntity<ApiResponse<SocialAdminDtos.TemplateResponse>> updateTemplate(
            @PathVariable Long id,
            @Valid @RequestBody SocialAdminDtos.TemplateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(templateService.update(id, request)));
    }

    @DeleteMapping("/templates/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTemplate(@PathVariable Long id) {
        templateService.delete(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PostMapping(value = "/images/background", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<SocialAdminDtos.ImageUploadResponse>> uploadBackground(
            @RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.success(templateService.uploadBackground(file)));
    }

    @PostMapping(value = "/images/direct", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<SocialAdminDtos.ImageUploadResponse>> uploadDirect(
            @RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.success(templateService.uploadDirect(file)));
    }

    @GetMapping("/accounts")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<List<SocialAdminDtos.AccountResponse>>> accounts() {
        return ResponseEntity.ok(ApiResponse.success(accountService.status()));
    }

    @PostMapping("/accounts/{platform}/oauth")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<SocialAdminDtos.OAuthUrlResponse>> startOAuth(
            @PathVariable SocialPlatform platform,
            @RequestParam(required = false) String returnUrl,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(
                accountService.startOAuth(platform, user.getUserId(), returnUrl)));
    }

    @PostMapping("/accounts/{platform}/verify")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<SocialAdminDtos.AccountResponse>> verify(
            @PathVariable SocialPlatform platform) {
        return ResponseEntity.ok(ApiResponse.success(accountService.verify(platform)));
    }

    @DeleteMapping("/accounts/{platform}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<Void>> disconnect(@PathVariable SocialPlatform platform) {
        accountService.disconnect(platform);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
