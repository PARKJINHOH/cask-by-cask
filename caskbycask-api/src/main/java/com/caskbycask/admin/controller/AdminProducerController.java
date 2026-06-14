package com.caskbycask.admin.controller;

import com.caskbycask.domain.producer.dto.*;
import com.caskbycask.domain.producer.service.ProducerService;
import com.caskbycask.domain.spirit.entity.enums.RequestStatus;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import com.caskbycask.global.response.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/producers")
@RequiredArgsConstructor
public class AdminProducerController {

    private final ProducerService producerService;

    // ── 증류소 CRUD ──────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<ApiResponse<ProducerResponse>> create(
            @Valid @RequestBody CreateProducerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(producerService.create(request)));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<ProducerResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateProducerRequest request) {
        return ResponseEntity.ok(ApiResponse.success(producerService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        producerService.delete(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ── 등록 요청 관리 (ADMIN 이상) ──────────────────────────────

    @GetMapping("/requests")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<ProducerRegisterRequestResponse>>> getRequests(
            @RequestParam(defaultValue = "PENDING") RequestStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(producerService.getProducerRequests(status, pageable))));
    }

    @GetMapping("/requests/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<ProducerRegisterRequestResponse>> getRequestDetail(
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                producerService.getProducerRequestDetail(id)));
    }

    @PatchMapping("/requests/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<ProducerRegisterRequestResponse>> updateRequest(
            @PathVariable Long id,
            @Valid @RequestBody ProducerRegisterRequestBody body) {
        return ResponseEntity.ok(ApiResponse.success(
                producerService.updateProducerRequest(id, body)));
    }

    @PatchMapping("/requests/{id}/approve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<ProducerResponse>> approveRequest(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                producerService.approveProducerRequest(id, userDetails.getUserId())));
    }

    @PatchMapping("/requests/{id}/reject")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<Void>> rejectRequest(
            @PathVariable Long id,
            @Valid @RequestBody RejectProducerRequestRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        producerService.rejectProducerRequest(id, request.rejectReason(), userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }
}
