package com.drinkindex.domain.admin.dto;

public record DashboardKpisResponse(
        long totalUsers,
        long todayNewUsers,
        long pendingReports,
        long pendingRequests
) {}
