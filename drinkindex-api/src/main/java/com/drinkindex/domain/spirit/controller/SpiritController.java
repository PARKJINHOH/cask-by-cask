package com.drinkindex.domain.spirit.controller;

import com.drinkindex.domain.spirit.dto.*;
import com.drinkindex.domain.spirit.entity.enums.SpiritCategory;
import com.drinkindex.domain.spirit.entity.enums.SpiritSort;
import com.drinkindex.domain.spirit.service.SpiritService;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
            @RequestParam(required = false) SpiritCategory category,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) BigDecimal minAbv,
            @RequestParam(required = false) BigDecimal maxAbv,
            @RequestParam(required = false) BigDecimal minScore,
            @RequestParam(required = false) BigDecimal maxScore,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) SpiritSort sort,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                spiritService.searchSpirits(
                        category, country, minAbv, maxAbv, minScore, maxScore,
                        keyword, sort, pageable)
        ));
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
                spiritService.submitRegisterRequest(body, userDetails.getUserId())
        ));
    }

    @GetMapping("/requests/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<SpiritRegisterRequestResponse>>> getMyRequests(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                spiritService.getMyRegisterRequests(userDetails.getUserId())
        ));
    }
}
