package com.drinkindex.domain.spirit.dto;

import com.drinkindex.domain.spirit.entity.enums.RequestStatus;
import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;

import java.time.LocalDateTime;

public record SpiritRegisterRequestResponse(
        Long id,
        String nameKo,
        String nameEn,
        SpiritCategory category,
        RequestStatus status,
        String rejectReason,
        LocalDateTime createdAt,
        LocalDateTime reviewedAt
) {}
