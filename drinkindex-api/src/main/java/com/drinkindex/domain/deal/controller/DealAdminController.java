package com.drinkindex.domain.deal.controller;

import com.drinkindex.domain.deal.dto.DealPostDetailResponse;
import com.drinkindex.domain.deal.dto.DealPostSummaryResponse;
import com.drinkindex.domain.deal.dto.UpdateDealRequest;
import com.drinkindex.domain.deal.entity.enums.DealStatus;
import com.drinkindex.domain.deal.service.DealAdminService;
import com.drinkindex.global.response.ApiResponse;
import com.drinkindex.global.response.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 관리자 핫딜 검토 API. 인증/인가는 SecurityConfig 의
 * {@code /api/admin/**} → hasAnyRole("SUPER_ADMIN","ADMIN") 규칙을 따른다.
 */
@RestController
@RequestMapping("/api/admin/deals")
@RequiredArgsConstructor
public class DealAdminController {

    private final DealAdminService dealAdminService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<DealPostSummaryResponse>>> list(
            @RequestParam(defaultValue = "PENDING") DealStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(dealAdminService.list(status, page, size))));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DealPostDetailResponse>> detail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(dealAdminService.detail(id)));
    }

    @PatchMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<Void>> approve(@PathVariable Long id) {
        dealAdminService.approve(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PatchMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<Void>> reject(@PathVariable Long id) {
        dealAdminService.reject(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<DealPostDetailResponse>> update(
            @PathVariable Long id,
            @RequestBody UpdateDealRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(dealAdminService.update(id, request)));
    }
}
