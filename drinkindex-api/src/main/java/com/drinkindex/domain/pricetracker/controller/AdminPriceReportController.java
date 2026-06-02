package com.drinkindex.domain.pricetracker.controller;

import com.drinkindex.domain.pricetracker.dto.request.ApprovePriceReportRequest;
import com.drinkindex.domain.pricetracker.dto.request.RejectPriceReportRequest;
import com.drinkindex.domain.pricetracker.dto.response.AdminPriceReportResponse;
import com.drinkindex.domain.pricetracker.dto.response.AdminPriceReportReportResponse;
import com.drinkindex.domain.pricetracker.entity.enums.PriceReportReportStatus;
import com.drinkindex.domain.pricetracker.entity.enums.PriceReportStatus;
import com.drinkindex.domain.pricetracker.service.AdminPriceReportService;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.response.ApiResponse;
import com.drinkindex.global.response.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/price-reports")
@RequiredArgsConstructor
public class AdminPriceReportController {

    private final AdminPriceReportService adminPriceReportService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AdminPriceReportResponse>>> getPriceReports(
            @RequestParam(required = false) PriceReportStatus status,
            @RequestParam(required = false) Boolean isFlagged,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                adminPriceReportService.getPriceReports(status, isFlagged, pageable)));
    }

    @PatchMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<AdminPriceReportResponse>> approvePriceReport(
            @PathVariable Long id,
            @RequestBody(required = false) ApprovePriceReportRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                adminPriceReportService.approvePriceReport(id, userDetails.getUserId(), request)));
    }

    @PatchMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<AdminPriceReportResponse>> rejectPriceReport(
            @PathVariable Long id,
            @Valid @RequestBody RejectPriceReportRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                adminPriceReportService.rejectPriceReport(id, userDetails.getUserId(), request)));
    }

    @GetMapping("/reports")
    public ResponseEntity<ApiResponse<PageResponse<AdminPriceReportReportResponse>>> getReports(
            @RequestParam(required = false) PriceReportReportStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                adminPriceReportService.getReports(status, pageable)));
    }

    @PatchMapping("/reports/{id}/resolve")
    public ResponseEntity<ApiResponse<Void>> resolveReport(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        adminPriceReportService.resolveReport(id, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PatchMapping("/reports/{id}/dismiss")
    public ResponseEntity<ApiResponse<Void>> dismissReport(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        adminPriceReportService.dismissReport(id, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }
}
