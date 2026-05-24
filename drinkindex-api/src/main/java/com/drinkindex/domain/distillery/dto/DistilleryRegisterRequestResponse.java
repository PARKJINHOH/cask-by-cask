package com.drinkindex.domain.distillery.dto;

import com.drinkindex.domain.spirit.entity.enums.RequestStatus;

import java.time.LocalDateTime;

public record DistilleryRegisterRequestResponse(
        Long id,
        String nameKo,
        String nameEn,
        String country,
        RequestStatus status,
        String rejectReason,
        LocalDateTime createdAt,
        LocalDateTime reviewedAt
) {}
