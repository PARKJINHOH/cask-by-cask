package com.drinkindex.admin.dto;

public record SendEmailResult(
        int successCount,
        int failCount,
        boolean isTest
) {}
