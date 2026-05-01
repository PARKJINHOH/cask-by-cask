package com.drinkindex.admin.controller;

import com.drinkindex.domain.spirit.dto.*;
import com.drinkindex.domain.spirit.entity.enums.RequestStatus;
import com.drinkindex.domain.spirit.service.SpiritImageService;
import com.drinkindex.domain.spirit.service.SpiritService;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/spirits")
@RequiredArgsConstructor
public class AdminSpiritController {

    private final SpiritService spiritService;
    private final SpiritImageService spiritImageService;

    // ── 술 CRUD ─────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<ApiResponse<SpiritDetailResponse>> create(
            @Valid @RequestBody CreateSpiritRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                spiritService.createSpirit(request, userDetails.getUserId())
        ));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<SpiritDetailResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateSpiritRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                spiritService.updateSpirit(id, request, userDetails.getUserId())
        ));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        spiritService.deleteSpirit(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ── 이미지 관리 ──────────────────────────────────────────

    @PostMapping("/{id}/images")
    public ResponseEntity<ApiResponse<SpiritImageResponse>> uploadImage(
            @PathVariable Long id,
            @RequestParam MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                spiritImageService.uploadImage(id, file)
        ));
    }

    @DeleteMapping("/{id}/images/{imageId}")
    public ResponseEntity<ApiResponse<Void>> deleteImage(
            @PathVariable Long id,
            @PathVariable Long imageId) {
        spiritImageService.deleteImage(id, imageId);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PatchMapping("/{id}/images/{imageId}/primary")
    public ResponseEntity<ApiResponse<SpiritImageResponse>> setPrimaryImage(
            @PathVariable Long id,
            @PathVariable Long imageId) {
        return ResponseEntity.ok(ApiResponse.success(
                spiritImageService.setPrimaryImage(id, imageId)
        ));
    }

    // ── 등록 요청 처리 ───────────────────────────────────────

    @GetMapping("/requests")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Page<SpiritRegisterRequestResponse>>> getRequests(
            @RequestParam(defaultValue = "PENDING") RequestStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                spiritService.getRegisterRequests(status, pageable)
        ));
    }

    @PatchMapping("/requests/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<SpiritDetailResponse>> approveRequest(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                spiritService.approveRegisterRequest(id, userDetails.getUserId())
        ));
    }

    @PatchMapping("/requests/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> rejectRequest(
            @PathVariable Long id,
            @Valid @RequestBody RejectSpiritRequestRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        spiritService.rejectRegisterRequest(id, request.rejectReason(), userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }
}
