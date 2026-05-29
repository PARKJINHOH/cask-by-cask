package com.drinkindex.admin.controller;

import com.drinkindex.admin.service.AdminInquiryService;
import com.drinkindex.domain.inquiry.dto.InquiryDetailResponse;
import com.drinkindex.domain.inquiry.dto.InquiryListResponse;
import com.drinkindex.domain.inquiry.dto.InquiryReplyRequest;
import com.drinkindex.domain.inquiry.dto.UpdateInquiryStatusRequest;
import com.drinkindex.domain.inquiry.entity.enums.InquiryCategory;
import com.drinkindex.domain.inquiry.entity.enums.InquiryStatus;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.response.ApiResponse;
import com.drinkindex.global.response.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/inquiries")
@RequiredArgsConstructor
public class AdminInquiryController {

    private final AdminInquiryService adminInquiryService;

    @GetMapping("/pending-count")
    public ResponseEntity<ApiResponse<Long>> pendingCount() {
        return ResponseEntity.ok(ApiResponse.success(adminInquiryService.pendingCount()));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<InquiryListResponse>>> list(
            @RequestParam(required = false) InquiryStatus status,
            @RequestParam(required = false) InquiryCategory category,
            @RequestParam(defaultValue = "0") int page
    ) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(adminInquiryService.list(status, category, page))));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InquiryDetailResponse>> detail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(adminInquiryService.detail(id)));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Void>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateInquiryStatusRequest request
    ) {
        adminInquiryService.updateStatus(id, request.status());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PatchMapping("/{id}/note")
    public ResponseEntity<ApiResponse<Void>> updateNote(
            @PathVariable Long id,
            @RequestBody Map<String, String> body
    ) {
        adminInquiryService.updateNote(id, body.get("note"));
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PostMapping("/{id}/reply")
    public ResponseEntity<ApiResponse<Void>> reply(
            @PathVariable Long id,
            @Valid @RequestBody InquiryReplyRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        adminInquiryService.reply(id, request.replyBody(), userDetails.getEmail());
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
