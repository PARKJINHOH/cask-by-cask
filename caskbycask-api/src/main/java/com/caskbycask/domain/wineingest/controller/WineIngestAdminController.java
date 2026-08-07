package com.caskbycask.domain.wineingest.controller;

import com.caskbycask.domain.wineingest.dto.WineIngestDtos;
import com.caskbycask.domain.wineingest.service.WineIngestService;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/wine-ingest")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
public class WineIngestAdminController {
    private final WineIngestService service;

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<WineIngestDtos.DashboardResponse>> dashboard() {
        return ResponseEntity.ok(ApiResponse.success(service.dashboard()));
    }

    @GetMapping("/settings")
    public ResponseEntity<ApiResponse<WineIngestDtos.SettingsResponse>> settings() {
        return ResponseEntity.ok(ApiResponse.success(service.settings()));
    }

    @PutMapping("/settings")
    public ResponseEntity<ApiResponse<WineIngestDtos.SettingsResponse>> updateSettings(
            @Valid @RequestBody WineIngestDtos.SettingsUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(service.updateSettings(request)));
    }

    @GetMapping("/runs")
    public ResponseEntity<ApiResponse<PageResponse<WineIngestDtos.RunResponse>>> runs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(service.runs(page, size))));
    }

    @GetMapping("/runs/{runId}/items")
    public ResponseEntity<ApiResponse<PageResponse<WineIngestDtos.ItemResponse>>> items(
            @PathVariable Long runId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(service.items(runId, page, size))));
    }

    @PostMapping("/runs")
    public ResponseEntity<ApiResponse<WineIngestDtos.RunResponse>> createRun(
            @Valid @RequestBody WineIngestDtos.ManualRunRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(service.createManualRun(request, user.getUserId())));
    }

    @PostMapping("/runs/{runId}/cancel")
    public ResponseEntity<ApiResponse<WineIngestDtos.RunResponse>> cancel(@PathVariable Long runId) {
        return ResponseEntity.ok(ApiResponse.success(service.cancelRun(runId)));
    }

    @PostMapping("/items/{itemId}/publish")
    public ResponseEntity<ApiResponse<WineIngestDtos.ItemResponse>> publish(@PathVariable Long itemId) {
        return ResponseEntity.ok(ApiResponse.success(service.publishItem(itemId)));
    }
}
