package com.caskbycask.admin.dto;

public record SendEmailResult(
        int successCount,
        int failCount,
        boolean isTest
) {}
