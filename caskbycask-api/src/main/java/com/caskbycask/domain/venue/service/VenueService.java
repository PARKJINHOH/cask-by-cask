package com.caskbycask.domain.venue.service;

import com.caskbycask.domain.venue.dto.*;
import com.caskbycask.domain.venue.entity.Venue;
import com.caskbycask.domain.venue.entity.VenueCity;
import com.caskbycask.domain.venue.entity.enums.VenueStatus;
import com.caskbycask.domain.venue.repository.VenueCityRepository;
import com.caskbycask.domain.venue.repository.VenueRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 주류 장소 공개 조회.
 *
 * <p>공개 화면은 언제나 {@link VenueStatus#PUBLIC_STATUSES} 로만 거른다 —
 * 쿼리마다 조건을 손으로 쓰면 한 곳을 빠뜨렸을 때 비공개 장소가 조용히 새어 나간다.
 *
 * <p>도시 목록에서 <b>장소가 0건인 도시는 빼고</b> 준다. 시드에는 아직 아무도 등록하지 않은 도시가
 * 섞여 있고, 눌러 봐야 빈 화면인 칩을 늘어놓는 것은 탐색을 방해한다. 관리자 화면은
 * 이 서비스가 아니라 별도 경로로 전체 도시를 본다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VenueService {

    /** 리뷰 작성 화면의 "마신 곳" 콤보박스가 한 번에 받는 최대 건수. */
    private static final int SEARCH_MAX_LIMIT = 50;

    /** 주류 상세에 노출할 장소 최대 개수. 목록이 길면 "여기 다 있다"가 아니라 소음이 된다. */
    private static final int SPIRIT_VENUE_MAX_LIMIT = 8;

    /**
     * 신선도 컷. 2년 넘게 아무도 그 술을 마시지 않은 곳은 지금 가도 없을 가능성이 높다 —
     * 없는 술을 마시러 보내는 것이 이 기능의 가장 큰 실패 방식이라 넉넉하되 무한하지는 않게 둔다.
     */
    private static final int FRESHNESS_MONTHS = 24;

    private final VenueRepository venueRepository;
    private final VenueCityRepository venueCityRepository;

    // ── 허브 · 국가 ──────────────────────────────────────────

    /** 장소가 하나라도 있는 국가 전부와 그 도시들. 쿼리 2번으로 끝난다. */
    public List<VenueCountryResponse> getCountries() {
        List<VenueCity> cities = venueCityRepository.findByIsActiveTrueOrderByCountryCodeAscSortOrderAscIdAsc();
        Map<Long, Long> counts = countsByCityId(null);

        Map<String, List<VenueCityResponse>> byCountry = new LinkedHashMap<>();
        for (VenueCity city : cities) {
            long count = counts.getOrDefault(city.getId(), 0L);
            if (count == 0) continue;
            byCountry.computeIfAbsent(city.getCountryCode(), key -> new ArrayList<>())
                    .add(VenueCityResponse.from(city, count));
        }
        return byCountry.entrySet().stream()
                .map(entry -> new VenueCountryResponse(
                        entry.getKey(),
                        entry.getValue().stream().mapToLong(VenueCityResponse::venueCount).sum(),
                        entry.getValue()))
                .sorted(Comparator.comparingLong(VenueCountryResponse::venueCount).reversed()
                        .thenComparing(VenueCountryResponse::countryCode))
                .toList();
    }

    /**
     * 국가 하나와 그 도시들.
     *
     * <p>장소가 0건이어도 404 로 만들지 않는다 — 국가 페이지는 색인된 URL 이라
     * 마지막 가게가 폐업했다고 404 가 되면 이미 쌓인 검색 순위를 버리게 된다.
     * 빈 목록을 돌려주고 화면이 빈 상태를 그린다.
     */
    public VenueCountryResponse getCountry(String countryCode) {
        String normalized = normalizeCountryCode(countryCode);
        List<VenueCity> cities =
                venueCityRepository.findByCountryCodeAndIsActiveTrueOrderBySortOrderAscIdAsc(normalized);
        Map<Long, Long> counts = countsByCityId(normalized);

        List<VenueCityResponse> cityResponses = cities.stream()
                .map(city -> VenueCityResponse.from(city, counts.getOrDefault(city.getId(), 0L)))
                .filter(city -> city.venueCount() > 0)
                .toList();
        long total = cityResponses.stream().mapToLong(VenueCityResponse::venueCount).sum();
        return new VenueCountryResponse(normalized, total, cityResponses);
    }

    // ── 도시 ────────────────────────────────────────────────

    /** 도시 하나 + 그 안의 장소 전부. 지도의 첫 프레임이 이 응답 하나로 완성된다. */
    public VenueCityDetailResponse getCityDetail(String countryCode, String slug) {
        VenueCity city = findCityOrThrow(countryCode, slug);
        List<VenueSummaryResponse> venues = venueRepository
                .findAllByCityForDisplay(city.getId(), VenueStatus.PUBLIC_STATUSES)
                .stream()
                .map(VenueSummaryResponse::from)
                .toList();
        return new VenueCityDetailResponse(VenueCityResponse.from(city, venues.size()), venues);
    }

    // ── 장소 ────────────────────────────────────────────────

    public VenueDetailResponse getVenue(Long id) {
        Venue venue = venueRepository.findByIdForDisplay(id, VenueStatus.PUBLIC_STATUSES)
                .orElseThrow(() -> new CustomException(ErrorCode.VENUE_NOT_FOUND));
        return VenueDetailResponse.from(venue);
    }

    /**
     * 이름·주소 부분 일치 검색.
     *
     * <p>빈 키워드에 전체 목록을 돌려주지 않는다 — 콤보박스가 열리자마자 전국 장소를 받는 것을 막는다.
     */
    public List<VenueSummaryResponse> search(String keyword, String countryCode, int limit) {
        if (keyword == null || keyword.isBlank()) {
            return List.of();
        }
        int size = Math.min(Math.max(limit, 1), SEARCH_MAX_LIMIT);
        String normalized = countryCode == null || countryCode.isBlank()
                ? null : normalizeCountryCode(countryCode);
        return venueRepository
                .searchByKeyword(keyword.trim(), normalized, VenueStatus.PUBLIC_STATUSES,
                        PageRequest.of(0, size))
                .stream()
                .map(VenueSummaryResponse::from)
                .toList();
    }

    // ── 주류 연계 ───────────────────────────────────────────

    /**
     * 이 술을 마실 수 있는 곳.
     *
     * <p>사장님이 판매 목록을 갱신하지 않아도 되는 이유가 여기 있다 — 리뷰의 "마신 곳" 태그가
     * 쌓이면 이 목록이 저절로 만들어지고, {@code FRESHNESS_MONTHS} 밖으로 밀린 것은 빠진다.
     *
     * <p>결과가 비면 <b>빈 목록</b>을 돌려준다. 화면은 이때 섹션 자체를 그리지 않는다 —
     * 태그가 쌓이기 전 몇 주 동안 페이지에 영구적인 빈칸이 생기지 않도록.
     */
    public List<SpiritVenueResponse> getVenuesForSpirit(Long spiritId, int limit) {
        int size = Math.min(Math.max(limit, 1), SPIRIT_VENUE_MAX_LIMIT);
        LocalDateTime since = LocalDateTime.now().minusMonths(FRESHNESS_MONTHS);

        List<SpiritVenueCount> counts = venueRepository.findVenueCountsBySpirit(
                spiritId, since, PageRequest.of(0, size));
        if (counts.isEmpty()) return List.of();

        Map<Long, Venue> venues = venueRepository
                .findAllForDisplayByIds(counts.stream().map(SpiritVenueCount::venueId).toList())
                .stream()
                .collect(Collectors.toMap(Venue::getId, venue -> venue));

        return counts.stream()
                .map(row -> {
                    Venue venue = venues.get(row.venueId());
                    return venue == null ? null : new SpiritVenueResponse(
                            VenueSummaryResponse.from(venue), row.reviewCount(), row.lastReviewedAt());
                })
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    // ── 내부 ────────────────────────────────────────────────

    private Map<Long, Long> countsByCityId(String countryCode) {
        return venueRepository.countByCity(countryCode, VenueStatus.PUBLIC_STATUSES).stream()
                .collect(Collectors.toMap(VenueCityCount::cityId, VenueCityCount::venueCount));
    }

    private VenueCity findCityOrThrow(String countryCode, String slug) {
        VenueCity city = venueCityRepository
                .findByCountryCodeAndSlug(normalizeCountryCode(countryCode), normalizeSlug(slug))
                .orElseThrow(() -> new CustomException(ErrorCode.VENUE_CITY_NOT_FOUND));
        // 노출을 끈 도시는 없는 것으로 취급한다 — 관리자가 내린 도시가 URL 로 계속 열리면 안 된다.
        if (Boolean.FALSE.equals(city.getIsActive())) {
            throw new CustomException(ErrorCode.VENUE_CITY_NOT_FOUND);
        }
        return city;
    }

    /** 대소문자를 가리지 않는다 — /venues/KR 로 들어와도 같은 문서를 보여준다. */
    private String normalizeCountryCode(String countryCode) {
        if (countryCode == null || countryCode.isBlank()) {
            throw new CustomException(ErrorCode.VENUE_CITY_NOT_FOUND);
        }
        return countryCode.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeSlug(String slug) {
        if (slug == null || slug.isBlank()) {
            throw new CustomException(ErrorCode.VENUE_CITY_NOT_FOUND);
        }
        return slug.trim().toLowerCase(Locale.ROOT);
    }
}
