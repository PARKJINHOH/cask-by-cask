package com.caskbycask.domain.venue.entity;

import com.caskbycask.domain.venue.entity.enums.VenueStatus;
import com.caskbycask.domain.venue.entity.enums.VenueType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 좌표 유효성 — 지도에 그릴 수 있는 값인지의 단일 판정 지점.
 *
 * <p>파서·지오코더가 실패했을 때 흔히 남기는 값이 {@code 0} 이라, 0,0 을 유효한 좌표로 받으면
 * 기니만 앞바다에 마커가 찍힌다. 그 회귀를 여기서 고정한다.
 */
class VenueCoordinateTest {

    @ParameterizedTest(name = "[{index}] {0}, {1} → 그릴 수 없다")
    @CsvSource({
            "0,      0",         // 파싱·지오코딩 실패의 흔한 잔재
            "0.0,    0.0",
            "91,     127",       // 위도 범위 밖
            "-90.1,  127",
            "37.5,   180.1",     // 경도 범위 밖
            "37.5,   -180.1",
    })
    @DisplayName("범위 밖이거나 0,0 인 좌표는 그릴 수 없다")
    void rejectsUnplottable(String lat, String lng) {
        assertThat(Venue.isPlottable(new BigDecimal(lat), new BigDecimal(lng))).isFalse();
    }

    @ParameterizedTest(name = "[{index}] {0}, {1} → 그릴 수 있다")
    @CsvSource({
            "37.5665000,  126.9780000",  // 서울
            "34.6937000,  135.5023000",  // 오사카
            "-33.8688,    151.2093",     // 남반구
            "90,          180",          // 경계값 포함
            "-90,         -180",
    })
    @DisplayName("유효 범위 안의 좌표는 그릴 수 있다")
    void acceptsPlottable(String lat, String lng) {
        assertThat(Venue.isPlottable(new BigDecimal(lat), new BigDecimal(lng))).isTrue();
    }

    @Test
    @DisplayName("좌표가 없으면 그릴 수 없고 ACTIVE 로도 올릴 수 없다")
    void nullCoordinatesCannotBeActivated() {
        Venue venue = venueWithCoordinates(null, null);

        assertThat(venue.hasPlottableCoordinates()).isFalse();
        assertThat(venue.canBeActive()).isFalse();
        assertThat(venue.isMappable()).isFalse();
    }

    @Test
    @DisplayName("ACTIVE 라도 좌표가 없으면 마커로 나가지 않는다")
    void activeWithoutCoordinatesIsNotMappable() {
        Venue venue = venueWithCoordinates(null, null);
        venue.changeStatus(VenueStatus.ACTIVE);

        assertThat(venue.isMappable()).isFalse();
    }

    @Test
    @DisplayName("폐업은 좌표가 있어도 마커에서 빠진다 — 문서 페이지만 살린다")
    void closedIsNotMappable() {
        Venue venue = venueWithCoordinates(new BigDecimal("37.5665"), new BigDecimal("126.9780"));
        venue.changeStatus(VenueStatus.CLOSED);

        assertThat(venue.hasPlottableCoordinates()).isTrue();
        assertThat(venue.isMappable()).isFalse();
    }

    @Test
    @DisplayName("도시를 바꾸면 비정규화해 둔 국가 코드도 따라간다")
    void changingCityCarriesCountryCode() {
        Venue venue = venueWithCoordinates(new BigDecimal("37.5665"), new BigDecimal("126.9780"));
        assertThat(venue.getCountryCode()).isEqualTo("kr");

        venue.changeCity(VenueCity.builder()
                .countryCode("jp").slug("osaka").nameKo("오사카").nameEn("Osaka")
                .centerLat(new BigDecimal("34.6937000")).centerLng(new BigDecimal("135.5023000"))
                .build());

        assertThat(venue.getCountryCode()).isEqualTo("jp");
    }

    private Venue venueWithCoordinates(BigDecimal lat, BigDecimal lng) {
        VenueCity seoul = VenueCity.builder()
                .countryCode("kr").slug("seoul").nameKo("서울").nameEn("Seoul")
                .centerLat(new BigDecimal("37.5665000")).centerLng(new BigDecimal("126.9780000"))
                .build();
        return Venue.builder()
                .city(seoul).countryCode(seoul.getCountryCode())
                .venueType(VenueType.BAR)
                .nameKo("테스트 바").address("서울시 강남구")
                .lat(lat).lng(lng)
                .build();
    }
}
