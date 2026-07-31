package com.caskbycask.domain.tierlist.dto;

import com.caskbycask.domain.seo.util.SpiritSlugUtils;
import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.tierlist.entity.TierListItem;
import com.caskbycask.domain.tierlist.entity.enums.TierListItemType;
import org.springframework.util.StringUtils;

public record TierListItemResponse(
        Long id,
        String rowKey,
        TierListItemType itemType,
        Long spiritId,
        Long producerId,
        String displayName,
        String imageUrl,
        Integer sortOrder,
        String spiritVariantLabel,
        String spiritVariantLabelEn,
        String spiritCanonicalPathKo,
        String spiritCanonicalPathEn
) {
    public static TierListItemResponse from(TierListItem item) {
        Spirit spirit = item.getSpirit();
        return new TierListItemResponse(
                item.getId(),
                item.getRow() != null ? String.valueOf(item.getRow().getId()) : null,
                item.getItemType(),
                spirit != null ? spirit.getId() : null,
                item.getProducer() != null ? item.getProducer().getId() : null,
                item.getDisplayName(),
                item.getImageUrl(),
                item.getSortOrder(),
                variantLabelKo(spirit),
                variantLabelEn(spirit),
                spirit != null ? SpiritSlugUtils.canonicalPathKo(spirit) : null,
                spirit != null ? SpiritSlugUtils.canonicalPathEn(spirit) : null
        );
    }

    private static String variantLabelKo(Spirit spirit) {
        if (spirit == null) {
            return null;
        }
        if (StringUtils.hasText(spirit.getVariantValue())) {
            return spirit.getVariantValue();
        }
        if (spirit.getCommonDetail() != null && StringUtils.hasText(spirit.getCommonDetail().getBatchNo())) {
            return "Batch " + spirit.getCommonDetail().getBatchNo();
        }
        return null;
    }

    private static String variantLabelEn(Spirit spirit) {
        if (spirit == null) {
            return null;
        }
        if (StringUtils.hasText(spirit.getVariantValueEn())) {
            return spirit.getVariantValueEn();
        }
        return variantLabelKo(spirit);
    }
}
