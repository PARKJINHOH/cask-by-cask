package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.enums.WineRegion;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "와인 산지 (L1 대산지 / children = L2 세부산지)")
public record WineRegionResponse(
        @Schema(description = "산지 코드 — spirit.regionCode 에 저장되는 값", example = "FR_BORDEAUX")
        String code,

        @Schema(description = "ISO 3166-1 alpha-2 국가 코드", example = "FR")
        String countryCode,

        @Schema(description = "산지명(한글)", example = "보르도")
        String nameKo,

        @Schema(description = "산지명(영문)", example = "Bordeaux")
        String nameEn,

        @Schema(description = "상위 L1 코드 — L1 자신은 null", example = "null")
        String parentCode,

        @Schema(description = "하위 L2 목록 — L2 는 빈 배열")
        List<WineRegionResponse> children
) {

    /** L2 를 children 으로 포함한 L1 노드 */
    public static WineRegionResponse tree(WineRegion region) {
        return new WineRegionResponse(
                region.getCode(),
                region.getCountryCode(),
                region.getNameKo(),
                region.getNameEn(),
                region.getParentCode(),
                region.children().stream().map(WineRegionResponse::leaf).toList());
    }

    /** children 없는 단일 노드 */
    public static WineRegionResponse leaf(WineRegion region) {
        return new WineRegionResponse(
                region.getCode(),
                region.getCountryCode(),
                region.getNameKo(),
                region.getNameEn(),
                region.getParentCode(),
                List.of());
    }
}
