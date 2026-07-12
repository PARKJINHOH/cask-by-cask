package com.caskbycask.domain.tierlist.dto;

import com.caskbycask.domain.tierlist.entity.enums.TierListItemType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record TierListGuestDraftItemRequest(
        @Size(max = 60) String rowKey,
        @NotNull TierListItemType itemType,
        Long spiritId,
        Long producerId,
        @NotBlank @Size(max = 200) String displayName,
        @Size(max = 500) String imageUrl,
        Integer sortOrder,
        @Size(max = 200) String spiritVariantLabel,
        @Size(max = 200) String spiritVariantLabelEn,
        @Size(max = 500) String spiritCanonicalPathKo,
        @Size(max = 500) String spiritCanonicalPathEn
) {
}
