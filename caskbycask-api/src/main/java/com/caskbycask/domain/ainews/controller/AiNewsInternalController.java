package com.caskbycask.domain.ainews.controller;

import com.caskbycask.domain.ainews.dto.AiNewsDtos;
import com.caskbycask.domain.ainews.dto.AiNewsDraftRequestDtos;
import com.caskbycask.domain.ainews.service.AiNewsService;
import com.caskbycask.domain.ainews.service.AiNewsDraftRequestService;
import com.caskbycask.domain.ainews.entity.enums.AiNewsArticleType;
import com.caskbycask.domain.community.dto.PostImageUploadResponse;
import com.caskbycask.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/internal/ai-news")
@RequiredArgsConstructor
public class AiNewsInternalController {

    private final AiNewsService aiNewsService;
    private final AiNewsDraftRequestService draftRequestService;

    @GetMapping("/config")
    public ResponseEntity<ApiResponse<AiNewsDtos.InternalConfigResponse>> config() {
        return ResponseEntity.ok(ApiResponse.success(aiNewsService.internalConfig()));
    }

    @GetMapping("/dedupe")
    public ResponseEntity<ApiResponse<AiNewsDtos.DedupeCheckResponse>> dedupe(
            @RequestParam String dedupeKey,
            @RequestParam(required = false) String canonicalUrlHash,
            @RequestParam(required = false) String semanticFingerprint,
            @RequestParam(required = false) AiNewsArticleType type) {
        return ResponseEntity.ok(ApiResponse.success(
                aiNewsService.checkDuplicate(dedupeKey, canonicalUrlHash, semanticFingerprint, type)));
    }

    @PostMapping("/articles")
    public ResponseEntity<ApiResponse<AiNewsDtos.ArticleDetailResponse>> ingest(
            @Valid @RequestBody AiNewsDtos.ArticleUpsertRequest request) {
        return ResponseEntity.ok(ApiResponse.success(aiNewsService.ingest(request)));
    }

    @PostMapping("/articles/{id}/rewrite-result")
    public ResponseEntity<ApiResponse<AiNewsDtos.ArticleDetailResponse>> completeRewrite(
            @PathVariable Long id,
            @Valid @RequestBody AiNewsDtos.RewriteResultRequest request) {
        return ResponseEntity.ok(ApiResponse.success(aiNewsService.completeRewrite(id, request)));
    }

    @PostMapping("/duplicates")
    public ResponseEntity<ApiResponse<AiNewsDtos.ArticleDetailResponse>> recordDuplicate(
            @Valid @RequestBody AiNewsDtos.DuplicateSkipRequest request) {
        return ResponseEntity.ok(ApiResponse.success(aiNewsService.recordSkippedDuplicate(request)));
    }

    @PostMapping("/topics/suggestions")
    public ResponseEntity<ApiResponse<AiNewsDtos.TopicResponse>> suggestTopic(
            @Valid @RequestBody AiNewsDtos.TopicUpsertRequest request) {
        return ResponseEntity.ok(ApiResponse.success(aiNewsService.createTopic(request, null)));
    }

    @PostMapping("/usage")
    public ResponseEntity<ApiResponse<Void>> usage(@Valid @RequestBody AiNewsDtos.UsageRequest request) {
        aiNewsService.recordUsage(request);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @GetMapping("/draft-requests/next")
    public ResponseEntity<ApiResponse<AiNewsDraftRequestDtos.Response>> nextDraftRequest() {
        return ResponseEntity.ok(ApiResponse.success(draftRequestService.nextPending()));
    }

    @PostMapping("/draft-requests/{id}/complete")
    public ResponseEntity<ApiResponse<AiNewsDraftRequestDtos.Response>> completeDraftRequest(
            @PathVariable Long id, @Valid @RequestBody AiNewsDtos.ArticleUpsertRequest request) {
        return ResponseEntity.ok(ApiResponse.success(draftRequestService.complete(id, request)));
    }

    @PostMapping("/draft-requests/{id}/fail")
    public ResponseEntity<ApiResponse<AiNewsDraftRequestDtos.Response>> failDraftRequest(
            @PathVariable Long id, @Valid @RequestBody AiNewsDraftRequestDtos.FailRequest request) {
        return ResponseEntity.ok(ApiResponse.success(draftRequestService.fail(id, request)));
    }

    @PatchMapping("/sources/{id}/crawl-result")
    public ResponseEntity<ApiResponse<AiNewsDtos.SourceConfigResponse>> sourceCrawlResult(
            @PathVariable Long id,
            @Valid @RequestBody AiNewsDtos.SourceCrawlResultRequest request) {
        return ResponseEntity.ok(ApiResponse.success(aiNewsService.recordSourceCrawlResult(id, request)));
    }

    @PostMapping("/runs")
    public ResponseEntity<ApiResponse<AiNewsDtos.RunResponse>> startRun(
            @Valid @RequestBody AiNewsDtos.RunStartRequest request) {
        return ResponseEntity.ok(ApiResponse.success(aiNewsService.startRun(request)));
    }

    @PatchMapping("/runs/{id}/finish")
    public ResponseEntity<ApiResponse<AiNewsDtos.RunResponse>> finishRun(
            @PathVariable Long id,
            @Valid @RequestBody AiNewsDtos.RunFinishRequest request) {
        return ResponseEntity.ok(ApiResponse.success(aiNewsService.finishRun(id, request)));
    }

    @PostMapping(value = "/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<PostImageUploadResponse>> uploadImage(
            @RequestPart("image") MultipartFile image) {
        return ResponseEntity.ok(ApiResponse.success(aiNewsService.uploadInternalImage(image)));
    }
}
