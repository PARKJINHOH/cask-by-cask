package com.caskbycask.domain.producer.dto;

import com.caskbycask.domain.producer.entity.Producer;
import com.caskbycask.domain.producer.entity.ProducerType;
import com.caskbycask.domain.spirit.dto.SpiritWineRegionResponse;

import java.util.List;

public record AdminProducerResponse(
        Long id,
        ProducerType type,
        String nameKo,
        String nameEn,
        String country,
        String region,
        String regionCode,
        /** 산지 코드를 풀어놓은 형태 — 관리자 목록의 세부 산지 표기용. 산지 미지정 시 null */
        SpiritWineRegionResponse wineRegion,
        String website,
        /** 로고 이미지 목록(최대 5장, sortOrder 순) — 0번이 대표 */
        List<ProducerLogoResponse> logoImages,
        Integer foundedYear,
        String descriptionKo,
        String descriptionEn,
        String searchKeywords,
        long spiritCount
) {
    public static AdminProducerResponse of(
            Producer producer, long spiritCount, List<ProducerLogoResponse> logoImages) {
        return new AdminProducerResponse(
                producer.getId(),
                producer.getType(),
                producer.getNameKo(),
                producer.getNameEn(),
                producer.getCountry(),
                producer.getRegion(),
                producer.getRegionCode() != null ? producer.getRegionCode().getCode() : null,
                SpiritWineRegionResponse.from(producer.getRegionCode()),
                producer.getWebsite(),
                logoImages,
                producer.getFoundedYear(),
                producer.getDescriptionKo(),
                producer.getDescriptionEn(),
                producer.getSearchKeywords(),
                spiritCount
        );
    }
}
