package com.caskbycask.domain.admin.dto;

public record DashboardKpisResponse(
        long totalUsers,
        long todayNewUsers,
        long pendingReports,
        long pendingRequests
) {}
