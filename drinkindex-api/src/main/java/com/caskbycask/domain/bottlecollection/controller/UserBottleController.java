package com.caskbycask.domain.bottlecollection.controller;

import com.caskbycask.domain.bottlecollection.dto.*;
import com.caskbycask.domain.bottlecollection.entity.BottleStatus;
import com.caskbycask.domain.bottlecollection.service.UserBottleImageService;
import com.caskbycask.domain.bottlecollection.service.UserBottleService;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
public class UserBottleController {

    private final UserBottleService userBottleService;
    private final UserBottleImageService userBottleImageService;

    @GetMapping("/api/bottles/my")
    public ResponseEntity<ApiResponse<UserBottleListResponse>> getMyBottles(
            @RequestParam(required = false) SpiritCategory category,
            @RequestParam(required = false) BottleStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
            userBottleService.getMyBottles(userDetails.getUserId(), category, status,
                PageRequest.of(page, size))));
    }

    @PostMapping("/api/bottles")
    public ResponseEntity<ApiResponse<UserBottleResponse>> createBottle(
            @Valid @RequestBody UserBottleRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
            userBottleService.createBottle(userDetails.getUserId(), request)));
    }

    @GetMapping("/api/bottles/{id}")
    public ResponseEntity<ApiResponse<UserBottleResponse>> getBottle(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
            userBottleService.getBottle(id, userDetails.getUserId())));
    }

    @PutMapping("/api/bottles/{id}")
    public ResponseEntity<ApiResponse<UserBottleResponse>> updateBottle(
            @PathVariable Long id,
            @Valid @RequestBody UserBottleRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
            userBottleService.updateBottle(id, userDetails.getUserId(), request)));
    }

    @DeleteMapping("/api/bottles/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteBottle(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        userBottleService.deleteBottle(id, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PatchMapping("/api/bottles/{id}/status")
    public ResponseEntity<ApiResponse<UserBottleResponse>> toggleStatus(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
            userBottleService.toggleStatus(id, userDetails.getUserId())));
    }

    @PatchMapping("/api/bottles/{id}/public")
    public ResponseEntity<ApiResponse<UserBottleResponse>> togglePublic(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
            userBottleService.togglePublic(id, userDetails.getUserId())));
    }

    @PostMapping("/api/bottles/{id}/images")
    public ResponseEntity<ApiResponse<Void>> uploadImage(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        userBottleImageService.uploadImage(id, userDetails.getUserId(), file);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @DeleteMapping("/api/bottles/{id}/images/{imageId}")
    public ResponseEntity<ApiResponse<Void>> deleteImage(
            @PathVariable Long id,
            @PathVariable Long imageId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        userBottleImageService.deleteImage(id, imageId, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    // 인증 불필요 — Spring Security permitAll 설정에서 허용
    @GetMapping("/api/users/{userId}/bottles")
    public ResponseEntity<ApiResponse<UserBottleListResponse>> getPublicBottles(
            @PathVariable Long userId,
            @RequestParam(required = false) SpiritCategory category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(ApiResponse.success(
            userBottleService.getPublicBottles(userId, category, PageRequest.of(page, size))));
    }
}
