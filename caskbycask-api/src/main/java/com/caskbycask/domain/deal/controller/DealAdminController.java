package com.caskbycask.domain.deal.controller;

import com.caskbycask.domain.deal.dto.DealPostDetailResponse;
import com.caskbycask.domain.deal.dto.DealPostSummaryResponse;
import com.caskbycask.domain.deal.dto.UpdateDealRequest;
import com.caskbycask.domain.deal.entity.enums.DealStatus;
import com.caskbycask.domain.deal.service.DealAdminService;
import com.caskbycask.global.response.ApiResponse;
import com.caskbycask.global.response.PageResponse;
import jakarta.validation.Valid;
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
            @RequestParam(required = false) DealStatus status,
            @RequestParam(required = false) String drinkName,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(dealAdminService.list(status, drinkName, page, size))));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DealPostDetailResponse>> detail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(dealAdminService.detail(id)));
    }

    @PatchMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<DealPostDetailResponse>> approve(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) UpdateDealRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(dealAdminService.approve(id, request)));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<DealPostDetailResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDealRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(dealAdminService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        dealAdminService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> deleteBulk(@RequestParam java.util.List<Long> ids) {
        dealAdminService.deleteBulk(ids);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
