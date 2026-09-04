package com.caskbycask.domain.venue.service;

import com.caskbycask.domain.venue.dto.AdminVenueCityResponse;
import com.caskbycask.domain.venue.dto.AdminVenueResponse;
import com.caskbycask.domain.venue.dto.VenueCityUpsertRequest;
import com.caskbycask.domain.venue.dto.VenueUpsertRequest;
import com.caskbycask.domain.venue.entity.VenueCity;
import com.caskbycask.domain.venue.entity.enums.VenueStatus;
import com.caskbycask.domain.venue.entity.enums.VenueType;
import com.caskbycask.domain.venue.repository.VenueCityRepository;
import com.caskbycask.domain.venue.repository.VenueRepository;
import com.caskbycask.global.config.JpaAuditingConfig;
import com.caskbycask.global.config.QuerydslConfig;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

/**
 * 관리자 장소·도시 관리 — 특히 <b>실패해야 하는 경우</b>.
 *
 * <p>좌표가 없는 장소를 공개하거나, 장소가 매달린 도시를 지우거나, 도시의 국가를 갈아 버리는 것은
 * 전부 DB 가 막아 주지 않는다(FK 를 걸지 않는 저장소 규약). 그래서 서비스가 유일한 방어선이고
 * 여기가 그 방어선을 고정한다.
 */
@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({QuerydslConfig.class, JpaAuditingConfig.class})
class VenueAdminServiceTest {

    @Autowired
    private VenueRepository venueRepository;
    @Autowired
    private VenueCityRepository venueCityRepository;

    private VenueAdminService adminService;
    /** 장소 삭제 시 댓글·사진 정리를 호출하는지만 보면 되므로 목으로 세운다. */
    private VenueCommentService venueCommentService;
    private VenueCity seoul;
    private VenueCity osaka;

    @BeforeEach
    void setUp() {
        venueCommentService = mock(VenueCommentService.class);
        adminService = new VenueAdminService(venueRepository, venueCityRepository, venueCommentService);
        seoul = venueCityRepository.save(city("kr", "seoul", "서울", "Seoul", "37.5665", "126.9780"));
        osaka = venueCityRepository.save(city("jp", "osaka", "오사카", "Osaka", "34.6937", "135.5023"));
    }

    @Nested
    @DisplayName("좌표 검증")
    class Coordinates {

        @Test
        @DisplayName("좌표 없이 공개하려 하면 막는다")
        void activeRequiresCoordinates() {
            assertThatThrownBy(() -> adminService.create(
                    request(seoul.getId(), "좌표 없는 바", VenueStatus.ACTIVE, null, null)))
                    .isInstanceOf(CustomException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.VENUE_COORDINATES_REQUIRED);
        }

        @Test
        @DisplayName("좌표 없이 비공개로 저장하는 것은 정상 흐름이다 — 나중에 핀을 찍으면 된다")
        void hiddenWithoutCoordinatesIsAllowed() {
            assertThatCode(() -> adminService.create(
                    request(seoul.getId(), "등록 중인 바", VenueStatus.HIDDEN, null, null)))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("0,0 은 좌표가 아니라 파싱 실패의 잔재로 본다")
        void zeroZeroIsRejected() {
            assertThatThrownBy(() -> adminService.create(
                    request(seoul.getId(), "바", VenueStatus.HIDDEN, "0", "0")))
                    .isInstanceOf(CustomException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.VENUE_COORDINATES_INVALID);
        }

        @Test
        @DisplayName("범위 밖 좌표는 비공개 저장이라도 막는다")
        void outOfRangeIsRejectedEvenWhenHidden() {
            assertThatThrownBy(() -> adminService.create(
                    request(seoul.getId(), "바", VenueStatus.HIDDEN, "91", "127")))
                    .isInstanceOf(CustomException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.VENUE_COORDINATES_INVALID);
        }

        @Test
        @DisplayName("위도만 있고 경도가 없으면 잘못된 좌표다")
        void halfCoordinateIsInvalid() {
            assertThatThrownBy(() -> adminService.create(
                    request(seoul.getId(), "바", VenueStatus.HIDDEN, "37.5", null)))
                    .isInstanceOf(CustomException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.VENUE_COORDINATES_INVALID);
        }

        @Test
        @DisplayName("좌표를 지운 채로 공개 상태를 유지하려 하면 수정도 막는다")
        void updateCannotStripCoordinatesWhileActive() {
            AdminVenueResponse created = adminService.create(
                    request(seoul.getId(), "바", VenueStatus.ACTIVE, "37.4979", "127.0276"));
            Long id = created.venue().summary().id();

            assertThatThrownBy(() -> adminService.update(id,
                    request(seoul.getId(), "바", VenueStatus.ACTIVE, null, null)))
                    .isInstanceOf(CustomException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.VENUE_COORDINATES_REQUIRED);
        }
    }

    @Nested
    @DisplayName("장소 수정")
    class VenueUpdate {

        @Test
        @DisplayName("도시를 옮기면 비정규화된 국가 코드도 따라간다")
        void movingCityCarriesCountryCode() {
            AdminVenueResponse created = adminService.create(
                    request(seoul.getId(), "이전할 바", VenueStatus.ACTIVE, "37.4979", "127.0276"));
            assertThat(created.venue().summary().countryCode()).isEqualTo("kr");

            AdminVenueResponse moved = adminService.update(created.venue().summary().id(),
                    request(osaka.getId(), "이전할 바", VenueStatus.ACTIVE, "34.7025", "135.4959"));

            assertThat(moved.venue().summary().countryCode()).isEqualTo("jp");
            assertThat(moved.venue().summary().citySlug()).isEqualTo("osaka");
        }

        @Test
        @DisplayName("수정은 전체 치환이라 폼에서 비운 값은 실제로 지워진다")
        void updateReplacesRatherThanMerges() {
            VenueUpsertRequest full = new VenueUpsertRequest(
                    seoul.getId(), VenueType.BAR, VenueStatus.ACTIVE,
                    "바", "Bar", "バー", "서울시 강남구", "3층",
                    new BigDecimal("37.4979"), new BigDecimal("127.0276"),
                    "02-1234-5678", "https://example.com", "https://instagram.com/x",
                    "19:00-02:00", null, null, null, null, null, "소개", "About");
            Long id = adminService.create(full).venue().summary().id();

            adminService.update(id, request(seoul.getId(), "바", VenueStatus.ACTIVE, "37.4979", "127.0276"));

            var detail = adminService.get(id).venue();
            assertThat(detail.phone()).isNull();
            assertThat(detail.website()).isNull();
            assertThat(detail.openingHours()).isNull();
            assertThat(detail.descriptionKo()).isNull();
            assertThat(detail.summary().addressDetail()).isNull();
        }

        @Test
        @DisplayName("빈 문자열은 null 로 눕혀 저장한다")
        void blankStringsBecomeNull() {
            VenueUpsertRequest blanks = new VenueUpsertRequest(
                    seoul.getId(), VenueType.BAR, VenueStatus.HIDDEN,
                    "  바  ", "   ", "", "  서울시 종로구  ", "  ",
                    null, null, "  ", "", "  ", "", null, null, null, null, null, "  ", "");

            var detail = adminService.create(blanks).venue();

            assertThat(detail.summary().nameKo()).isEqualTo("바");
            assertThat(detail.summary().address()).isEqualTo("서울시 종로구");
            assertThat(detail.summary().nameEn()).isNull();
            assertThat(detail.phone()).isNull();
            assertThat(detail.descriptionKo()).isNull();
        }

        @Test
        @DisplayName("삭제는 소프트 삭제라 관리자 조회에서도 사라진다")
        void deleteIsSoftAndRemovesFromAdminView() {
            Long id = adminService.create(
                    request(seoul.getId(), "없어질 바", VenueStatus.ACTIVE, "37.4979", "127.0276"))
                    .venue().summary().id();

            adminService.delete(id);
            venueRepository.flush();

            assertThatThrownBy(() -> adminService.get(id))
                    .isInstanceOf(CustomException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.VENUE_NOT_FOUND);
        }

        @Test
        @DisplayName("장소를 지우면 댓글·사진 정리도 함께 부른다 — FK 가 없어 DB 가 대신 해 주지 않는다")
        void deleteCleansUpChildren() {
            Long id = adminService.create(
                    request(seoul.getId(), "없어질 바", VenueStatus.ACTIVE, "37.4979", "127.0276"))
                    .venue().summary().id();

            adminService.delete(id);

            verify(venueCommentService).deleteByVenue(id);
        }
    }

    @Nested
    @DisplayName("관리자 목록 필터")
    class AdminSearch {

        @BeforeEach
        void seed() {
            adminService.create(request(seoul.getId(), "강남 몰트바", VenueStatus.ACTIVE, "37.4979", "127.0276"));
            adminService.create(request(seoul.getId(), "비공개 바", VenueStatus.HIDDEN, "37.5729", "126.9794"));
            adminService.create(request(osaka.getId(), "오사카 바", VenueStatus.ACTIVE, "34.7025", "135.4959"));
        }

        @Test
        @DisplayName("관리자 목록은 비공개까지 본다 — 공개 조회와 다른 지점")
        void adminSeesHidden() {
            var all = adminService.search(null, null, null, null, null, PageRequest.of(0, 20));

            assertThat(all.getTotalElements()).isEqualTo(3);
            assertThat(all.getContent()).extracting(r -> r.venue().summary().status())
                    .contains(VenueStatus.HIDDEN);
        }

        @Test
        @DisplayName("국가·도시·상태·키워드로 좁힐 수 있다")
        void filtersNarrowTheList() {
            assertThat(adminService.search(null, "jp", null, null, null, PageRequest.of(0, 20))
                    .getTotalElements()).isEqualTo(1);
            assertThat(adminService.search(null, null, seoul.getId(), null, null, PageRequest.of(0, 20))
                    .getTotalElements()).isEqualTo(2);
            assertThat(adminService.search(null, null, null, null, VenueStatus.HIDDEN, PageRequest.of(0, 20))
                    .getTotalElements()).isEqualTo(1);
            assertThat(adminService.search("몰트", null, null, null, null, PageRequest.of(0, 20))
                    .getTotalElements()).isEqualTo(1);
        }

        @Test
        @DisplayName("국가 코드 필터도 대소문자를 가리지 않는다")
        void countryFilterIsCaseInsensitive() {
            assertThat(adminService.search(null, "JP", null, null, null, PageRequest.of(0, 20))
                    .getTotalElements()).isEqualTo(1);
        }

        @Test
        @DisplayName("빈 키워드는 필터가 아니라 무조건 전체다")
        void blankKeywordIsNotAFilter() {
            assertThat(adminService.search("   ", null, null, null, null, PageRequest.of(0, 20))
                    .getTotalElements()).isEqualTo(3);
        }
    }

    @Nested
    @DisplayName("도시 관리")
    class Cities {

        @Test
        @DisplayName("같은 국가에 같은 주소(slug)는 두 번 만들 수 없다")
        void duplicateSlugInSameCountryIsRejected() {
            assertThatThrownBy(() -> adminService.createCity(
                    cityRequest("kr", "seoul", "서울2", "Seoul2", "37.5", "127.0")))
                    .isInstanceOf(CustomException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.VENUE_CITY_SLUG_DUPLICATED);
        }

        @Test
        @DisplayName("다른 국가라면 같은 주소를 써도 된다")
        void sameSlugInAnotherCountryIsFine() {
            assertThatCode(() -> adminService.createCity(
                    cityRequest("jp", "seoul", "서울", "Seoul", "37.5", "127.0")))
                    .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("국가 코드와 주소는 대문자로 보내도 소문자로 저장된다")
        void countryAndSlugAreLowercased() {
            AdminVenueCityResponse created = adminService.createCity(
                    cityRequest("TW", "TAIPEI", "타이베이", "Taipei", "25.033", "121.5654"));

            assertThat(created.countryCode()).isEqualTo("tw");
            assertThat(created.slug()).isEqualTo("taipei");
        }

        @Test
        @DisplayName("도시의 국가는 바꿀 수 없다 — 매달린 장소의 국가 코드가 어긋난다")
        void cityCountryIsImmutable() {
            assertThatThrownBy(() -> adminService.updateCity(seoul.getId(),
                    cityRequest("jp", "seoul", "서울", "Seoul", "37.5665", "126.9780")))
                    .isInstanceOf(CustomException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.VENUE_CITY_COUNTRY_IMMUTABLE);
        }

        @Test
        @DisplayName("장소가 매달린 도시는 삭제할 수 없다 — 노출 끄기로 대신한다")
        void cityWithVenuesCannotBeDeleted() {
            adminService.create(request(seoul.getId(), "바", VenueStatus.ACTIVE, "37.4979", "127.0276"));
            venueRepository.flush();

            assertThatThrownBy(() -> adminService.deleteCity(seoul.getId()))
                    .isInstanceOf(CustomException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.VENUE_CITY_IN_USE);
        }

        @Test
        @DisplayName("빈 도시는 삭제할 수 있다")
        void emptyCityCanBeDeleted() {
            assertThatCode(() -> adminService.deleteCity(osaka.getId())).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("도시 중심 좌표는 항상 유효해야 한다 — 지도 초기 화면이라 '나중에'가 없다")
        void cityCenterMustBeValid() {
            assertThatThrownBy(() -> adminService.createCity(
                    cityRequest("tw", "taipei", "타이베이", "Taipei", "0", "0")))
                    .isInstanceOf(CustomException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.VENUE_COORDINATES_INVALID);
        }

        @Test
        @DisplayName("줌 레벨이 범위를 벗어나면 거부한다")
        void zoomOutOfRangeIsRejected() {
            VenueCityUpsertRequest bad = new VenueCityUpsertRequest(
                    "tw", "taipei", "타이베이", "Taipei",
                    new BigDecimal("25.033"), new BigDecimal("121.5654"),
                    new BigDecimal("99"), 0, true);

            assertThatThrownBy(() -> adminService.createCity(bad))
                    .isInstanceOf(CustomException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.INVALID_INPUT);
        }

        @Test
        @DisplayName("관리자 도시 목록은 노출을 끈 도시도 장소 수와 함께 보여준다")
        void adminCityListIncludesInactiveWithCounts() {
            adminService.create(request(seoul.getId(), "바", VenueStatus.HIDDEN, "37.4979", "127.0276"));
            venueRepository.flush();
            adminService.updateCity(osaka.getId(),
                    cityRequest("jp", "osaka", "오사카", "Osaka", "34.6937", "135.5023", false));

            var cities = adminService.listCities();

            assertThat(cities).filteredOn(c -> c.slug().equals("seoul"))
                    .singleElement()
                    .satisfies(c -> {
                        assertThat(c.venueCount()).isEqualTo(1);   // 비공개도 센다
                        assertThat(c.active()).isTrue();
                    });
            assertThat(cities).filteredOn(c -> c.slug().equals("osaka"))
                    .singleElement()
                    .satisfies(c -> assertThat(c.active()).isFalse());
        }
    }

    // ── 픽스처 ──────────────────────────────────────────────

    private VenueCity city(String countryCode, String slug, String nameKo, String nameEn,
                           String lat, String lng) {
        return VenueCity.builder()
                .countryCode(countryCode).slug(slug).nameKo(nameKo).nameEn(nameEn)
                .centerLat(new BigDecimal(lat)).centerLng(new BigDecimal(lng))
                .build();
    }

    private VenueUpsertRequest request(Long cityId, String nameKo, VenueStatus status,
                                       String lat, String lng) {
        return new VenueUpsertRequest(
                cityId, VenueType.BAR, status,
                nameKo, null, null, "주소", null,
                lat == null ? null : new BigDecimal(lat),
                lng == null ? null : new BigDecimal(lng),
                null, null, null, null, null, null, null, null, null, null, null);
    }

    private VenueCityUpsertRequest cityRequest(String countryCode, String slug, String nameKo,
                                               String nameEn, String lat, String lng) {
        return cityRequest(countryCode, slug, nameKo, nameEn, lat, lng, true);
    }

    private VenueCityUpsertRequest cityRequest(String countryCode, String slug, String nameKo,
                                               String nameEn, String lat, String lng, boolean active) {
        return new VenueCityUpsertRequest(
                countryCode, slug, nameKo, nameEn,
                new BigDecimal(lat), new BigDecimal(lng), null, 0, active);
    }
}
