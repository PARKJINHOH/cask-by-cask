package com.drinkindex.domain.spirit.dto;

import com.drinkindex.domain.spirit.entity.SpiritRegisterRequest;
import com.drinkindex.domain.spirit.entity.enums.RequestStatus;
import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import com.drinkindex.domain.spirit.entity.enums.WhiskyStyle;
import com.drinkindex.domain.spirit.entity.enums.WineType;
import com.drinkindex.domain.spirit.entity.enums.CognacGrade;
import com.drinkindex.domain.spirit.entity.enums.OtherSpiritType;

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
        Long producerId,
        String producerNameKo,
        String bottler,
        Integer bottledYear,
        Integer vintageYear,
        BigDecimal abv,
        Integer volumeMl,
        String country,
        String region,
        WhiskyStyle whiskyStyle,
        WineType wineType,
        CognacGrade cognacGrade,
        OtherSpiritType otherType,
        List<String> imageUrls,
        RequestStatus status,
        String rejectReason,
        LocalDateTime createdAt,
        LocalDateTime reviewedAt
) {
    public static SpiritRegisterRequestDetailResponse of(
            SpiritRegisterRequest req,
            SpiritRegisterRequestBody body,
            String producerNameKo) {
        return new SpiritRegisterRequestDetailResponse(
                req.getId(),
                req.getUser().getId(),
                req.getUser().getNickname(),
                body.nameKo(),
                body.nameEn(),
                body.category(),
                body.producerId(),
                producerNameKo,
                body.bottler(),
                body.bottledYear(),
                body.vintageYear(),
                body.abv(),
                body.volumeMl(),
                body.country(),
                body.region(),
                body.whiskyStyle(),
                body.wineType(),
                body.cognacGrade(),
                body.otherType(),
                body.imageUrls() != null ? body.imageUrls() : List.of(),
                req.getStatus(),
                req.getRejectReason(),
                req.getCreatedAt(),
                req.getReviewedAt()
        );
    }
}
