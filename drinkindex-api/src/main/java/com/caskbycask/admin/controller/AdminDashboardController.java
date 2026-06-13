package com.caskbycask.admin.controller;

import com.caskbycask.admin.service.AdminDashboardService;
import com.caskbycask.domain.admin.dto.*;
import com.caskbycask.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    @GetMapping("/kpis")
    public ResponseEntity<ApiResponse<DashboardKpisResponse>> getKpis() {
        return ResponseEntity.ok(ApiResponse.success(adminDashboardService.getKpis()));
    }

    @GetMapping("/user-trend")
    public ResponseEntity<ApiResponse<List<DashboardDailyStatResponse>>> getUserTrend(
            @RequestParam(defaultValue = "30") int period) {
        return ResponseEntity.ok(ApiResponse.success(adminDashboardService.getUserTrend(period)));
    }

    @GetMapping("/category-stats")
    public ResponseEntity<ApiResponse<List<DashboardCategoryStatResponse>>> getCategoryStats() {
        return ResponseEntity.ok(ApiResponse.success(adminDashboardService.getCategoryStats()));
    }

    @GetMapping("/review-trend")
    public ResponseEntity<ApiResponse<List<DashboardDailyStatResponse>>> getReviewTrend(
            @RequestParam(defaultValue = "30") int period) {
        return ResponseEntity.ok(ApiResponse.success(adminDashboardService.getReviewTrend(period)));
    }

    @GetMapping("/report-stats")
    public ResponseEntity<ApiResponse<List<DashboardReportStatResponse>>> getReportStats() {
        return ResponseEntity.ok(ApiResponse.success(adminDashboardService.getReportStats()));
    }

    // [패치 12] 통합 모더레이션 대시보드 — 처리 대기 큐 집계
    @GetMapping("/pending-counts")
    public ResponseEntity<ApiResponse<DashboardPendingCountsResponse>> getPendingCounts() {
        return ResponseEntity.ok(ApiResponse.success(adminDashboardService.getPendingCounts()));
    }
}
