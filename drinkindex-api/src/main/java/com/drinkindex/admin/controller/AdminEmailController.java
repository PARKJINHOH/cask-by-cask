package com.drinkindex.admin.controller;

import com.drinkindex.admin.dto.*;
import com.drinkindex.admin.service.AdminEmailService;
import com.drinkindex.global.response.ApiResponse;
import com.drinkindex.global.response.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/emails")
@RequiredArgsConstructor
public class AdminEmailController {

    private final AdminEmailService adminEmailService;

    // ── 발송 ─────────────────────────────────────────────────────────

    @GetMapping("/subscribers/count")
    public ResponseEntity<ApiResponse<Integer>> getSubscriberCount() {
        return ResponseEntity.ok(ApiResponse.success(adminEmailService.countSubscribers()));
    }

    @PostMapping("/test")
    public ResponseEntity<ApiResponse<SendEmailResult>> sendTestEmail(
            @Valid @RequestBody SendEmailRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminEmailService.sendTestEmail(request)));
    }

    @PostMapping("/send")
    public ResponseEntity<ApiResponse<SendEmailResult>> sendBulkEmail(
            @Valid @RequestBody SendEmailRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminEmailService.sendBulkEmail(request)));
    }

    // ── 이력 ─────────────────────────────────────────────────────────

    @GetMapping("/logs")
    public ResponseEntity<ApiResponse<PageResponse<EmailSendLogResponse>>> getLogs(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(adminEmailService.getLogs(pageable))));
    }

    @GetMapping("/logs/{id}")
    public ResponseEntity<ApiResponse<EmailSendLogDetailResponse>> getLogDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(adminEmailService.getLogDetail(id)));
    }

    // ── 템플릿 ───────────────────────────────────────────────────────

    @GetMapping("/templates")
    public ResponseEntity<ApiResponse<List<EmailTemplateResponse>>> getTemplates() {
        return ResponseEntity.ok(ApiResponse.success(adminEmailService.getTemplates()));
    }

    @PostMapping("/templates")
    public ResponseEntity<ApiResponse<EmailTemplateResponse>> createTemplate(
            @Valid @RequestBody EmailTemplateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(adminEmailService.createTemplate(request)));
    }

    @PutMapping("/templates/{id}")
    public ResponseEntity<ApiResponse<EmailTemplateResponse>> updateTemplate(
            @PathVariable Long id,
            @Valid @RequestBody EmailTemplateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminEmailService.updateTemplate(id, request)));
    }

    @DeleteMapping("/templates/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTemplate(@PathVariable Long id) {
        adminEmailService.deleteTemplate(id);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
