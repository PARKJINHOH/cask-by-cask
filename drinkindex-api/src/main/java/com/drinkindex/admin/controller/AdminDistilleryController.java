package com.drinkindex.admin.controller;

import com.drinkindex.domain.distillery.dto.*;
import com.drinkindex.domain.distillery.service.DistilleryService;
import com.drinkindex.domain.spirit.entity.enums.RequestStatus;
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

@RestController
@RequestMapping("/api/admin/distilleries")
@RequiredArgsConstructor
public class AdminDistilleryController {

    private final DistilleryService distilleryService;

    // ── 증류소 CRUD ──────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<ApiResponse<DistilleryResponse>> create(
            @Valid @RequestBody CreateDistilleryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(distilleryService.create(request)));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<DistilleryResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDistilleryRequest request) {
        return ResponseEntity.ok(ApiResponse.success(distilleryService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        distilleryService.delete(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ── 등록 요청 관리 (ADMIN 이상) ──────────────────────────────

    @GetMapping("/requests")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<Page<DistilleryRegisterRequestResponse>>> getRequests(
            @RequestParam(defaultValue = "PENDING") RequestStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                distilleryService.getDistilleryRequests(status, pageable)));
    }

    @PatchMapping("/requests/{id}/approve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<DistilleryResponse>> approveRequest(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                distilleryService.approveDistilleryRequest(id, userDetails.getUserId())));
    }

    @PatchMapping("/requests/{id}/reject")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<Void>> rejectRequest(
            @PathVariable Long id,
            @Valid @RequestBody RejectDistilleryRequestRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        distilleryService.rejectDistilleryRequest(id, request.rejectReason(), userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }
}
