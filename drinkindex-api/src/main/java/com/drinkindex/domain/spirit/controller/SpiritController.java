package com.drinkindex.domain.spirit.controller;

import com.drinkindex.domain.spirit.dto.*;
import com.drinkindex.domain.spirit.entity.enums.CognacGrade;
import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import com.drinkindex.domain.spirit.entity.enums.SpiritSort;
import com.drinkindex.domain.spirit.entity.enums.SpiritStatus;
import com.drinkindex.domain.spirit.entity.enums.WhiskyStyle;
import com.drinkindex.domain.spirit.entity.enums.WineType;
import com.drinkindex.domain.spirit.service.SpiritService;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/spirits")
@RequiredArgsConstructor
public class SpiritController {

    private final SpiritService spiritService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<SpiritListResponse>>> search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) SpiritCategory category,
            @RequestParam(required = false) List<WhiskyStyle> whiskyStyle,
            @RequestParam(required = false) List<WineType> wineType,
            @RequestParam(required = false) List<CognacGrade> cognacGrade,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) BigDecimal minAbv,
            @RequestParam(required = false) BigDecimal maxAbv,
            @RequestParam(required = false) BigDecimal minScore,
            @RequestParam(required = false) BigDecimal maxScore,
            @RequestParam(required = false) SpiritSort sort,
            @PageableDefault(size = 20) Pageable pageable) {

        SpiritSearchCondition condition = new SpiritSearchCondition(
                keyword, category, whiskyStyle, wineType, cognacGrade,
                country, region, minAbv, maxAbv, minScore, maxScore,
                SpiritStatus.ACTIVE, sort);

        return ResponseEntity.ok(ApiResponse.success(
                spiritService.searchSpirits(condition, pageable)));
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
    public ResponseEntity<ApiResponse<SpiritDetailResponse>> getDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(spiritService.getSpiritDetail(id)));
    }

    @PostMapping("/requests")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<SpiritRegisterRequestResponse>> submitRequest(
            @Valid @RequestBody SpiritRegisterRequestBody body,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                spiritService.submitRegisterRequest(body, userDetails.getUserId())));
    }

    @GetMapping("/requests/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<SpiritRegisterRequestResponse>>> getMyRequests(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                spiritService.getMyRegisterRequests(userDetails.getUserId())));
    }
}
