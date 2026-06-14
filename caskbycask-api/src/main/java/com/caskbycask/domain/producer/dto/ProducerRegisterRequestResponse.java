package com.caskbycask.domain.producer.dto;

import com.caskbycask.domain.producer.entity.ProducerType;
import com.caskbycask.domain.spirit.entity.enums.RequestStatus;

import java.time.LocalDateTime;

public record ProducerRegisterRequestResponse(
        Long id,
        Long requesterId,
        String requesterNickname,
        String nameKo,
        String nameEn,
        String country,
        String region,
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
