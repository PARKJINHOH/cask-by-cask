package com.caskbycask.domain.seo.util;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class SpiritSlugUtilsTest {

    @Test
    @DisplayName("일반 주류는 이름만 slug에 사용한다")
    void slug_normal_spirit_uses_name_only() {
        Spirit spirit = Spirit.builder()
                .nameKo("더 글렌드로낙 12년")
                .nameEn("The Glendronach 12 Year Old")
                .category(SpiritCategory.WHISKY)
                .variantType(VariantType.NONE)
                .build();
        ReflectionTestUtils.setField(spirit, "id", 176L);

        assertThat(SpiritSlugUtils.canonicalPathKo(spirit))
                .isEqualTo("/ko/spirits/176-더-글렌드로낙-12년");
        assertThat(SpiritSlugUtils.canonicalPathEn(spirit))
                .isEqualTo("/en/spirits/176-the-glendronach-12-year-old");
    }

    @Test
    @DisplayName("에디션 주류는 이름, 시리즈 식별자, 식별 값을 순서대로 slug에 사용한다")
    void slug_edition_uses_name_series_identifier_and_variant_value() {
        Spirit spirit = Spirit.builder()
                .nameKo("더 글렌드로낙")
                .nameEn("The Glendronach")
                .category(SpiritCategory.WHISKY)
                .variantType(VariantType.BATCH)
                .seriesIdentifier("올로로소 12년 1L")
                .seriesIdentifierEn("Oloroso 12 Year Old 1L")
                .variantValue("스페셜 릴리즈")
                .variantValueEn("Special Release")
                .build();
        ReflectionTestUtils.setField(spirit, "id", 176L);

        assertThat(SpiritSlugUtils.canonicalPathKo(spirit))
                .isEqualTo("/ko/spirits/176-더-글렌드로낙-올로로소-12년-1l-스페셜-릴리즈");
        assertThat(SpiritSlugUtils.canonicalPathEn(spirit))
                .isEqualTo("/en/spirits/176-the-glendronach-oloroso-12-year-old-1l-special-release");
    }

    @Test
    @DisplayName("영문 시리즈 식별자나 식별 값이 없으면 한글 값을 fallback으로 사용한다")
    void slug_edition_without_variant_value_uses_series_identifier() {
        Spirit spirit = Spirit.builder()
                .nameKo("카발란 솔리스트")
                .nameEn("Kavalan Solist")
                .category(SpiritCategory.WHISKY)
                .variantType(VariantType.SINGLE_CASK)
                .seriesIdentifier("콜헤이타 포트 싱글 캐스크 스트렝스")
                .seriesIdentifierEn("Colheita Port Single Cask Strength")
                .build();
        ReflectionTestUtils.setField(spirit, "id", 199L);

        assertThat(SpiritSlugUtils.canonicalPathKo(spirit))
                .isEqualTo("/ko/spirits/199-카발란-솔리스트-콜헤이타-포트-싱글-캐스크-스트렝스");
        assertThat(SpiritSlugUtils.canonicalPathEn(spirit))
                .isEqualTo("/en/spirits/199-kavalan-solist-colheita-port-single-cask-strength");
    }

    @Test
    @DisplayName("edition English slug falls back to Korean series and variant")
    void slug_english_falls_back_to_korean_series_and_variant() {
        Spirit spirit = Spirit.builder()
                .nameKo("더 글렌드로낙")
                .nameEn("The Glendronach")
                .category(SpiritCategory.WHISKY)
                .variantType(VariantType.SINGLE_CASK)
                .seriesIdentifier("싱글 캐스크")
                .variantValue("캐스크 123")
                .build();
        ReflectionTestUtils.setField(spirit, "id", 177L);

        assertThat(SpiritSlugUtils.canonicalPathEn(spirit))
                .isEqualTo("/en/spirits/177-the-glendronach-싱글-캐스크-캐스크-123");
    }
}
