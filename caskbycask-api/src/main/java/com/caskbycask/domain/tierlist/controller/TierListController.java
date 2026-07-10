package com.caskbycask.domain.tierlist.controller;

import com.caskbycask.domain.tierlist.dto.TierListImageUploadResponse;
import com.caskbycask.domain.tierlist.dto.TierListResponse;
import com.caskbycask.domain.tierlist.dto.TierListSaveRequest;
import com.caskbycask.domain.tierlist.dto.TierListSummaryResponse;
import com.caskbycask.domain.tierlist.service.TierListService;
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

import java.util.List;

@RestController
@RequestMapping("/api/tier-lists")
@RequiredArgsConstructor
public class TierListController {

    private final TierListService tierListService;

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<TierListSummaryResponse>>> getMine(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                tierListService.getMyTierLists(userDetails.getUserId())));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<TierListResponse>> getMineDetail(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                tierListService.getMine(id, userDetails.getUserId())));
    }

    @GetMapping("/share/{shareKey}")
    public ResponseEntity<ApiResponse<TierListResponse>> getShared(
            @PathVariable String shareKey
    ) {
        return ResponseEntity.ok(ApiResponse.success(tierListService.getShared(shareKey)));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<TierListResponse>> create(
            @Valid @RequestBody TierListSaveRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                tierListService.create(request, userDetails.getUserId())));
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<TierListResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody TierListSaveRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                tierListService.update(id, request, userDetails.getUserId())));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        tierListService.delete(id, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PostMapping(value = "/images", consumes = "multipart/form-data")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<TierListImageUploadResponse>> uploadImage(
            @RequestParam("image") MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                tierListService.uploadImage(file, userDetails.getUserId())));
    }
}
