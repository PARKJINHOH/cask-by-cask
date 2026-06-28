package com.caskbycask.domain.seo.dto;

import java.time.LocalDateTime;

public record SpiritSeoResponse(
        Long canonicalId,
        String canonicalPathKo,
        String canonicalPathEn,
        String canonicalUrlKo,
        String canonicalUrlEn,
        String titleKo,
        String titleEn,
        String descriptionKo,
        String descriptionEn,
        String primaryImageUrl,
        LocalDateTime updatedAt
) {
}
