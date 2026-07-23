package com.caskbycask.domain.bottlecollection.controller;

import com.caskbycask.domain.bottlecollection.dto.UserBottleListResponse;
import com.caskbycask.domain.bottlecollection.dto.UserBottleRequest;
import com.caskbycask.domain.bottlecollection.dto.UserBottleResponse;
import com.caskbycask.domain.bottlecollection.dto.UserBottleSortKey;
import com.caskbycask.domain.bottlecollection.entity.BottleStatus;
import com.caskbycask.domain.bottlecollection.service.UserBottleImageService;
import com.caskbycask.domain.bottlecollection.service.UserBottleService;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;

@RestController
@RequiredArgsConstructor
public class UserBottleController {

    private final UserBottleService userBottleService;
    private final UserBottleImageService userBottleImageService;

    @GetMapping("/api/bottles/my")
    public ResponseEntity<ApiResponse<UserBottleListResponse>> getMyBottles(
            @RequestParam(required = false) SpiritCategory category,
            @RequestParam(required = false) BottleStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            // 기존 클라이언트 호환용. startDate/endDate가 없을 때만 연도 범위로 적용한다.
            @RequestParam(required = false) Integer year,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(defaultValue = "PURCHASE_DATE") UserBottleSortKey sortKey,
            @RequestParam(defaultValue = "DESC") Sort.Direction sortDir,
            @RequestParam(defaultValue = "ko") String lang,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
            userBottleService.getMyBottles(userDetails.getUserId(), category, status,
                startDate, endDate, year, sortKey, sortDir, lang,
                PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size))))));
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

    @PutMapping("/api/bottles/{id}/images/{imageId}")
    public ResponseEntity<ApiResponse<Void>> replaceImage(
            @PathVariable Long id,
            @PathVariable Long imageId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        userBottleImageService.replaceImage(id, imageId, userDetails.getUserId(), file);
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

    @GetMapping("/api/users/{userId}/bottles")
    public ResponseEntity<ApiResponse<UserBottleListResponse>> getPublicBottles(
            @PathVariable Long userId,
            @RequestParam(required = false) SpiritCategory category,
            @RequestParam(required = false) Integer year,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(ApiResponse.success(
            userBottleService.getPublicBottles(userId, category, year, PageRequest.of(page, size))));
    }
}
