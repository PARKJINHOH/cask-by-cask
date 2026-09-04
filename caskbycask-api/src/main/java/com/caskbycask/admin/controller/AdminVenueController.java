package com.caskbycask.admin.controller;

import com.caskbycask.domain.venue.dto.AdminVenueCityResponse;
import com.caskbycask.domain.venue.dto.AdminVenueResponse;
import com.caskbycask.domain.venue.dto.VenueCityUpsertRequest;
import com.caskbycask.domain.venue.dto.VenueUpsertRequest;
import com.caskbycask.domain.venue.entity.enums.VenueStatus;
import com.caskbycask.domain.venue.entity.enums.VenueType;
import com.caskbycask.domain.spirit.entity.enums.RequestStatus;
import com.caskbycask.domain.venue.dto.VenueLinkResolveRequest;
import com.caskbycask.domain.venue.dto.VenueLinkResolveResponse;
import com.caskbycask.domain.venue.dto.VenueRequestResponse;
import com.caskbycask.domain.venue.service.VenueAdminService;
import com.caskbycask.domain.venue.service.VenueLinkResolveService;
import com.caskbycask.domain.venue.service.VenueRequestService;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import com.caskbycask.global.response.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 관리자 장소·도시 관리.
 *
 * <p>공개 API 와 달리 {@code venue.enabled} 플래그를 걸지 않는다 — 공개 전에 관리자가 먼저
 * 데이터를 채워 넣고 지도를 굴려 봐야 하기 때문이다.
 *
 * <p>{@code /api/admin/**} 가 SecurityConfig 에서 이미 ADMIN 이상으로 잠겨 있지만,
 * 매처 하나가 바뀌었을 때 조용히 열리지 않도록 클래스 레벨에서 한 번 더 못박는다.
 */
@RestController
@RequestMapping("/api/admin/venues")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
public class AdminVenueController {

    private final VenueAdminService venueAdminService;
    private final VenueRequestService venueRequestService;
    private final VenueLinkResolveService venueLinkResolveService;

    // ── 도시 ────────────────────────────────────────────────
    // 아래 /{id} 보다 먼저 선언한다. 정적 세그먼트가 우선 매칭되지만,
    // 순서에 기대지 않도록 /{id} 쪽에도 숫자 제약을 걸어 두었다.

    @GetMapping("/cities")
    public ResponseEntity<ApiResponse<List<AdminVenueCityResponse>>> listCities() {
        return ResponseEntity.ok(ApiResponse.success(venueAdminService.listCities()));
    }

    @PostMapping("/cities")
    public ResponseEntity<ApiResponse<AdminVenueCityResponse>> createCity(
            @Valid @RequestBody VenueCityUpsertRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(venueAdminService.createCity(request)));
    }

    @PatchMapping("/cities/{id:[0-9]+}")
    public ResponseEntity<ApiResponse<AdminVenueCityResponse>> updateCity(
            @PathVariable Long id,
            @Valid @RequestBody VenueCityUpsertRequest request) {
        return ResponseEntity.ok(ApiResponse.success(venueAdminService.updateCity(id, request)));
    }

    @DeleteMapping("/cities/{id:[0-9]+}")
    public ResponseEntity<ApiResponse<Void>> deleteCity(@PathVariable Long id) {
        venueAdminService.deleteCity(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ── 공유 링크 해석 ──────────────────────────────────────

    /**
     * 붙여넣은 지도 링크에서 좌표를 뽑는다.
     *
     * <p>실패해도 200 이다 — 여기 실패는 오류가 아니라 정상 흐름이고(네이버 단축 링크는
     * 원리상 좌표가 없다), 화면은 응답의 {@code source} 를 보고 안내를 바꾼다.
     */
    @PostMapping("/resolve-link")
    public ResponseEntity<ApiResponse<VenueLinkResolveResponse>> resolveLink(
            @Valid @RequestBody VenueLinkResolveRequest request) {
        return ResponseEntity.ok(ApiResponse.success(venueLinkResolveService.resolve(request)));
    }

    // ── 제보 요청 ───────────────────────────────────────────
    // /{id} 보다 먼저 선언한다(정적 세그먼트 우선). /{id} 에도 숫자 제약이 걸려 있다.

    @GetMapping("/requests")
    public ResponseEntity<ApiResponse<PageResponse<VenueRequestResponse>>> listRequests(
            @RequestParam(required = false) RequestStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(
                venueRequestService.getRequests(status, pageable))));
    }

    @GetMapping("/requests/{id:[0-9]+}")
    public ResponseEntity<ApiResponse<VenueRequestResponse>> requestDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(venueRequestService.getRequest(id)));
    }

    /**
     * 승인 — 진짜 장소를 만든다. 도시는 관리자가 고른다.
     *
     * <p>제보 폼은 도시를 자유 텍스트로 받는다(카탈로그에 없는 도시도 제보할 수 있어야 하므로).
     * 그걸 어느 도시 행에 붙일지는 사람이 판단해야 하는 일이라 승인 시점에 받는다.
     */
    @PatchMapping("/requests/{id:[0-9]+}/approve")
    public ResponseEntity<ApiResponse<VenueRequestResponse>> approveRequest(
            @PathVariable Long id,
            @RequestParam Long venueCityId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                venueRequestService.approve(id, userDetails.getUserId(), venueCityId)));
    }

    @PatchMapping("/requests/{id:[0-9]+}/reject")
    public ResponseEntity<ApiResponse<VenueRequestResponse>> rejectRequest(
            @PathVariable Long id,
            @RequestBody VenueRequestRejectBody body,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                venueRequestService.reject(id, userDetails.getUserId(), body.rejectReason())));
    }

    /** 거절 사유 본문. */
    public record VenueRequestRejectBody(String rejectReason) {
    }

    // ── 장소 ────────────────────────────────────────────────

    /** 필터 검색. 모든 조건이 선택이고, 비우면 비공개까지 포함한 전체를 본다. */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<AdminVenueResponse>>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String countryCode,
            @RequestParam(required = false) Long cityId,
            @RequestParam(required = false) VenueType venueType,
            @RequestParam(required = false) VenueStatus status,
            @PageableDefault(size = 20, sort = "nameKo") Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(
                venueAdminService.search(keyword, countryCode, cityId, venueType, status, pageable))));
    }

    @GetMapping("/{id:[0-9]+}")
    public ResponseEntity<ApiResponse<AdminVenueResponse>> detail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(venueAdminService.get(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AdminVenueResponse>> create(
            @Valid @RequestBody VenueUpsertRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(venueAdminService.create(request)));
    }

    /**
     * 수정. 부분 갱신이 아니라 <b>전체 치환</b>이다 — 폼이 항상 전 필드를 보낸다.
     * (PATCH 를 쓰는 것은 이 저장소의 관리자 CRUD 관례를 따른 것이고, 의미는 치환이다.)
     */
    @PatchMapping("/{id:[0-9]+}")
    public ResponseEntity<ApiResponse<AdminVenueResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody VenueUpsertRequest request) {
        return ResponseEntity.ok(ApiResponse.success(venueAdminService.update(id, request)));
    }

    @DeleteMapping("/{id:[0-9]+}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        venueAdminService.delete(id);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
