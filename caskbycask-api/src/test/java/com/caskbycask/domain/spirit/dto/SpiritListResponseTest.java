package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.SpiritWineDetail;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import com.caskbycask.domain.spirit.entity.enums.WineVintageStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class SpiritListResponseTest {

    @Test
    @DisplayName("목록 표시용 시리즈 식별자는 대표 하위 에디션 값을 fallback으로 사용한다")
    void listSeriesIdentifierFallsBackToCanonicalVariant() {
        Spirit master = spirit(1L);
        Spirit canonicalVariant = spirit(2L);
        ReflectionTestUtils.setField(canonicalVariant, "parent", master);
        ReflectionTestUtils.setField(canonicalVariant, "variantType", VariantType.BATCH);
        ReflectionTestUtils.setField(canonicalVariant, "seriesIdentifier", "캐스크 스트렝스");
        ReflectionTestUtils.setField(canonicalVariant, "seriesIdentifierEn", "Cask Strength");
        ReflectionTestUtils.setField(canonicalVariant, "variantValue", "Batch 1");

        SpiritListResponse response = SpiritListResponse.of(master, null, canonicalVariant);

        assertThat(response.seriesIdentifier()).isEqualTo("캐스크 스트렝스");
        assertThat(response.seriesIdentifierEn()).isEqualTo("Cask Strength");
    }

    @Test
    @DisplayName("와인 목록 응답은 단일 원본 빈티지 연도와 상태를 제공한다")
    void wineListContainsVintageYearAndStatus() {
        Spirit wine = Spirit.builder()
                .nameKo("샤토 마고")
                .nameEn("Chateau Margaux")
                .category(SpiritCategory.WINE)
                .vintageYear(2015)
                .status(SpiritStatus.ACTIVE)
                .build();
        SpiritWineDetail detail = SpiritWineDetail.builder()
                .spirit(wine)
                .vintageStatus(WineVintageStatus.VINTAGE)
                .build();
        ReflectionTestUtils.setField(wine, "id", 3L);
        ReflectionTestUtils.setField(wine, "wineDetail", detail);

        SpiritListResponse response = SpiritListResponse.of(wine, null);

        assertThat(response.vintageYear()).isEqualTo(2015);
        assertThat(response.vintageStatus()).isEqualTo(WineVintageStatus.VINTAGE);
        assertThat(response.canonicalPathKo()).endsWith("샤토-마고-2015");
    }

    private Spirit spirit(Long id) {
        Spirit spirit = Spirit.builder()
                .nameKo("레드 브레스트 12년")
                .nameEn("Redbreast 12")
                .category(SpiritCategory.WHISKY)
                .status(SpiritStatus.ACTIVE)
                .build();
        ReflectionTestUtils.setField(spirit, "id", id);
        return spirit;
    }
}
