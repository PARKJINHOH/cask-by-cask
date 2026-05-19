package com.drinkindex.admin.controller;

import com.drinkindex.admin.service.AdminInquiryService;
import com.drinkindex.domain.inquiry.dto.InquiryDetailResponse;
import com.drinkindex.domain.inquiry.dto.InquiryListResponse;
import com.drinkindex.domain.inquiry.dto.InquiryReplyRequest;
import com.drinkindex.domain.inquiry.dto.UpdateInquiryStatusRequest;
import com.drinkindex.domain.inquiry.entity.enums.InquiryCategory;
import com.drinkindex.domain.inquiry.entity.enums.InquiryStatus;
import com.drinkindex.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/inquiries")
@RequiredArgsConstructor
public class AdminInquiryController {

    private final AdminInquiryService adminInquiryService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<InquiryListResponse>>> list(
            @RequestParam(required = false) InquiryStatus status,
            @RequestParam(required = false) InquiryCategory category,
            @RequestParam(defaultValue = "0") int page
    ) {
        return ResponseEntity.ok(ApiResponse.success(adminInquiryService.list(status, category, page)));
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
            @Valid @RequestBody InquiryReplyRequest request
    ) {
        adminInquiryService.reply(id, request.replyBody());
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
