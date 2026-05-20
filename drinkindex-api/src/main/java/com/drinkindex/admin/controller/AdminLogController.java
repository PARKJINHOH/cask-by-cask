package com.drinkindex.admin.controller;

import com.drinkindex.admin.service.AdminLogService;
import com.drinkindex.domain.admin.dto.AdminLogResponse;
import com.drinkindex.domain.admin.entity.enums.AdminLogType;
import com.drinkindex.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/admin/logs")
@RequiredArgsConstructor
public class AdminLogController {

    private final AdminLogService adminLogService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<AdminLogResponse>>> getLogs(
            @RequestParam(required = false) List<AdminLogType> logTypes,
            @RequestParam(required = false) String actorEmail,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @PageableDefault(size = 30, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                adminLogService.search(logTypes, actorEmail, from, to, pageable)));
    }
}
