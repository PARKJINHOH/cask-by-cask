package com.caskbycask.domain.seo.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

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
        LocalDateTime updatedAt,
        String relationType,
        RelatedSpirit parent,
        List<RelatedSpirit> editions,
        PriceObservation recentPrice,
        PriceObservation recentHotDeal
) {
    public record RelatedSpirit(
            Long id,
            String nameKo,
            String nameEn,
            String canonicalPathKo,
            String canonicalPathEn
    ) {
    }

    /**
     * 검색용 서버 렌더링 본문에만 사용하는 최근 확인 정보다.
     * 현재 판매가를 뜻하지 않으며 Product Offer 구조화 데이터로 변환하지 않는다.
     */
    public record PriceObservation(
            BigDecimal amount,
            String currency,
            String sourceName,
            LocalDate observedDate,
            String sourceUrl
    ) {
    }
}
