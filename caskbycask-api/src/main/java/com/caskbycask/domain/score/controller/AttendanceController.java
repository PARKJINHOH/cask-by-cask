package com.caskbycask.domain.score.controller;

import com.caskbycask.domain.score.dto.AttendanceResult;
import com.caskbycask.domain.score.service.AttendanceService;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService attendanceService;

    @GetMapping("/today")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Boolean>> getTodayAttendanceStatus(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        boolean attended = attendanceService.isAttendedToday(userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success(attended));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<AttendanceResult>> checkAttendance(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        AttendanceResult result = attendanceService.checkAttendance(userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/history")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<LocalDate>>> getAttendanceHistory(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        List<LocalDate> history = attendanceService.getAttendanceHistoryInLastYear(userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success(history));
    }
}
