package com.caskbycask.domain.spirit.controller;

import com.caskbycask.domain.spirit.dto.*;
import com.caskbycask.domain.spirit.entity.enums.CognacGrade;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritSort;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.entity.enums.WhiskyStyle;
import com.caskbycask.domain.spirit.entity.enums.WineBody;
import com.caskbycask.domain.spirit.entity.enums.WineIntensity;
import com.caskbycask.domain.spirit.entity.enums.WineSweetness;
import com.caskbycask.domain.spirit.entity.enums.WineType;
import com.caskbycask.domain.spirit.service.SpiritService;
import com.caskbycask.domain.spirit.service.SpiritViewCountService;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import com.caskbycask.global.response.PageResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/spirits")
@RequiredArgsConstructor
public class SpiritController {

    private final SpiritService spiritService;
    private final SpiritViewCountService spiritViewCountService;

    @GetMapping("/autocomplete")
    public ResponseEntity<ApiResponse<List<SpiritAutocompleteResponse>>> autocomplete(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "false") boolean includeVariants) {
        List<SpiritAutocompleteResponse> result = spiritService.autocomplete(keyword, includeVariants);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<SpiritListResponse>>> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) SpiritCategory category,
            @RequestParam(required = false) List<WhiskyStyle> whiskyStyle,
            @RequestParam(required = false) List<WineType> wineType,
            @RequestParam(required = false) List<CognacGrade> cognacGrade,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) Long producerId,
            @RequestParam(required = false) BigDecimal minAbv,
            @RequestParam(required = false) BigDecimal maxAbv,
            @RequestParam(required = false) BigDecimal minScore,
            @RequestParam(required = false) BigDecimal maxScore,
            @RequestParam(required = false) SpiritSort sort,
            @RequestParam(required = false) List<WineSweetness> wineSweetness,
            @RequestParam(required = false) List<WineBody> wineBody,
            @RequestParam(required = false) List<WineIntensity> wineAcidity,
            @RequestParam(required = false) List<WineIntensity> wineTannin,
            @PageableDefault(size = 20) Pageable pageable) {

        SpiritSearchCondition condition = new SpiritSearchCondition(
                keyword, category, whiskyStyle, wineType, cognacGrade,
                country, region, producerId, minAbv, maxAbv, minScore, maxScore,
                SpiritStatus.ACTIVE, sort,
                wineSweetness, wineBody, wineAcidity, wineTannin);

        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(spiritService.searchSpirits(condition, pageable))));
    }

    /**
     * 같은 조건의 등록 건수 — 목록의 '총 N개' 표기용.
     *
     * 목록 응답(PageResponse)의 totalElements 는 페이지 계산에 쓰이는 **마스터 수**라 건드릴 수 없어,
     * 에디션까지 포함한 숫자는 이 엔드포인트로 따로 받는다. 정렬·페이징 파라미터는 받지 않는다.
     */
    @GetMapping("/count")
    public ResponseEntity<ApiResponse<SpiritSearchCountResponse>> count(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) SpiritCategory category,
            @RequestParam(required = false) List<WhiskyStyle> whiskyStyle,
            @RequestParam(required = false) List<WineType> wineType,
            @RequestParam(required = false) List<CognacGrade> cognacGrade,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) Long producerId,
            @RequestParam(required = false) BigDecimal minAbv,
            @RequestParam(required = false) BigDecimal maxAbv,
            @RequestParam(required = false) BigDecimal minScore,
            @RequestParam(required = false) BigDecimal maxScore,
            @RequestParam(required = false) List<WineSweetness> wineSweetness,
            @RequestParam(required = false) List<WineBody> wineBody,
            @RequestParam(required = false) List<WineIntensity> wineAcidity,
            @RequestParam(required = false) List<WineIntensity> wineTannin) {

        SpiritSearchCondition condition = new SpiritSearchCondition(
                keyword, category, whiskyStyle, wineType, cognacGrade,
                country, region, producerId, minAbv, maxAbv, minScore, maxScore,
                SpiritStatus.ACTIVE, null,
                wineSweetness, wineBody, wineAcidity, wineTannin);

        return ResponseEntity.ok(ApiResponse.success(spiritService.countSpirits(condition)));
    }

    /** 카테고리별 등록 주류 수(에디션 포함) — 메인 홈 사이드바 통계 */
    @GetMapping("/category-stats")
    public ResponseEntity<ApiResponse<List<SpiritCategoryStatResponse>>> getCategoryStats() {
        return ResponseEntity.ok(ApiResponse.success(spiritService.getCategoryStats()));
    }

    @GetMapping("/countries")
    public ResponseEntity<ApiResponse<List<CountryStatsResponse>>> getCountries(
            @RequestParam(required = false) SpiritCategory category) {
        return ResponseEntity.ok(ApiResponse.success(spiritService.getCountryStats(category)));
    }

    @GetMapping("/regions")
    public ResponseEntity<ApiResponse<List<RegionStatsResponse>>> getRegions(
            @RequestParam SpiritCategory category,
            @RequestParam String country) {
        return ResponseEntity.ok(ApiResponse.success(spiritService.getRegionStats(category, country)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SpiritDetailResponse>> getDetail(
            @PathVariable Long id,
            HttpServletRequest request
    ) {
        SpiritDetailResponse detail = spiritService.getSpiritDetail(id);
        String clientIp = resolveClientIp(request);
        Long viewCountTargetId = detail.parentId() != null ? detail.parentId() : detail.id();
        spiritViewCountService.tryIncrementViewCount(viewCountTargetId, clientIp);
        return ResponseEntity.ok(ApiResponse.success(detail));
    }

    /** 같은 이름의 다른 배치·병입 제품 목록 */
    @GetMapping("/{id}/variants")
    public ResponseEntity<ApiResponse<List<SpiritVariantResponse>>> getVariants(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(spiritService.getSpiritVariants(id)));
    }

    @PostMapping("/{id}/variants")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<SpiritVariantResponse>> createUserVariant(
            @PathVariable Long id,
            @Valid @RequestBody CreateUserVariantRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                spiritService.createUserVariant(id, request, userDetails.getUserId())));
    }

    @PostMapping(value = "/requests", consumes = "multipart/form-data")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<SpiritRegisterRequestResponse>> submitRequest(
            @Valid @RequestPart("data") SpiritRegisterRequestBody body,
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                spiritService.submitRegisterRequest(body, images, userDetails.getUserId())));
    }

    @GetMapping("/requests/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<SpiritRegisterRequestResponse>>> getMyRequests(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                spiritService.getMyRegisterRequests(userDetails.getUserId())));
    }

    @GetMapping("/requests/me/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<SpiritRegisterRequestDetailResponse>> getMyRequestDetail(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                spiritService.getMyRegisterRequestDetail(id, userDetails.getUserId())));
    }

    @PutMapping(value = "/requests/{id}", consumes = "multipart/form-data")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<SpiritRegisterRequestResponse>> updateMyRequest(
            @PathVariable Long id,
            @Valid @RequestPart("data") SpiritRegisterRequestBody body,
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                spiritService.updateMyRegisterRequest(id, body, images, userDetails.getUserId())));
    }

    @DeleteMapping("/requests/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> deleteMyRequest(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        spiritService.deleteMyRegisterRequest(id, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    private String resolveClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
