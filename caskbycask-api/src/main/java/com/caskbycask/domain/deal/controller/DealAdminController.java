package com.caskbycask.domain.deal.controller;

import com.caskbycask.domain.deal.dto.CreateDealRequest;
import com.caskbycask.domain.deal.dto.DealPostDetailResponse;
import com.caskbycask.domain.deal.dto.DealPostSummaryResponse;
import com.caskbycask.domain.deal.dto.UpdateDealRequest;
import com.caskbycask.domain.deal.entity.enums.DealStatus;
import com.caskbycask.domain.deal.service.DealAdminService;
import com.caskbycask.domain.deal.service.DealKrwBackfillService;
import com.caskbycask.global.response.ApiResponse;
import com.caskbycask.global.response.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 관리자 가격 동향 API (크롤러 수집분 검토 + 관리자 직접 등록).
 * 인증/인가는 SecurityConfig 의
 * {@code /api/admin/**} → hasAnyRole("SUPER_ADMIN","ADMIN") 규칙을 따른다.
 */
@RestController
@RequestMapping("/api/admin/deals")
@RequiredArgsConstructor
public class DealAdminController {

    private final DealAdminService dealAdminService;
    private final DealKrwBackfillService dealKrwBackfillService;

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

    /**
     * V96 이전 외화 딜의 원화 환산 일괄 백필. 운영 반영 직후 1회 호출용이며 재실행해도 안전하다.
     * 환산되지 않은 딜은 가격 차트에서 제외된 상태라 서비스에는 영향이 없다.
     */
    @PostMapping("/backfill-krw")
    public ResponseEntity<ApiResponse<DealKrwBackfillService.BackfillResult>> backfillKrw() {
        return ResponseEntity.ok(ApiResponse.success(dealKrwBackfillService.backfill()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DealPostDetailResponse>> detail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(dealAdminService.detail(id)));
    }

    /** 관리자 직접 가격 등록 — 검토 대기를 건너뛰고 바로 승인·노출 상태로 저장된다. */
    @PostMapping
    public ResponseEntity<ApiResponse<DealPostDetailResponse>> create(
            @Valid @RequestBody CreateDealRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(dealAdminService.create(request)));
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
