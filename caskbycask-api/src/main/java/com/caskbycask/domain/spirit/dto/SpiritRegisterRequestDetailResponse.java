package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.SpiritRegisterRequest;
import com.caskbycask.domain.spirit.entity.enums.RequestStatus;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.WhiskyStyle;
import com.caskbycask.domain.spirit.entity.enums.WineType;
import com.caskbycask.domain.spirit.entity.enums.CognacGrade;
import com.caskbycask.domain.spirit.entity.enums.OtherSpiritType;
import com.caskbycask.domain.spirit.entity.enums.VariantType;

import java.math.BigDecimal;
import java.time.LocalDate;
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
        Integer ageStatement,
        Boolean isNas,
        String distilledDate,
        String bottledDate,
        LocalDate releaseDate,
        WhiskyStyle whiskyStyle,
        String whiskyStyleOther,
        String caskNo,
        String whiskyNotes,
        WineType wineType,
        CognacGrade cognacGrade,
        OtherSpiritType otherType,
        List<String> imageUrls,
        String note,
        VariantType variantType,
        String variantValue,
        String variantValueEn,
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
                body.ageStatement(),
                body.isNas(),
                body.distilledDate(),
                body.bottledDate(),
                body.releaseDate(),
                body.whiskyStyle(),
                body.whiskyStyleOther(),
                body.caskNo(),
                body.whiskyNotes(),
                body.wineType(),
                body.cognacGrade(),
                body.otherType(),
                body.imageUrls() != null ? body.imageUrls() : List.of(),
                body.note(),
                body.variantType(),
                body.variantValue(),
                body.variantValueEn(),
                req.getStatus(),
                req.getRejectReason(),
                req.getCreatedAt(),
                req.getReviewedAt()
        );
    }
}
