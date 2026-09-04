package com.caskbycask.domain.venue.controller;

import com.caskbycask.domain.venue.dto.VenueCityDetailResponse;
import com.caskbycask.domain.venue.dto.VenueCountryResponse;
import com.caskbycask.domain.venue.dto.VenueDetailResponse;
import com.caskbycask.domain.venue.dto.VenueSummaryResponse;
import com.caskbycask.domain.venue.service.VenueService;
import com.caskbycask.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 주류 장소 공개 조회 API.
 *
 * <p>{@code venue.enabled=false} 면 이 빈 자체가 등록되지 않아 모든 경로가 404 가 된다.
 * 미출시 기능에는 403 보다 404 가 맞다 — "권한이 없다"가 아니라 "아직 없다"이기 때문이다.
 */
@RestController
@RequestMapping("/api/venues")
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "venue", name = "enabled", havingValue = "true")
public class VenueController {

    private final VenueService venueService;

    /** 허브 — 장소가 있는 국가와 도시 전부. */
    @GetMapping("/countries")
    public ResponseEntity<ApiResponse<List<VenueCountryResponse>>> countries() {
        return ResponseEntity.ok(ApiResponse.success(venueService.getCountries()));
    }

    /** 국가 하나. 장소가 0건이어도 200 + 빈 목록이다(색인된 URL 을 404 로 만들지 않는다). */
    @GetMapping("/countries/{countryCode}")
    public ResponseEntity<ApiResponse<VenueCountryResponse>> country(@PathVariable String countryCode) {
        return ResponseEntity.ok(ApiResponse.success(venueService.getCountry(countryCode)));
    }

    /** 도시 하나 + 그 안의 장소 전부. 지도의 첫 프레임이 이 응답 하나로 완성된다. */
    @GetMapping("/countries/{countryCode}/cities/{slug}")
    public ResponseEntity<ApiResponse<VenueCityDetailResponse>> city(
            @PathVariable String countryCode,
            @PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.success(venueService.getCityDetail(countryCode, slug)));
    }

    /** 이름·주소 검색. 키워드가 비면 빈 목록을 돌려준다. */
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<VenueSummaryResponse>>> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String countryCode,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(ApiResponse.success(
                venueService.search(keyword, countryCode, limit)));
    }

    /**
     * 장소 상세.
     *
     * <p>{@code {id:[0-9]+}} 로 숫자만 받는다 — 위의 정적 경로({@code /countries}, {@code /search})와
     * 겹치지 않게 하려는 것이다.
     */
    @GetMapping("/{id:[0-9]+}")
    public ResponseEntity<ApiResponse<VenueDetailResponse>> detail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(venueService.getVenue(id)));
    }
}
