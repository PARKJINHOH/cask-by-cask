package com.caskbycask.domain.admin.dto;

public record DashboardDailyStatResponse(
        String date,
        long count,
        long cumulativeCount
) {}
