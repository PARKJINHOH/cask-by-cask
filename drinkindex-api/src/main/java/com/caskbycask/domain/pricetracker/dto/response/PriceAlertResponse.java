package com.caskbycask.domain.pricetracker.dto.response;

import com.caskbycask.domain.pricetracker.entity.PriceAlert;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PriceAlertResponse(
        Long id,
        Long spiritId,
        String spiritNameKo,
        String spiritNameEn,
        BigDecimal targetPriceKrw,
        Boolean isActive,
        LocalDateTime lastNotifiedAt,
        LocalDateTime createdAt
) {
    public static PriceAlertResponse from(PriceAlert alert) {
        return new PriceAlertResponse(
                alert.getId(),
                alert.getSpirit().getId(),
                alert.getSpirit().getNameKo(),
                alert.getSpirit().getNameEn(),
                alert.getTargetPriceKrw(),
                alert.getIsActive(),
                alert.getLastNotifiedAt(),
                alert.getCreatedAt()
        );
    }
}
