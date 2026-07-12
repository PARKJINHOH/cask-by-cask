package com.caskbycask.domain.tierlist.controller;

import com.caskbycask.domain.tierlist.dto.*;
import com.caskbycask.domain.tierlist.service.TierListGuestDraftService;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/tier-list-drafts")
@RequiredArgsConstructor
public class TierListGuestDraftController {

    private final TierListGuestDraftService service;

    @PostMapping
    public ResponseEntity<ApiResponse<TierListGuestDraftResponse>> create(
            @Valid @RequestBody TierListGuestDraftRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(service.create(request)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<TierListGuestDraftResponse>> get(
            @RequestHeader(TierListGuestDraftService.TOKEN_HEADER) String token) {
        return ResponseEntity.ok(ApiResponse.success(service.get(token)));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<TierListGuestDraftResponse>> update(
            @RequestHeader(TierListGuestDraftService.TOKEN_HEADER) String token,
            @Valid @RequestBody TierListGuestDraftRequest request) {
        return ResponseEntity.ok(ApiResponse.success(service.update(token, request)));
    }

    @PostMapping(value = "/images", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<TierListImageUploadResponse>> uploadImage(
            @RequestHeader(TierListGuestDraftService.TOKEN_HEADER) String token,
            @RequestParam("image") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.success(service.uploadImage(token, file)));
    }

    @PostMapping("/claim")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<TierListGuestDraftResponse>> claim(
            @RequestHeader(TierListGuestDraftService.TOKEN_HEADER) String token,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(service.claim(token, userDetails.getUserId())));
    }
}
