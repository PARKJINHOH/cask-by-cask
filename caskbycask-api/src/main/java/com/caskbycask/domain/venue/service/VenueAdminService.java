package com.caskbycask.domain.venue.service;

import com.caskbycask.domain.venue.dto.*;
import com.caskbycask.domain.venue.entity.Venue;
import com.caskbycask.domain.venue.entity.VenueCity;
import com.caskbycask.domain.venue.entity.VenueProfile;
import com.caskbycask.domain.venue.entity.enums.VenueStatus;
import com.caskbycask.domain.venue.entity.enums.VenueType;
import com.caskbycask.domain.venue.repository.VenueCityRepository;
import com.caskbycask.domain.venue.repository.VenueRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 관리자 장소·도시 관리.
 *
 * <p>공개 조회({@link VenueService})와 분리한 이유는 보이는 범위가 다르기 때문이다 —
 * 여기서는 비공개(HIDDEN) 장소와 노출을 끈 도시까지 전부 본다. 두 서비스를 합치면
 * "관리자용 조회"에 상태 필터를 깜빡한 순간 비공개 데이터가 공개 화면으로 샌다.
 *
 * <p>이 서비스는 {@code venue.enabled} 플래그와 무관하게 항상 살아 있다.
 * 공개 전에 관리자가 먼저 데이터를 채워 넣어야 하기 때문이다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VenueAdminService {

    private static final BigDecimal DEFAULT_ZOOM = BigDecimal.valueOf(11);
    private static final BigDecimal ZOOM_MIN = BigDecimal.ZERO;
    private static final BigDecimal ZOOM_MAX = BigDecimal.valueOf(22);

    private final VenueRepository venueRepository;
    private final VenueCityRepository venueCityRepository;
    private final VenueCommentService venueCommentService;

    // ── 장소 ────────────────────────────────────────────────

    /** 관리자 목록. 모든 조건이 선택이고, 비면 전체를 본다. */
    public Page<AdminVenueResponse> search(String keyword, String countryCode, Long cityId,
                                           VenueType venueType, VenueStatus status,
                                           Pageable pageable) {
        return venueRepository.searchForAdmin(
                        blankToNull(keyword),
                        countryCode == null || countryCode.isBlank() ? null : lower(countryCode),
                        cityId, venueType, status, pageable)
                .map(AdminVenueResponse::from);
    }

    public AdminVenueResponse get(Long id) {
        return AdminVenueResponse.from(findVenueOrThrow(id));
    }

    @Transactional
    public AdminVenueResponse create(VenueUpsertRequest request) {
        VenueCity city = findCityOrThrow(request.venueCityId());
        VenueProfile profile = toProfile(request);
        validateCoordinates(profile);

        // 관리자가 직접 등록한 장소는 제보자가 없다 — 제보 승인 경로(증분 8)에서만 채워진다.
        Venue venue = Venue.create(city, profile, null);
        return AdminVenueResponse.from(venueRepository.save(venue));
    }

    @Transactional
    public AdminVenueResponse update(Long id, VenueUpsertRequest request) {
        Venue venue = findVenueOrThrow(id);
        VenueProfile profile = toProfile(request);
        validateCoordinates(profile);

        // 도시가 바뀌면 비정규화해 둔 국가 코드도 함께 갱신된다(Venue.changeCity 가 책임진다).
        if (!venue.getCity().getId().equals(request.venueCityId())) {
            venue.changeCity(findCityOrThrow(request.venueCityId()));
        }
        venue.applyProfile(profile);
        return AdminVenueResponse.from(venue);
    }

    /**
     * 소프트 삭제.
     *
     * <p>FK 가 없으므로 딸린 데이터 정리는 여기가 책임진다 —
     * V102·V104·V106 마이그레이션 주석이 모두 이 메서드를 정리 책임자로 지목한다.
     * 장소에 새로 매다는 것이 생기면 <b>반드시 여기에</b> 정리를 추가할 것.
     *
     * <p>리뷰의 {@code venue_id} 는 여기서 건드리지 않는다. 리뷰 본문은 장소와 무관하게
     * 살아 있어야 하고, 조회 시 {@code status/deletedAt} 으로 걸러지므로 태그만 조용히 사라진다.
     */
    @Transactional
    public void delete(Long id) {
        Venue venue = findVenueOrThrow(id);
        // FK 가 없으므로 DB 가 대신 지워 주지 않는다. 댓글·사진을 먼저 정리한 뒤 장소를 내린다 —
        // 순서를 바꾸면 소프트 삭제된 장소를 조회하지 못해 댓글이 미아로 남는다.
        venueCommentService.deleteByVenue(venue.getId());
        venue.softDelete();
    }

    // ── 도시 ────────────────────────────────────────────────

    /** 노출을 끈 도시까지 전부. 각 도시의 장소 수를 함께 줘서 삭제 가능 여부를 화면에서 판단한다. */
    public List<AdminVenueCityResponse> listCities() {
        Map<Long, Long> counts = venueRepository.countByCityForAdmin().stream()
                .collect(Collectors.toMap(VenueCityCount::cityId, VenueCityCount::venueCount));
        return venueCityRepository.findAll(
                        org.springframework.data.domain.Sort.by("countryCode", "sortOrder", "id"))
                .stream()
                .map(city -> AdminVenueCityResponse.from(city, counts.getOrDefault(city.getId(), 0L)))
                .toList();
    }

    @Transactional
    public AdminVenueCityResponse createCity(VenueCityUpsertRequest request) {
        String countryCode = lower(request.countryCode());
        String slug = lower(request.slug());
        if (venueCityRepository.existsByCountryCodeAndSlug(countryCode, slug)) {
            throw new CustomException(ErrorCode.VENUE_CITY_SLUG_DUPLICATED);
        }
        VenueCity city = VenueCity.builder()
                .countryCode(countryCode)
                .slug(slug)
                .nameKo(request.nameKo())
                .nameEn(request.nameEn())
                .centerLat(request.centerLat())
                .centerLng(request.centerLng())
                .defaultZoom(normalizeZoom(request.defaultZoom()))
                .sortOrder(request.sortOrder() != null ? request.sortOrder() : 0)
                .isActive(request.isActive() == null || request.isActive())
                .build();
        validateCityCenter(city.getCenterLat(), city.getCenterLng());
        return AdminVenueCityResponse.from(venueCityRepository.save(city), 0L);
    }

    @Transactional
    public AdminVenueCityResponse updateCity(Long id, VenueCityUpsertRequest request) {
        VenueCity city = venueCityRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.VENUE_CITY_NOT_FOUND));

        // 국가는 바꿀 수 없다 — venue.country_code 가 도시에서 비정규화된 값이라
        // 여기서 국가를 갈면 이미 매달린 장소들이 조용히 어긋난다. 옮겨야 하면 새 도시를 만든다.
        if (!city.getCountryCode().equals(lower(request.countryCode()))) {
            throw new CustomException(ErrorCode.VENUE_CITY_COUNTRY_IMMUTABLE);
        }

        String slug = lower(request.slug());
        if (!city.getSlug().equals(slug)
                && venueCityRepository.existsByCountryCodeAndSlug(city.getCountryCode(), slug)) {
            throw new CustomException(ErrorCode.VENUE_CITY_SLUG_DUPLICATED);
        }
        validateCityCenter(request.centerLat(), request.centerLng());

        city.update(slug, request.nameKo(), request.nameEn(),
                request.centerLat(), request.centerLng(), normalizeZoom(request.defaultZoom()),
                request.sortOrder() != null ? request.sortOrder() : 0);
        if (request.isActive() != null) {
            if (request.isActive()) city.activate(); else city.deactivate();
        }
        long venueCount = venueRepository.countByCityForAdmin().stream()
                .filter(row -> row.cityId().equals(city.getId()))
                .mapToLong(VenueCityCount::venueCount).findFirst().orElse(0L);
        return AdminVenueCityResponse.from(city, venueCount);
    }

    /**
     * 도시 삭제. 장소가 하나라도 매달려 있으면 거부한다 — FK 가 없어 DB 가 막아 주지 않으므로
     * 지우면 그 장소들이 조용히 미아가 된다. 그럴 때는 노출 끄기로 대신한다.
     */
    @Transactional
    public void deleteCity(Long id) {
        VenueCity city = venueCityRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.VENUE_CITY_NOT_FOUND));
        if (venueRepository.existsByCityId(city.getId())) {
            throw new CustomException(ErrorCode.VENUE_CITY_IN_USE);
        }
        venueCityRepository.delete(city);
    }

    // ── 내부 ────────────────────────────────────────────────

    /**
     * 좌표 검증.
     *
     * <p>"값이 이상하다"와 "아직 안 찍었다"를 다른 에러로 가른다 — 관리자가 링크 해석에 실패해
     * 좌표가 비어 있는 상태로 저장하는 것은 정상 흐름이고(나중에 핀을 찍으면 된다),
     * 그 상태로 공개까지 하려는 것만 막으면 된다.
     */
    private void validateCoordinates(VenueProfile profile) {
        if (profile.hasNoCoordinates()) {
            if (profile.status() == VenueStatus.ACTIVE) {
                throw new CustomException(ErrorCode.VENUE_COORDINATES_REQUIRED);
            }
            return;
        }
        if (!profile.hasPlottableCoordinates()) {
            throw new CustomException(ErrorCode.VENUE_COORDINATES_INVALID);
        }
    }

    /** 도시 중심은 지도 초기 화면이라 항상 유효해야 한다 — 장소와 달리 "나중에"가 없다. */
    private void validateCityCenter(BigDecimal lat, BigDecimal lng) {
        if (!Venue.isPlottable(lat, lng)) {
            throw new CustomException(ErrorCode.VENUE_COORDINATES_INVALID);
        }
    }

    private BigDecimal normalizeZoom(BigDecimal zoom) {
        if (zoom == null) return DEFAULT_ZOOM;
        if (zoom.compareTo(ZOOM_MIN) < 0 || zoom.compareTo(ZOOM_MAX) > 0) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        return zoom;
    }

    private Venue findVenueOrThrow(Long id) {
        return venueRepository.findByIdForAdmin(id)
                .orElseThrow(() -> new CustomException(ErrorCode.VENUE_NOT_FOUND));
    }

    private VenueCity findCityOrThrow(Long id) {
        return venueCityRepository.findById(id)
                .orElseThrow(() -> new CustomException(ErrorCode.VENUE_CITY_NOT_FOUND));
    }

    /**
     * 빌더로 만든다. 정규 생성자를 쓰면 같은 타입의 String 필드 열 개가 위치로 늘어서
     * 두 개를 뒤바꿔도 컴파일이 통과한다 — {@link VenueProfile} 이 존재하는 이유가 그것이다.
     */
    private VenueProfile toProfile(VenueUpsertRequest request) {
        return VenueProfile.builder()
                .venueType(request.venueType())
                .status(request.status())
                .nameKo(trim(request.nameKo()))
                .nameEn(blankToNull(request.nameEn()))
                .nameLocal(blankToNull(request.nameLocal()))
                .address(trim(request.address()))
                .addressDetail(blankToNull(request.addressDetail()))
                .lat(request.lat())
                .lng(request.lng())
                .phone(blankToNull(request.phone()))
                .website(blankToNull(request.website()))
                .instagramUrl(blankToNull(request.instagramUrl()))
                .openingHours(blankToNull(request.openingHours()))
                .googleMapsUrl(blankToNull(request.googleMapsUrl()))
                .naverMapsUrl(blankToNull(request.naverMapsUrl()))
                .kakaoMapsUrl(blankToNull(request.kakaoMapsUrl()))
                .googlePlaceId(blankToNull(request.googlePlaceId()))
                .naverPlaceId(blankToNull(request.naverPlaceId()))
                .descriptionKo(blankToNull(request.descriptionKo()))
                .descriptionEn(blankToNull(request.descriptionEn()))
                .build();
    }

    private String lower(String value) {
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private String trim(String value) {
        return value == null ? null : value.trim();
    }

    /** 빈 문자열은 null 로 눕힌다 — 폼이 지운 값과 처음부터 없던 값을 DB 에서 같게 만든다. */
    private String blankToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
