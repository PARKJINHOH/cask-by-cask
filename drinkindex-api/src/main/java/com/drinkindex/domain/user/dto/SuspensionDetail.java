package com.drinkindex.domain.user.dto;

import java.time.LocalDateTime;

public record SuspensionDetail(
        LocalDateTime suspendedUntil,
        String reason
) {}
