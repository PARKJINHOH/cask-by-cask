package com.caskbycask.domain.seo.util;

import com.caskbycask.domain.spirit.entity.Spirit;
import com.caskbycask.domain.spirit.entity.SpiritWineDetail;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.VariantType;
import com.caskbycask.domain.spirit.entity.enums.WineVintageStatus;
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

    @Test
    @DisplayName("빈티지 와인은 표시명과 slug 끝에 수확 연도를 붙인다")
    void vintage_wine_appends_harvest_year() {
        Spirit spirit = wine("샤토 마고", "Chateau Margaux", 2015, WineVintageStatus.VINTAGE);

        assertThat(SpiritSlugUtils.displayNameKo(spirit)).isEqualTo("샤토 마고 2015");
        assertThat(SpiritSlugUtils.displayNameEn(spirit)).isEqualTo("Chateau Margaux 2015");
        assertThat(SpiritSlugUtils.canonicalPathKo(spirit))
                .isEqualTo("/ko/spirits/300-샤토-마고-2015");
    }

    @Test
    @DisplayName("논빈티지 와인은 표시명과 slug 끝에 NV를 붙인다")
    void non_vintage_wine_appends_nv() {
        Spirit spirit = wine("모엣 샹동 브뤼 임페리얼", "Moet Chandon Brut Imperial",
                null, WineVintageStatus.NON_VINTAGE);

        assertThat(SpiritSlugUtils.displayNameKo(spirit))
                .isEqualTo("모엣 샹동 브뤼 임페리얼 NV");
        assertThat(SpiritSlugUtils.canonicalPathEn(spirit))
                .isEqualTo("/en/spirits/300-moet-chandon-brut-imperial-nv");
        assertThat(spirit.getSearchTextKoCompact()).endsWith("nv");
    }

    @Test
    @DisplayName("이름에 같은 빈티지 접미사가 이미 있으면 중복해서 붙이지 않는다")
    void wine_name_does_not_duplicate_existing_vintage_suffix() {
        Spirit spirit = wine("샤토 마고 2015", "Chateau Margaux (2015)",
                2015, WineVintageStatus.VINTAGE);

        assertThat(SpiritSlugUtils.displayNameKo(spirit)).isEqualTo("샤토 마고 2015");
        assertThat(SpiritSlugUtils.displayNameEn(spirit)).isEqualTo("Chateau Margaux (2015)");
    }

    @Test
    @DisplayName("빈티지 정보 미상인 와인은 이름에 접미사를 붙이지 않는다")
    void unknown_vintage_wine_has_no_suffix() {
        Spirit spirit = wine("하우스 와인", "House Wine", null, WineVintageStatus.UNKNOWN);

        assertThat(SpiritSlugUtils.displayNameKo(spirit)).isEqualTo("하우스 와인");
        assertThat(SpiritSlugUtils.displayNameEn(spirit)).isEqualTo("House Wine");
    }

    @Test
    @DisplayName("국문명 임시값이 영문명과 같으면 한국어 표시명도 영문 형식 하나만 사용한다")
    void english_only_wine_uses_english_display_name_for_korean_locale() {
        Spirit spirit = Spirit.builder()
                .nameKo("Chateau Test")
                .nameEn("Chateau Test")
                .category(SpiritCategory.WINE)
                .vintageYear(2020)
                .variantType(VariantType.VINTAGE)
                .seriesIdentifier("빈티지")
                .seriesIdentifierEn("Vintage")
                .variantValue("2020")
                .variantValueEn("2020")
                .build();

        assertThat(SpiritSlugUtils.displayNameKo(spirit))
                .isEqualTo("Chateau Test Vintage 2020");
    }

    private Spirit wine(String nameKo, String nameEn,
                        Integer vintageYear, WineVintageStatus vintageStatus) {
        Spirit spirit = Spirit.builder()
                .nameKo(nameKo)
                .nameEn(nameEn)
                .category(SpiritCategory.WINE)
                .vintageYear(vintageYear)
                .variantType(VariantType.NONE)
                .build();
        SpiritWineDetail detail = SpiritWineDetail.builder()
                .spirit(spirit)
                .vintageStatus(vintageStatus)
                .build();
        ReflectionTestUtils.setField(spirit, "id", 300L);
        ReflectionTestUtils.setField(spirit, "wineDetail", detail);
        return spirit;
    }
}
