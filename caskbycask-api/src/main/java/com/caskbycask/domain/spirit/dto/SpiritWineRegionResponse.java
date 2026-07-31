package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.enums.WineRegion;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 주류 상세 응답에 포함되는 와인 산지 정보 — 산지 지도 렌더링용.
 *
 * <p>프론트엔드 지도 컴포넌트는 다음 규칙으로 대상을 정한다.
 * <ul>
 *   <li>국가 지도에서 하이라이트할 L1 = {@code parentCode != null ? parentCode : code}</li>
 *   <li>확대 지도에서 하이라이트할 L2 = {@code parentCode != null ? code : null}
 *       (L1 만 선택된 경우 확대 패널을 생략한다)</li>
 * </ul>
 */
@Schema(description = "와인 산지 (지도 표시용) — 산지 미지정 시 null")
public record SpiritWineRegionResponse(

        @Schema(description = "선택된 산지 코드 (L1 또는 L2)", example = "FR_BORDEAUX_MEDOC")
        String code,

        @Schema(description = "ISO 3166-1 alpha-2 국가 코드", example = "FR")
        String countryCode,

        @Schema(description = "선택된 산지명(한글)", example = "메독")
        String nameKo,

        @Schema(description = "선택된 산지명(영문)", example = "Médoc")
        String nameEn,

        @Schema(description = "상위 L1 산지 코드 — 선택값이 L1 이면 null", example = "FR_BORDEAUX")
        String parentCode,

        @Schema(description = "상위 L1 산지명(한글) — 선택값이 L1 이면 null", example = "보르도")
        String parentNameKo,

        @Schema(description = "상위 L1 산지명(영문) — 선택값이 L1 이면 null", example = "Bordeaux")
        String parentNameEn
) {

    public static SpiritWineRegionResponse from(WineRegion region) {
        if (region == null) {
            return null;
        }
        WineRegion parent = region.parent();
        return new SpiritWineRegionResponse(
                region.getCode(),
                region.getCountryCode(),
                region.getNameKo(),
                region.getNameEn(),
                parent != null ? parent.getCode() : null,
                parent != null ? parent.getNameKo() : null,
                parent != null ? parent.getNameEn() : null);
    }
}
