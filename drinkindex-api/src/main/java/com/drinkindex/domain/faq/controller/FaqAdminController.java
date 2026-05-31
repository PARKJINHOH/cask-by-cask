package com.drinkindex.domain.faq.controller;

import com.drinkindex.domain.faq.dto.AdminFaqDetailResponse;
import com.drinkindex.domain.faq.dto.AdminFaqListResponse;
import com.drinkindex.domain.faq.dto.CreateFaqRequest;
import com.drinkindex.domain.faq.dto.UpdateFaqRequest;
import com.drinkindex.domain.faq.entity.enums.FaqLanguage;
import com.drinkindex.domain.faq.service.FaqService;
import com.drinkindex.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/faq")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
public class FaqAdminController {

    private final FaqService faqService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AdminFaqListResponse>>> getFaqs(
            @RequestParam(required = false) FaqLanguage language
    ) {
        return ResponseEntity.ok(ApiResponse.success(faqService.getAdminFaqs(language)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminFaqDetailResponse>> getFaqDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(faqService.getAdminFaqDetail(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AdminFaqDetailResponse>> createFaq(
            @Valid @RequestBody CreateFaqRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(faqService.createFaq(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminFaqDetailResponse>> updateFaq(
            @PathVariable Long id,
            @Valid @RequestBody UpdateFaqRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(faqService.updateFaq(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteFaq(@PathVariable Long id) {
        faqService.deleteFaq(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PatchMapping("/{id}/active")
    public ResponseEntity<ApiResponse<Void>> updateActive(
            @PathVariable Long id,
            @RequestBody ActiveRequest request
    ) {
        faqService.updateActive(id, request.getIsActive());
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PatchMapping("/{id}/sort-order")
    public ResponseEntity<ApiResponse<Void>> updateSortOrder(
            @PathVariable Long id,
            @RequestBody SortOrderRequest request
    ) {
        faqService.updateSortOrder(id, request.getSortOrder());
        return ResponseEntity.ok(ApiResponse.success());
    }

    @Getter @NoArgsConstructor
    public static class ActiveRequest {
        private Boolean isActive;
    }

    @Getter @NoArgsConstructor
    public static class SortOrderRequest {
        private Integer sortOrder;
    }
}
