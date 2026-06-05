package com.drinkindex.domain.producer.dto;

import com.drinkindex.domain.producer.entity.ProducerType;
import com.drinkindex.domain.spirit.entity.enums.RequestStatus;

import java.time.LocalDateTime;

public record ProducerRegisterRequestResponse(
        Long id,
        String nameKo,
        String nameEn,
        String country,
        ProducerType type,
        RequestStatus status,
        String rejectReason,
        LocalDateTime createdAt,
        LocalDateTime reviewedAt,
        String website,
        Integer foundedYear,
        String descriptionKo,
        String descriptionEn
) {}
