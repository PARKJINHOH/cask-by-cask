package com.caskbycask.domain.ainews.controller;

import com.caskbycask.domain.ainews.dto.AiNewsDtos;
import com.caskbycask.domain.ainews.service.AiNewsService;
import com.caskbycask.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * 크롤러 전용 API. 크롤러가 하는 일은 <b>소재를 물어다 놓는 것</b>뿐이다 —
 * 본문 작성도, 이미지 생성도, 발행도 하지 않는다.
 */
@RestController
@RequestMapping("/api/internal/ai-news")
@RequiredArgsConstructor
public class AiNewsInternalController {

    private final AiNewsService aiNewsService;

    @GetMapping("/config")
    public ResponseEntity<ApiResponse<AiNewsDtos.InternalConfigResponse>> config() {
        return ResponseEntity.ok(ApiResponse.success(aiNewsService.internalConfig()));
    }

    @GetMapping("/dedupe")
    public ResponseEntity<ApiResponse<AiNewsDtos.DedupeCheckResponse>> dedupe(
            @RequestParam String dedupeKey,
            @RequestParam(required = false) String canonicalUrlHash) {
        return ResponseEntity.ok(ApiResponse.success(
                aiNewsService.checkDuplicate(dedupeKey, canonicalUrlHash)));
    }

    @PostMapping("/leads")
    public ResponseEntity<ApiResponse<AiNewsDtos.ArticleDetailResponse>> ingestLead(
            @Valid @RequestBody AiNewsDtos.LeadIngestRequest request) {
        return ResponseEntity.ok(ApiResponse.success(aiNewsService.ingestLead(request)));
    }

    @PostMapping("/usage")
    public ResponseEntity<ApiResponse<Void>> usage(@Valid @RequestBody AiNewsDtos.UsageRequest request) {
        aiNewsService.recordUsage(request);
        return ResponseEntity.ok(ApiResponse.success());
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
}
