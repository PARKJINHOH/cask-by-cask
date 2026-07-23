package com.caskbycask.domain.ainews.controller;

import com.caskbycask.domain.ainews.dto.AiNewsDtos;
import com.caskbycask.domain.ainews.dto.AiNewsDraftRequestDtos;
import com.caskbycask.domain.ainews.entity.enums.*;
import com.caskbycask.domain.ainews.service.AiNewsService;
import com.caskbycask.domain.ainews.service.AiNewsDraftRequestService;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import com.caskbycask.global.response.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/admin/ai-news")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
public class AiNewsAdminController {

    private final AiNewsService aiNewsService;
    private final AiNewsDraftRequestService draftRequestService;

    @GetMapping("/articles")
    public ResponseEntity<ApiResponse<PageResponse<AiNewsDtos.ArticleSummaryResponse>>> articles(
            @RequestParam(required = false) AiNewsArticleStatus status,
            @RequestParam(required = false) AiNewsArticleType type,
            @RequestParam(required = false) AiNewsCategory category,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(
                aiNewsService.listArticles(status, type, category, fromDate, toDate, page, size))));
    }

    @GetMapping("/articles/pending-count")
    public ResponseEntity<ApiResponse<Long>> pendingCount() {
        return ResponseEntity.ok(ApiResponse.success(aiNewsService.pendingCount()));
    }

    @GetMapping("/articles/{id}")
    public ResponseEntity<ApiResponse<AiNewsDtos.ArticleDetailResponse>> detail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(aiNewsService.detail(id)));
    }

    @PostMapping("/articles")
    public ResponseEntity<ApiResponse<AiNewsDtos.ArticleDetailResponse>> create(
            @Valid @RequestBody AiNewsDtos.ArticleUpsertRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(aiNewsService.createDraft(request, user.getUserId())));
    }

    @PutMapping("/articles/{id}")
    public ResponseEntity<ApiResponse<AiNewsDtos.ArticleDetailResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody AiNewsDtos.ArticleAdminUpdateRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(aiNewsService.updateArticle(id, request, user.getUserId())));
    }

    @PostMapping("/articles/{id}/publish")
    public ResponseEntity<ApiResponse<AiNewsDtos.ArticleDetailResponse>> publish(
            @PathVariable Long id,
            @RequestBody(required = false) AiNewsDtos.PublishRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        LocalDateTime scheduledAt = request != null ? request.scheduledAt() : null;
        return ResponseEntity.ok(ApiResponse.success(aiNewsService.publish(id, scheduledAt, user.getUserId())));
    }

    @PostMapping("/articles/{id}/schedule/cancel")
    public ResponseEntity<ApiResponse<AiNewsDtos.ArticleDetailResponse>> cancelSchedule(
            @PathVariable Long id, @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(aiNewsService.cancelSchedule(id, user.getUserId())));
    }

    @PostMapping("/articles/{id}/reject")
    public ResponseEntity<ApiResponse<AiNewsDtos.ArticleDetailResponse>> reject(
            @PathVariable Long id,
            @RequestBody(required = false) AiNewsDtos.ActionRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(aiNewsService.reject(id,
                request != null ? request.reason() : null, user.getUserId())));
    }

    @DeleteMapping("/articles/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            @RequestBody(required = false) AiNewsDtos.ActionRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        aiNewsService.delete(id, request != null ? request.reason() : null, user.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PostMapping("/articles/{id}/restore")
    public ResponseEntity<ApiResponse<AiNewsDtos.ArticleDetailResponse>> restore(
            @PathVariable Long id, @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(aiNewsService.restore(id, user.getUserId())));
    }

    @PostMapping("/articles/{id}/rewrite")
    public ResponseEntity<ApiResponse<AiNewsDtos.ArticleDetailResponse>> requestRewrite(
            @PathVariable Long id,
            @Valid @RequestBody AiNewsDtos.RewriteRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(aiNewsService.requestRewrite(id, request, user.getUserId())));
    }

    @GetMapping("/topics")
    public ResponseEntity<ApiResponse<PageResponse<AiNewsDtos.TopicResponse>>> topics(
            @RequestParam(required = false) AiNewsTopicStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(aiNewsService.topics(status, page, size))));
    }

    @PostMapping("/topics")
    public ResponseEntity<ApiResponse<AiNewsDtos.TopicResponse>> createTopic(
            @Valid @RequestBody AiNewsDtos.TopicUpsertRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(aiNewsService.createTopic(request, user.getUserId())));
    }

    @PutMapping("/topics/{id}")
    public ResponseEntity<ApiResponse<AiNewsDtos.TopicResponse>> updateTopic(
            @PathVariable Long id,
            @Valid @RequestBody AiNewsDtos.TopicUpsertRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(aiNewsService.updateTopic(id, request, user.getUserId())));
    }

    @DeleteMapping("/topics/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTopic(
            @PathVariable Long id, @AuthenticationPrincipal CustomUserDetails user) {
        aiNewsService.deleteTopic(id, user.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    @GetMapping("/sources")
    public ResponseEntity<ApiResponse<PageResponse<AiNewsDtos.SourceConfigResponse>>> sources(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(aiNewsService.sourceConfigs(page, size))));
    }

    @GetMapping("/draft-requests")
    public ResponseEntity<ApiResponse<PageResponse<AiNewsDraftRequestDtos.Response>>> draftRequests(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(draftRequestService.list(page, size))));
    }

    @GetMapping("/draft-requests/{id}")
    public ResponseEntity<ApiResponse<AiNewsDraftRequestDtos.Response>> draftRequest(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(draftRequestService.detail(id)));
    }

    @PostMapping("/draft-requests")
    public ResponseEntity<ApiResponse<AiNewsDraftRequestDtos.Response>> createDraftRequest(
            @Valid @RequestBody AiNewsDraftRequestDtos.CreateRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(draftRequestService.create(request, user.getUserId())));
    }

    @DeleteMapping("/draft-requests/{id}")
    public ResponseEntity<ApiResponse<AiNewsDraftRequestDtos.Response>> cancelDraftRequest(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(draftRequestService.cancel(id)));
    }

    @PostMapping("/draft-requests/{id}/retry")
    public ResponseEntity<ApiResponse<AiNewsDraftRequestDtos.Response>> retryDraftRequest(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) AiNewsDraftRequestDtos.RetryRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(draftRequestService.retry(id, request, user.getUserId())));
    }

    @DeleteMapping("/draft-requests/{id}/history")
    public ResponseEntity<ApiResponse<Void>> deleteDraftRequestHistory(@PathVariable Long id) {
        draftRequestService.deleteHistory(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PostMapping("/sources")
    public ResponseEntity<ApiResponse<AiNewsDtos.SourceConfigResponse>> createSource(
            @Valid @RequestBody AiNewsDtos.SourceConfigUpsertRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(aiNewsService.createSourceConfig(request, user.getUserId())));
    }

    @PutMapping("/sources/{id}")
    public ResponseEntity<ApiResponse<AiNewsDtos.SourceConfigResponse>> updateSource(
            @PathVariable Long id,
            @Valid @RequestBody AiNewsDtos.SourceConfigUpsertRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(aiNewsService.updateSourceConfig(id, request, user.getUserId())));
    }

    @DeleteMapping("/sources/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSource(
            @PathVariable Long id, @AuthenticationPrincipal CustomUserDetails user) {
        aiNewsService.deleteSourceConfig(id, user.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    @GetMapping("/settings")
    public ResponseEntity<ApiResponse<AiNewsDtos.SettingsResponse>> settings() {
        return ResponseEntity.ok(ApiResponse.success(aiNewsService.settings()));
    }

    @PutMapping("/settings")
    public ResponseEntity<ApiResponse<AiNewsDtos.SettingsResponse>> updateSettings(
            @Valid @RequestBody AiNewsDtos.SettingsUpdateRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(aiNewsService.updateSettings(request, user.getUserId())));
    }

    @GetMapping("/usage")
    public ResponseEntity<ApiResponse<AiNewsDtos.UsageSummaryResponse>> usage() {
        return ResponseEntity.ok(ApiResponse.success(aiNewsService.usageSummary()));
    }

    @GetMapping("/runs")
    public ResponseEntity<ApiResponse<PageResponse<AiNewsDtos.RunResponse>>> runs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(aiNewsService.runs(page, size))));
    }
}
