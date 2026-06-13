package com.caskbycask.domain.pricetracker.controller;

import com.caskbycask.domain.pricetracker.dto.request.CreatePriceReportRequest;
import com.caskbycask.domain.pricetracker.dto.request.CreatePriceReportReportRequest;
import com.caskbycask.domain.pricetracker.dto.request.UpdatePriceReportRequest;
import com.caskbycask.domain.pricetracker.dto.response.PriceReportResponse;
import com.caskbycask.domain.pricetracker.dto.response.PriceReportSummaryResponse;
import com.caskbycask.domain.pricetracker.entity.enums.PriceReportStatus;
import com.caskbycask.domain.pricetracker.service.PriceReportService;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import com.caskbycask.global.response.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/price-reports")
@RequiredArgsConstructor
public class PriceReportController {

    private final PriceReportService priceReportService;

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PriceReportResponse>> getPriceReport(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        Long callerId = userDetails != null ? userDetails.getUserId() : null;
        boolean isAdmin = userDetails != null && isAdminRole(userDetails);
        return ResponseEntity.ok(ApiResponse.success(
                priceReportService.getPriceReport(id, callerId, isAdmin)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PriceReportResponse>> createPriceReport(
            @Valid @RequestBody CreatePriceReportRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                priceReportService.createPriceReport(userDetails.getUserId(), request)));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<PriceReportResponse>> updatePriceReport(
            @PathVariable Long id,
            @Valid @RequestBody UpdatePriceReportRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                priceReportService.updatePriceReport(id, userDetails.getUserId(), request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePriceReport(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        boolean isAdmin = isAdminRole(userDetails);
        priceReportService.deletePriceReport(id, userDetails.getUserId(), isAdmin);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PostMapping("/{id}/reports")
    public ResponseEntity<ApiResponse<Void>> reportPriceReport(
            @PathVariable Long id,
            @Valid @RequestBody CreatePriceReportReportRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        priceReportService.reportPriceReport(id, userDetails.getUserId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success());
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<PageResponse<PriceReportSummaryResponse>>> getMyPriceReports(
            @RequestParam(required = false) PriceReportStatus status,
            @PageableDefault(size = 20) Pageable pageable,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                priceReportService.getMyPriceReports(userDetails.getUserId(), status, pageable)));
    }

    private boolean isAdminRole(CustomUserDetails userDetails) {
        return userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")
                        || a.getAuthority().equals("ROLE_SUPER_ADMIN"));
    }
}
