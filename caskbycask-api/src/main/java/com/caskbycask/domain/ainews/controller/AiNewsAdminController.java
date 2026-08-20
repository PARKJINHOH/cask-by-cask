package com.caskbycask.domain.ainews.controller;

import com.caskbycask.domain.ainews.dto.AiNewsDtos;
import com.caskbycask.domain.ainews.entity.enums.*;
import com.caskbycask.domain.ainews.service.AiNewsService;
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
            @Valid @RequestBody(required = false) AiNewsDtos.PublishRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        LocalDateTime scheduledAt = request != null ? request.scheduledAt() : null;
        return ResponseEntity.ok(ApiResponse.success(aiNewsService.publish(
                id, scheduledAt, request != null ? request.socialPublish() : null, user.getUserId())));
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

    @GetMapping("/topics")
    public ResponseEntity<ApiResponse<PageResponse<AiNewsDtos.TopicResponse>>> topics(
            @RequestParam(required = false) AiNewsTopicStatus status,
            @RequestParam(required = false) AiNewsCategory category,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(
                aiNewsService.topics(status, category, keyword, page, size))));
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

    /** 예전 AI 자동 제안으로 쌓인 주제를 한 번에 정리한다. 원고가 붙은 주제는 건너뛰고 결과에 알려 준다. */
    @PostMapping("/topics/bulk-delete")
    public ResponseEntity<ApiResponse<AiNewsDtos.BulkDeleteResponse>> deleteTopics(
            @Valid @RequestBody AiNewsDtos.TopicBulkDeleteRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(aiNewsService.deleteTopics(request.ids(), user.getUserId())));
    }

    @GetMapping("/sources")
    public ResponseEntity<ApiResponse<PageResponse<AiNewsDtos.SourceConfigResponse>>> sources(
            @RequestParam(required = false) AiNewsSourceType sourceType,
            @RequestParam(required = false) Boolean enabled,
            @RequestParam(required = false) Boolean autoDiscovered,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(
                aiNewsService.sourceConfigs(sourceType, enabled, autoDiscovered, keyword, page, size))));
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

    /** 자동 등록 시절에 쌓인 출처를 한 번에 정리한다. */
    @PostMapping("/sources/bulk-delete")
    public ResponseEntity<ApiResponse<Integer>> deleteSources(
            @Valid @RequestBody AiNewsDtos.SourceConfigBulkDeleteRequest request,
            @AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(ApiResponse.success(
                aiNewsService.deleteSourceConfigs(request.ids(), user.getUserId())));
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
