package com.caskbycask.domain.wineingest.controller;

import com.caskbycask.domain.wineingest.dto.WineIngestDtos;
import com.caskbycask.domain.wineingest.service.WineIngestService;
import com.caskbycask.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/internal/wine-ingest")
@RequiredArgsConstructor
public class WineIngestInternalController {
    private final WineIngestService service;

    @GetMapping("/config")
    public ResponseEntity<ApiResponse<WineIngestDtos.InternalConfigResponse>> config() {
        return ResponseEntity.ok(ApiResponse.success(service.internalConfig()));
    }

    @PostMapping("/runs/scheduled")
    public ResponseEntity<ApiResponse<WineIngestDtos.RunResponse>> scheduledRun() {
        return ResponseEntity.ok(ApiResponse.success(service.createScheduledRun()));
    }

    @PostMapping("/runs/claim")
    public ResponseEntity<ApiResponse<WineIngestDtos.RunResponse>> claim() {
        return ResponseEntity.ok(ApiResponse.success(service.claimNextRun()));
    }

    @PostMapping("/runs/{runKey}/heartbeat")
    public ResponseEntity<ApiResponse<WineIngestDtos.RunResponse>> heartbeat(@PathVariable String runKey) {
        return ResponseEntity.ok(ApiResponse.success(service.heartbeat(runKey)));
    }

    @PostMapping("/runs/{runKey}/items/import")
    public ResponseEntity<ApiResponse<WineIngestDtos.ItemResponse>> importWine(
            @PathVariable String runKey,
            @Valid @RequestBody WineIngestDtos.WineImportRequest request) {
        return ResponseEntity.ok(ApiResponse.success(service.importWine(runKey, request)));
    }

    @PostMapping("/runs/{runKey}/items/failure")
    public ResponseEntity<ApiResponse<WineIngestDtos.ItemResponse>> failure(
            @PathVariable String runKey,
            @Valid @RequestBody WineIngestDtos.FailureItemRequest request) {
        return ResponseEntity.ok(ApiResponse.success(service.recordFailure(runKey, request)));
    }

    @PatchMapping("/runs/{runKey}/finish")
    public ResponseEntity<ApiResponse<WineIngestDtos.RunResponse>> finish(
            @PathVariable String runKey,
            @Valid @RequestBody WineIngestDtos.FinishRunRequest request) {
        return ResponseEntity.ok(ApiResponse.success(service.finishRun(runKey, request)));
    }
}
