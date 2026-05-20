package com.drinkindex.domain.admin.dto;

public record DashboardDailyStatResponse(
        String date,
        long count
) {}
