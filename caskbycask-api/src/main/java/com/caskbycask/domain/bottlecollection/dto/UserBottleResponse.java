package com.caskbycask.domain.bottlecollection.dto;

import com.caskbycask.domain.bottlecollection.entity.BottleStatus;
import com.caskbycask.domain.bottlecollection.entity.UserBottle;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import com.caskbycask.domain.spirit.entity.enums.WineVintageStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record UserBottleResponse(
    Long id,
    Long spiritId,
    String spiritNameKo,
    String spiritNameEn,
    Long parentId,
    VariantType variantType,
    String seriesIdentifier,
    String seriesIdentifierEn,
    String variantValue,
    String variantValueEn,
    Integer vintageYear,
    WineVintageStatus vintageStatus,
    String spiritNameText,
    SpiritCategory category,
    LocalDate purchaseDate,
    String batch,
    String bottlingYear,
    Integer price,
    String store,
    Integer volumeMl,
    BottleStatus status,
    Boolean isPublic,
    String memo,
    List<UserBottleImageResponse> images,
    List<String> imageUrls,
    LocalDateTime createdAt
) {
    public static UserBottleResponse from(UserBottle b) {
        Spirit spirit = b.getSpirit();
        Spirit parent = spirit != null ? spirit.getParent() : null;
        String nameKo = spirit != null ? spirit.getNameKo() : null;
        String nameEn = spirit != null ? spirit.getNameEn() : null;
        Long parentId = parent != null ? parent.getId() : null;
        String seriesIdentifier = firstNonBlank(
            spirit != null ? spirit.getSeriesIdentifier() : null,
            parent != null ? parent.getSeriesIdentifier() : null);
        String seriesIdentifierEn = firstNonBlank(
            spirit != null ? spirit.getSeriesIdentifierEn() : null,
            parent != null ? parent.getSeriesIdentifierEn() : null);
        List<String> urls = b.getImages().stream()
            .map(img -> img.getImageUrl())
            .toList();
        List<UserBottleImageResponse> images = b.getImages().stream()
            .map(UserBottleImageResponse::from)
            .toList();
        return new UserBottleResponse(
            b.getId(),
            spirit != null ? spirit.getId() : null,
            nameKo, nameEn, parentId,
            spirit != null ? spirit.getVariantType() : null,
            seriesIdentifier,
            seriesIdentifierEn,
            spirit != null ? spirit.getVariantValue() : null,
            spirit != null ? spirit.getVariantValueEn() : null,
            spirit != null ? spirit.getVintageYear() : null,
            spirit != null && spirit.getCategory() == SpiritCategory.WINE
                    && spirit.getWineDetail() != null
                    ? spirit.getWineDetail().getVintageStatus()
                    : null,
            b.getSpiritNameText(),
            b.getCategory(), b.getPurchaseDate(), b.getBatch(), b.getBottlingYear(),
            b.getPrice(), b.getStore(), b.getVolumeMl(), b.getStatus(), b.getIsPublic(),
            b.getMemo(), images, urls, b.getCreatedAt()
        );
    }

    private static String firstNonBlank(String primary, String fallback) {
        return primary != null && !primary.isBlank() ? primary : fallback;
    }
}
