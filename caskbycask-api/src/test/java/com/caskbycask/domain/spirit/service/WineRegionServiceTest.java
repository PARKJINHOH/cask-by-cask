package com.caskbycask.domain.spirit.service;

import com.caskbycask.domain.spirit.dto.WineRegionCountryResponse;
import com.caskbycask.domain.spirit.dto.WineRegionResponse;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.WineRegion;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WineRegionServiceTest {

    private final WineRegionService service = new WineRegionService();

    @Test
    @DisplayName("카탈로그는 지원 국가 트리를 반환하고 L1 아래 L2 가 children 으로 붙는다")
    void catalogReturnsCountryTree() {
        List<WineRegionCountryResponse> catalog = service.getCatalog(SpiritCategory.WINE);

        // 국가 목록은 enum 이 단일 소스다 — 국가를 추가해도 테스트가 깨지지 않게 enum 기준으로 비교
        assertThat(catalog).extracting(WineRegionCountryResponse::countryCode)
                .containsExactlyInAnyOrderElementsOf(WineRegion.countryCodes(SpiritCategory.WINE));
        assertThat(catalog).hasSizeGreaterThanOrEqualTo(6);

        WineRegionCountryResponse france = catalog.stream()
                .filter(c -> c.countryCode().equals("FR")).findFirst().orElseThrow();

        WineRegionResponse bordeaux = france.regions().stream()
                .filter(r -> r.code().equals("FR_BORDEAUX")).findFirst().orElseThrow();

        assertThat(bordeaux.nameKo()).isEqualTo("보르도");
        assertThat(bordeaux.nameEn()).isEqualTo("Bordeaux");
        assertThat(bordeaux.parentCode()).isNull();
        assertThat(bordeaux.children()).extracting(WineRegionResponse::code)
                .contains("FR_BORDEAUX_MEDOC", "FR_BORDEAUX_SAINT_EMILION");
        assertThat(bordeaux.children())
                .allSatisfy(child -> assertThat(child.parentCode()).isEqualTo("FR_BORDEAUX"));
    }

    @Test
    @DisplayName("위스키 카탈로그는 스카치 산지를 주고 와인 산지를 섞지 않는다")
    void whiskyCatalogIsSeparate() {
        List<WineRegionCountryResponse> whisky = service.getCatalog(SpiritCategory.WHISKY);

        assertThat(whisky).extracting(WineRegionCountryResponse::countryCode).contains("GB-SCT");
        WineRegionCountryResponse scotland = whisky.stream()
                .filter(c -> c.countryCode().equals("GB-SCT")).findFirst().orElseThrow();
        assertThat(scotland.regions()).extracting(WineRegionResponse::code)
                .contains("GB_SCT_ISLAY", "GB_SCT_SPEYSIDE");

        // 미국은 두 카테고리에 모두 있지만 산지는 갈린다
        WineRegionCountryResponse usWhisky = whisky.stream()
                .filter(c -> c.countryCode().equals("US")).findFirst().orElseThrow();
        assertThat(usWhisky.regions()).extracting(WineRegionResponse::code)
                .contains("US_KENTUCKY")
                .doesNotContain("US_CALIFORNIA");
    }

    @Test
    @DisplayName("카탈로그에는 L1 만 최상위로 노출된다 (L2 가 최상위로 섞이지 않는다)")
    void catalogExposesOnlyTopLevelsAtRoot() {
        assertThat(service.getCatalog(SpiritCategory.WINE))
                .flatExtracting(WineRegionCountryResponse::regions)
                .allSatisfy(region -> assertThat(region.parentCode()).isNull());
    }

    @Test
    @DisplayName("카탈로그는 매 호출마다 동일 인스턴스를 재사용한다")
    void catalogIsCached() {
        assertThat(service.getCatalog(SpiritCategory.WINE))
                .isSameAs(service.getCatalog(SpiritCategory.WINE));
    }

    @Test
    @DisplayName("resolve 는 코드를 enum 으로 변환한다")
    void resolveKnownCode() {
        assertThat(service.resolve("FR_BORDEAUX_MEDOC")).isEqualTo(WineRegion.FR_BORDEAUX_MEDOC);
    }

    @Test
    @DisplayName("resolve 는 null·공백을 산지 미지정으로 처리한다")
    void resolveBlankMeansNoRegion() {
        assertThat(service.resolve(null)).isNull();
        assertThat(service.resolve("")).isNull();
        assertThat(service.resolve("   ")).isNull();
    }

    @Test
    @DisplayName("resolve 는 카탈로그에 없는 코드를 INVALID_INPUT 으로 거부한다")
    void resolveUnknownCodeFails() {
        assertThatThrownBy(() -> service.resolve("FR_NOT_A_REGION"))
                .isInstanceOf(CustomException.class)
                .extracting(e -> ((CustomException) e).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_INPUT);
    }
}
