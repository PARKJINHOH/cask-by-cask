package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.SpiritRegisterRequest;
import com.caskbycask.domain.spirit.entity.enums.RequestStatus;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.WhiskyCaskType;
import com.caskbycask.domain.spirit.entity.enums.WhiskyStyle;
import com.caskbycask.domain.spirit.entity.enums.WineType;
import com.caskbycask.domain.spirit.entity.enums.CognacGrade;
import com.caskbycask.domain.spirit.entity.enums.OtherSpiritType;
import com.caskbycask.domain.spirit.entity.enums.VariantType;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public record SpiritRegisterRequestDetailResponse(
        Long id,
        Long requesterId,
        String requesterNickname,
        String nameKo,
        String nameEn,
        SpiritCategory category,
        Long producerId,
        String producerNameKo,
        Integer vintageYear,
        BigDecimal abv,
        Integer volumeMl,
        BigDecimal abvMin,
        BigDecimal abvMax,
        Integer volumeMlMin,
        Integer volumeMlMax,
        String country,
        String region,
        String regionCode,
        Integer ageStatement,
        Integer ageStatementMonths,
        Boolean isNas,
        String distilledDate,
        String bottledDate,
        String bottleNo,
        Integer totalBottles,
        WhiskyStyle whiskyStyle,
        String whiskyStyleOther,
        String brandName,
        String bottlingType,
        String caskNo,
        String whiskyNotes,
        List<WhiskyCaskType> caskTypes,
        List<WhiskyCaskType> caskFinishes,
        String caskTypeOther,
        Map<WhiskyCaskType, List<String>> caskDetails,
        Boolean isNonChillFiltered,
        Boolean isNaturalColour,
        Boolean isSingleCask,
        Boolean isCaskStrength,
        Boolean isPeated,
        BigDecimal phenolPpm,
        BigDecimal phenolPpmMin,
        BigDecimal phenolPpmMax,
        WineType wineType,
        CognacGrade cognacGrade,
        OtherSpiritType otherType,
        WineDetailRequest wineDetail,
        CognacDetailRequest cognacDetail,
        OtherDetailRequest otherDetail,
        List<String> imageUrls,
        String note,
        VariantType variantType,
        String variantValue,
        String variantValueEn,
        String seriesIdentifier,
        String seriesIdentifierEn,
        RequestStatus status,
        String rejectReason,
        LocalDateTime createdAt,
        LocalDateTime reviewedAt,
        TargetSpirit targetSpirit
) {
    /**
     * 이 요청을 붙일 기존 주류 — 없으면 null(새 마스터를 만드는 보통의 요청).
     *
     * <p>이름을 같이 내려주는 이유는 관리자 검토 화면이 id 만 보고는 무엇에 붙는 요청인지
     * 알 수 없기 때문이다(생산자 이름을 풀어주는 것과 같은 이유).
     */
    public record TargetSpirit(Long id, String nameKo, String nameEn) {}

    public static SpiritRegisterRequestDetailResponse of(
            SpiritRegisterRequest req,
            SpiritRegisterRequestBody body,
            String producerNameKo,
            TargetSpirit targetSpirit) {
        return new SpiritRegisterRequestDetailResponse(
                req.getId(),
                req.getUser().getId(),
                req.getUser().getNickname(),
                body.nameKo(),
                body.nameEn(),
                body.category(),
                body.producerId(),
                producerNameKo,
                body.vintageYear(),
                body.abv(),
                body.volumeMl(),
                body.abvMin(),
                body.abvMax(),
                body.volumeMlMin(),
                body.volumeMlMax(),
                body.country(),
                body.region(),
                body.regionCode(),
                body.ageStatement(),
                body.ageStatementMonths(),
                body.isNas(),
                body.distilledDate(),
                body.bottledDate(),
                body.bottleNo(),
                body.totalBottles(),
                body.whiskyStyle(),
                body.whiskyStyleOther(),
                body.brandName(),
                body.bottlingType(),
                body.caskNo(),
                body.whiskyNotes(),
                body.caskTypes() != null ? body.caskTypes() : List.of(),
                body.caskFinishes() != null ? body.caskFinishes() : List.of(),
                body.caskTypeOther(),
                body.caskDetails() != null ? body.caskDetails() : Map.of(),
                body.isNonChillFiltered(),
                body.isNaturalColour(),
                body.isSingleCask(),
                body.isCaskStrength(),
                body.isPeated(),
                body.phenolPpm(),
                body.phenolPpmMin(),
                body.phenolPpmMax(),
                body.wineType(),
                body.cognacGrade(),
                body.otherType(),
                body.wineDetail(),
                body.cognacDetail(),
                body.otherDetail(),
                body.imageUrls() != null ? body.imageUrls() : List.of(),
                body.note(),
                body.variantType(),
                body.variantValue(),
                body.variantValueEn(),
                body.seriesIdentifier(),
                body.seriesIdentifierEn(),
                req.getStatus(),
                req.getRejectReason(),
                req.getCreatedAt(),
                req.getReviewedAt(),
                targetSpirit
        );
    }
}
