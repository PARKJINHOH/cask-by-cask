package com.caskbycask.domain.spirit.dto;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
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
