package com.drinkindex.admin.controller;

import com.drinkindex.domain.report.dto.ReportResponse;
import com.drinkindex.domain.report.entity.enums.ReportStatus;
import com.drinkindex.domain.report.entity.enums.ReportTargetType;
import com.drinkindex.domain.report.service.ReportService;
import com.drinkindex.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/reports")
@RequiredArgsConstructor
public class AdminReportController {

    private final ReportService reportService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ReportResponse>>> getReports(
            @RequestParam(required = false) ReportStatus status,
            @RequestParam(required = false) ReportTargetType targetType,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                reportService.getReports(status, targetType, pageable)));
    }

    @PatchMapping("/{id}/resolve")
    public ResponseEntity<ApiResponse<Void>> resolve(@PathVariable Long id) {
        reportService.resolveReport(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PatchMapping("/{id}/dismiss")
    public ResponseEntity<ApiResponse<Void>> dismiss(@PathVariable Long id) {
        reportService.dismissReport(id);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
