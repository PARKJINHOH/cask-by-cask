package com.caskbycask.domain.producer.dto;

import com.caskbycask.domain.producer.entity.Producer;
import com.caskbycask.domain.producer.entity.ProducerType;

public record AdminProducerResponse(
        Long id,
        ProducerType type,
        String nameKo,
        String nameEn,
        String country,
        String region,
        String regionCode,
        String website,
        Integer foundedYear,
        String descriptionKo,
        String descriptionEn,
        String searchKeywords,
        long spiritCount
) {
    public static AdminProducerResponse of(Producer producer, long spiritCount) {
        return new AdminProducerResponse(
                producer.getId(),
                producer.getType(),
                producer.getNameKo(),
                producer.getNameEn(),
                producer.getCountry(),
                producer.getRegion(),
                producer.getRegionCode() != null ? producer.getRegionCode().getCode() : null,
                producer.getWebsite(),
                producer.getFoundedYear(),
                producer.getDescriptionKo(),
                producer.getDescriptionEn(),
                producer.getSearchKeywords(),
                spiritCount
        );
    }
}
