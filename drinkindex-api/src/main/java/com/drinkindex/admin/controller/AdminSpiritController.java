package com.drinkindex.admin.controller;

import com.drinkindex.domain.spirit.dto.*;
import com.drinkindex.domain.spirit.entity.enums.RequestStatus;
import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import com.drinkindex.domain.spirit.entity.enums.SpiritStatus;
import com.drinkindex.domain.spirit.service.SpiritImageService;
import com.drinkindex.domain.spirit.service.SpiritService;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.response.ApiResponse;
import com.drinkindex.global.response.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
    // PARTNER 포함 접근 가능 (verifyProducerAccess 로 세부 제어)

    // 관리자 술 목록 — status 미지정(전체) 시 ACTIVE/HIDDEN/PENDING 모두 조회
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<SpiritListResponse>>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) SpiritCategory category,
            @RequestParam(required = false) SpiritStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        SpiritSearchCondition condition = new SpiritSearchCondition(
                keyword, category, null, null, null,
                null, null, null, null, null, null, null,
                status, null);
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(spiritService.searchSpirits(condition, pageable))));
    }

    // 관리자 술 상세 — 상태(ACTIVE/HIDDEN/PENDING) 무관 조회
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SpiritDetailResponse>> getDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                spiritService.getSpiritDetailForAdmin(id)
        ));
    }

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
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        spiritService.deleteSpirit(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PatchMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<Void>> restore(@PathVariable Long id) {
        spiritService.restoreSpirit(id);
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

    // ── 등록 요청 — 조회/수정 (PARTNER 포함) ──────────────────

    @GetMapping("/requests")
    public ResponseEntity<ApiResponse<PageResponse<SpiritRegisterRequestResponse>>> getRequests(
            @RequestParam(required = false) RequestStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(spiritService.getRegisterRequests(status, pageable))
        ));
    }

    @GetMapping("/requests/{id}")
    public ResponseEntity<ApiResponse<SpiritRegisterRequestDetailResponse>> getRequestDetail(
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                spiritService.getRegisterRequestDetail(id)
        ));
    }

    @PatchMapping("/requests/{id}")
    public ResponseEntity<ApiResponse<SpiritRegisterRequestDetailResponse>> updateRequest(
            @PathVariable Long id,
            @Valid @RequestBody SpiritRegisterRequestBody body) {
        return ResponseEntity.ok(ApiResponse.success(
                spiritService.updateRegisterRequest(id, body)
        ));
    }

    @PostMapping("/requests/{id}/images")
    public ResponseEntity<ApiResponse<SpiritRegisterRequestDetailResponse>> uploadRequestImage(
            @PathVariable Long id,
            @RequestParam MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                spiritService.uploadRequestImage(id, file)
        ));
    }

    @DeleteMapping("/requests/{id}/images")
    public ResponseEntity<ApiResponse<SpiritRegisterRequestDetailResponse>> removeRequestImage(
            @PathVariable Long id,
            @RequestParam String imageUrl) {
        return ResponseEntity.ok(ApiResponse.success(
                spiritService.removeRequestImageUrl(id, imageUrl)
        ));
    }

    // ── 등록 요청 — 승인/거절 (ADMIN 이상만) ──────────────────

    // 등록 요청 상세 화면(= 새 술 등록과 동일 폼)에서 관리자가 보완한 전체 상세로 승인
    @PostMapping("/requests/{id}/approve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<SpiritDetailResponse>> approveRequestWithDetail(
            @PathVariable Long id,
            @Valid @RequestBody CreateSpiritRequest detail,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                spiritService.approveRegisterRequestWithDetail(id, detail, userDetails.getUserId())
        ));
    }

    @PatchMapping("/requests/{id}/reject")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<Void>> rejectRequest(
            @PathVariable Long id,
            @Valid @RequestBody RejectSpiritRequestRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        spiritService.rejectRegisterRequest(id, request.rejectReason(), userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }
}
