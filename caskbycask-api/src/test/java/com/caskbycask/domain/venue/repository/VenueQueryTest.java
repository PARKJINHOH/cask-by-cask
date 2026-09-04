package com.caskbycask.domain.venue.repository;

import com.caskbycask.domain.venue.dto.VenueCityDetailResponse;
import com.caskbycask.domain.venue.dto.VenueCityResponse;
import com.caskbycask.domain.venue.dto.VenueCountryResponse;
import com.caskbycask.domain.venue.dto.VenueSummaryResponse;
import com.caskbycask.domain.venue.entity.Venue;
import com.caskbycask.domain.venue.entity.VenueCity;
import com.caskbycask.domain.venue.entity.enums.VenueStatus;
import com.caskbycask.domain.venue.entity.enums.VenueType;
import com.caskbycask.domain.venue.service.VenueService;
import com.caskbycask.global.config.JpaAuditingConfig;
import com.caskbycask.global.config.QuerydslConfig;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 장소 공개 조회 — JPQL 이 실제로 파싱되는지와, 비공개 장소가 어느 경로로도 새지 않는지.
 *
 * <p>서비스를 직접 조립해 실제 쿼리를 태운다. 목으로 대체하면 이 클래스가 지키려는 것
 * (fetch join·집계·상태 필터가 실제 DB 에서 도는지)이 통째로 검증되지 않는다.
 */
@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({QuerydslConfig.class, JpaAuditingConfig.class})
class VenueQueryTest {

    @Autowired
    private VenueRepository venueRepository;
    @Autowired
    private VenueCityRepository venueCityRepository;

    private VenueService venueService;
    private VenueCity seoul;
    private VenueCity osaka;

    @BeforeEach
    void setUp() {
        venueService = new VenueService(venueRepository, venueCityRepository);

        seoul = venueCityRepository.save(city("kr", "seoul", "서울", "Seoul", "37.5665000", "126.9780000", 10));
        osaka = venueCityRepository.save(city("jp", "osaka", "오사카", "Osaka", "34.6937000", "135.5023000", 20));
        // 장소가 한 곳도 없는 도시 — 공개 목록에서 빠져야 한다.
        venueCityRepository.save(city("jp", "kyoto", "교토", "Kyoto", "35.0116000", "135.7681000", 30));

        venueRepository.save(venue(seoul, "강남 몰트바", VenueType.BAR, VenueStatus.ACTIVE,
                "서울시 강남구 테헤란로 1", "37.4979000", "127.0276000"));
        venueRepository.save(venue(seoul, "폐업한 바", VenueType.BAR, VenueStatus.CLOSED,
                "서울시 마포구 2", "37.5563000", "126.9236000"));
        venueRepository.save(venue(seoul, "비공개 바", VenueType.BAR, VenueStatus.HIDDEN,
                "서울시 종로구 3", "37.5729000", "126.9794000"));
        venueRepository.save(venueWithNames(osaka, "바 나유타", "Bar Nayuta", "バー ナユタ",
                "大阪市 北区 4", "34.7025000", "135.4959000"));
    }

    // ── 도시 목록 ────────────────────────────────────────────

    @Test
    @DisplayName("도시 목록에 비공개 장소는 나오지 않고, 폐업은 목록 뒤로 간다")
    void cityListHidesHiddenAndSortsClosedLast() {
        VenueCityDetailResponse result = venueService.getCityDetail("kr", "seoul");

        assertThat(result.venues()).extracting(VenueSummaryResponse::nameKo)
                .containsExactly("강남 몰트바", "폐업한 바");
        assertThat(result.venues()).extracting(VenueSummaryResponse::status)
                .containsExactly(VenueStatus.ACTIVE, VenueStatus.CLOSED);
    }

    @Test
    @DisplayName("폐업은 좌표가 있어도 마커 대상이 아니다")
    void closedIsNotMappable() {
        VenueCityDetailResponse result = venueService.getCityDetail("kr", "seoul");

        assertThat(result.venues()).filteredOn(v -> v.status() == VenueStatus.CLOSED)
                .isNotEmpty()
                .allMatch(v -> !v.mappable());
        assertThat(result.venues()).filteredOn(v -> v.status() == VenueStatus.ACTIVE)
                .isNotEmpty()
                .allMatch(VenueSummaryResponse::mappable);
    }

    @Test
    @DisplayName("도시 응답에 지도 초기 중심·줌이 함께 실린다 — 한 번의 응답으로 첫 프레임을 그린다")
    void cityCarriesMapViewport() {
        VenueCityDetailResponse result = venueService.getCityDetail("kr", "seoul");

        assertThat(result.city().centerLat()).isEqualByComparingTo("37.5665000");
        assertThat(result.city().centerLng()).isEqualByComparingTo("126.9780000");
        assertThat(result.city().defaultZoom()).isNotNull();
    }

    @Test
    @DisplayName("국가 코드와 도시 주소는 대소문자를 가리지 않는다")
    void countryCodeIsCaseInsensitive() {
        assertThat(venueService.getCityDetail("KR", "SEOUL").venues()).hasSize(2);
    }

    @Test
    @DisplayName("노출을 끈 도시는 없는 것으로 취급한다")
    void inactiveCityIsNotFound() {
        VenueCity busan = venueCityRepository.save(
                city("kr", "busan", "부산", "Busan", "35.1796000", "129.0756000", 20));
        busan.deactivate();
        venueCityRepository.saveAndFlush(busan);

        assertThatThrownBy(() -> venueService.getCityDetail("kr", "busan"))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.VENUE_CITY_NOT_FOUND);
    }

    // ── 허브 · 국가 ──────────────────────────────────────────

    @Test
    @DisplayName("허브는 장소가 0건인 도시와 국가를 빼고 준다")
    void hubSkipsEmptyCitiesAndCountries() {
        List<VenueCountryResponse> countries = venueService.getCountries();

        // 장소 수 내림차순 — 한국 2건, 일본 1건
        assertThat(countries).extracting(VenueCountryResponse::countryCode)
                .containsExactly("kr", "jp");
        assertThat(countries).filteredOn(c -> c.countryCode().equals("jp"))
                .flatExtracting(VenueCountryResponse::cities)
                .extracting(VenueCityResponse::slug)
                .containsExactly("osaka");
    }

    @Test
    @DisplayName("도시별 카운트는 폐업을 포함하고 비공개는 뺀다")
    void cityCountIncludesClosedButNotHidden() {
        VenueCountryResponse korea = venueService.getCountry("kr");

        assertThat(korea.venueCount()).isEqualTo(2);
        assertThat(korea.cities()).singleElement()
                .satisfies(city -> assertThat(city.venueCount()).isEqualTo(2));
    }

    @Test
    @DisplayName("장소가 없는 국가도 404 가 아니라 빈 목록이다 — 색인된 URL 을 죽이지 않는다")
    void emptyCountryReturnsEmptyListNotError() {
        VenueCountryResponse taiwan = venueService.getCountry("tw");

        assertThat(taiwan.countryCode()).isEqualTo("tw");
        assertThat(taiwan.venueCount()).isZero();
        assertThat(taiwan.cities()).isEmpty();
    }

    // ── 상세 ────────────────────────────────────────────────

    @Test
    @DisplayName("비공개 장소는 상세로도 열리지 않는다")
    void hiddenVenueIsNotFoundByDetail() {
        Long hiddenId = venueRepository.findAll().stream()
                .filter(v -> v.getStatus() == VenueStatus.HIDDEN)
                .findFirst().orElseThrow().getId();

        assertThatThrownBy(() -> venueService.getVenue(hiddenId))
                .isInstanceOf(CustomException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.VENUE_NOT_FOUND);
    }

    @Test
    @DisplayName("상세는 도시 정보까지 채워서 준다")
    void detailCarriesCityInfo() {
        Long activeId = venueRepository.findAll().stream()
                .filter(v -> v.getNameKo().equals("바 나유타"))
                .findFirst().orElseThrow().getId();

        var detail = venueService.getVenue(activeId);

        assertThat(detail.summary().citySlug()).isEqualTo("osaka");
        assertThat(detail.summary().cityNameKo()).isEqualTo("오사카");
        assertThat(detail.summary().countryCode()).isEqualTo("jp");
        assertThat(detail.summary().nameLocal()).isEqualTo("バー ナユタ");
    }

    // ── 검색 ────────────────────────────────────────────────

    @Test
    @DisplayName("빈 키워드는 전체 목록이 아니라 빈 결과다")
    void blankKeywordReturnsNothing() {
        assertThat(venueService.search("", null, 10)).isEmpty();
        assertThat(venueService.search("   ", null, 10)).isEmpty();
        assertThat(venueService.search(null, null, 10)).isEmpty();
    }

    @Test
    @DisplayName("검색은 한글명·영문명·현지표기·주소를 모두 본다")
    void searchMatchesEveryNameFieldAndAddress() {
        assertThat(venueService.search("나유타", null, 10)).hasSize(1);
        assertThat(venueService.search("Nayuta", null, 10)).hasSize(1);
        assertThat(venueService.search("ナユタ", null, 10)).hasSize(1);
        assertThat(venueService.search("北区", null, 10)).hasSize(1);
    }

    @Test
    @DisplayName("검색도 비공개 장소를 내보내지 않는다")
    void searchHidesHiddenVenues() {
        assertThat(venueService.search("비공개", null, 10)).isEmpty();
    }

    @Test
    @DisplayName("국가로 검색 범위를 좁힐 수 있다")
    void searchCanBeScopedToCountry() {
        assertThat(venueService.search("바", "jp", 10)).extracting(VenueSummaryResponse::nameKo)
                .containsExactly("바 나유타");
        assertThat(venueService.search("바", "kr", 10)).extracting(VenueSummaryResponse::nameKo)
                .containsExactly("강남 몰트바", "폐업한 바");
    }

    @Test
    @DisplayName("검색 건수 상한을 지키고, 0 이하를 넘겨도 터지지 않는다")
    void searchRespectsLimit() {
        assertThat(venueService.search("바", null, 1)).hasSize(1);
        assertThat(venueService.search("바", null, 0)).hasSize(1);
        assertThat(venueService.search("바", null, -5)).hasSize(1);
    }

    // ── 픽스처 ──────────────────────────────────────────────

    private VenueCity city(String countryCode, String slug, String nameKo, String nameEn,
                           String lat, String lng, int sortOrder) {
        return VenueCity.builder()
                .countryCode(countryCode).slug(slug).nameKo(nameKo).nameEn(nameEn)
                .centerLat(new BigDecimal(lat)).centerLng(new BigDecimal(lng))
                .sortOrder(sortOrder)
                .build();
    }

    private Venue venue(VenueCity city, String nameKo, VenueType type, VenueStatus status,
                        String address, String lat, String lng) {
        return Venue.builder()
                .city(city).countryCode(city.getCountryCode())
                .venueType(type).status(status)
                .nameKo(nameKo).address(address)
                .lat(new BigDecimal(lat)).lng(new BigDecimal(lng))
                .build();
    }

    private Venue venueWithNames(VenueCity city, String nameKo, String nameEn, String nameLocal,
                                 String address, String lat, String lng) {
        return Venue.builder()
                .city(city).countryCode(city.getCountryCode())
                .venueType(VenueType.BAR).status(VenueStatus.ACTIVE)
                .nameKo(nameKo).nameEn(nameEn).nameLocal(nameLocal).address(address)
                .lat(new BigDecimal(lat)).lng(new BigDecimal(lng))
                .build();
    }
}
