package com.drinkindex.domain.spirit.dto;

import com.drinkindex.domain.spirit.entity.SpiritRegisterRequest;
import com.drinkindex.domain.spirit.entity.enums.RequestStatus;
import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record SpiritRegisterRequestDetailResponse(
        Long id,
        Long requesterId,
        String requesterNickname,
        String nameKo,
        String nameEn,
        SpiritCategory category,
        Long distilleryId,
        String distilleryNameKo,
        String bottler,
        Integer bottledYear,
        Integer vintageYear,
        BigDecimal abv,
        Integer volumeMl,
        String country,
        String region,
        List<String> imageUrls,
        RequestStatus status,
        String rejectReason,
        LocalDateTime createdAt,
        LocalDateTime reviewedAt
) {
    public static SpiritRegisterRequestDetailResponse of(
            SpiritRegisterRequest req,
            SpiritRegisterRequestBody body,
            String distilleryNameKo) {
        return new SpiritRegisterRequestDetailResponse(
                req.getId(),
                req.getUser().getId(),
                req.getUser().getNickname(),
                body.nameKo(),
                body.nameEn(),
                body.category(),
                body.distilleryId(),
                distilleryNameKo,
                body.bottler(),
                body.bottledYear(),
                body.vintageYear(),
                body.abv(),
                body.volumeMl(),
                body.country(),
                body.region(),
                body.imageUrls() != null ? body.imageUrls() : List.of(),
                req.getStatus(),
                req.getRejectReason(),
                req.getCreatedAt(),
                req.getReviewedAt()
        );
    }
}
