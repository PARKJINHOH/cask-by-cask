package com.caskbycask.admin.controller;

import com.caskbycask.domain.report.dto.ReportResponse;
import com.caskbycask.domain.report.entity.enums.ReportStatus;
import com.caskbycask.domain.report.entity.enums.ReportTargetType;
import com.caskbycask.domain.report.service.ReportService;
import com.caskbycask.global.response.ApiResponse;
import com.caskbycask.global.response.PageResponse;
import lombok.RequiredArgsConstructor;
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
    public ResponseEntity<ApiResponse<PageResponse<ReportResponse>>> getReports(
            @RequestParam(required = false) ReportStatus status,
            @RequestParam(required = false) ReportTargetType targetType,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(reportService.getReports(status, targetType, pageable))));
    }

    @GetMapping("/pending-count")
    public ResponseEntity<ApiResponse<Long>> pendingCount() {
        return ResponseEntity.ok(ApiResponse.success(reportService.countPending()));
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
