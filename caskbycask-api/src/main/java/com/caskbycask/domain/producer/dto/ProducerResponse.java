package com.caskbycask.domain.producer.dto;

import com.caskbycask.domain.producer.entity.Producer;
import com.caskbycask.domain.producer.entity.ProducerType;
import io.swagger.v3.oas.annotations.media.Schema;

public record ProducerResponse(
        @Schema(description = "생산자 고유 ID")
        Long id,
        @Schema(description = "생산자 종류 (DISTILLERY/WINERY/COGNAC_HOUSE/OTHER)")
        ProducerType type,
        @Schema(description = "한글 증류소명")
        String nameKo,
        @Schema(description = "영문 증류소명")
        String nameEn,
        @Schema(description = "소재 국가")
        String country,
        @Schema(description = "소재 지역")
        String region,
        @Schema(description = "기본 산지 코드(WineRegion). 복수·미매핑 산지는 null")
        String regionCode,
        @Schema(description = "공식 웹사이트 URL")
        String website,
        @Schema(description = "설립연도")
        Integer foundedYear,
        @Schema(description = "한글 소개")
        String descriptionKo,
        @Schema(description = "영문 소개")
        String descriptionEn,
        @Schema(description = "검색 별칭 (한글 음차 변형 등)")
        String searchKeywords
) {
    public static ProducerResponse from(Producer producer) {
        return new ProducerResponse(
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
                producer.getSearchKeywords()
        );
    }
}
