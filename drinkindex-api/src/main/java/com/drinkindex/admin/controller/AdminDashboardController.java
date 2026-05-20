package com.drinkindex.admin.controller;

import com.drinkindex.admin.service.AdminDashboardService;
import com.drinkindex.domain.admin.dto.*;
import com.drinkindex.global.response.ApiResponse;
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
}
