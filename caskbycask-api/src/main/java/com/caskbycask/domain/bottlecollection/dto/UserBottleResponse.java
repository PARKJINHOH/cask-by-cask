package com.caskbycask.domain.bottlecollection.dto;

import com.caskbycask.domain.bottlecollection.entity.BottleStatus;
import com.caskbycask.domain.bottlecollection.entity.UserBottle;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record UserBottleResponse(
    Long id,
    Long spiritId,
    String spiritNameKo,
    String spiritNameEn,
    String spiritNameText,
    SpiritCategory category,
    LocalDate purchaseDate,
    String batch,
    String bottlingYear,
    Integer price,
    String store,
    BottleStatus status,
    Boolean isPublic,
    String memo,
    List<String> imageUrls,
    LocalDateTime createdAt
) {
    public static UserBottleResponse from(UserBottle b) {
        String nameKo = b.getSpirit() != null ? b.getSpirit().getNameKo() : null;
        String nameEn = b.getSpirit() != null ? b.getSpirit().getNameEn() : null;
        List<String> urls = b.getImages().stream()
            .map(img -> img.getImageUrl())
            .toList();
        return new UserBottleResponse(
            b.getId(),
            b.getSpirit() != null ? b.getSpirit().getId() : null,
            nameKo, nameEn, b.getSpiritNameText(),
            b.getCategory(), b.getPurchaseDate(), b.getBatch(), b.getBottlingYear(),
            b.getPrice(), b.getStore(), b.getStatus(), b.getIsPublic(),
            b.getMemo(), urls, b.getCreatedAt()
        );
    }
}
