package com.caskbycask.domain.review.controller;

import com.caskbycask.domain.review.dto.PublicReviewResponse;
import com.caskbycask.domain.review.dto.RecentReviewResponse;
import com.caskbycask.domain.review.service.PublicReviewService;
import com.caskbycask.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/public/reviews")
@RequiredArgsConstructor
public class PublicReviewController {

    private final PublicReviewService publicReviewService;

    /** 메인 "최근 등록된 리뷰" — 마스터 주류 단위로 중복 없이 최신순 조회 */
    @GetMapping("/recent")
    public ResponseEntity<ApiResponse<List<RecentReviewResponse>>> getRecent(
            @RequestParam(required = false) Integer size) {
        return ResponseEntity.ok(ApiResponse.success(publicReviewService.getRecent(size)));
    }

    /** 메인 홈 사이드바 "등록된 리뷰" 개수 — 정적 경로라 /{reviewId} 보다 먼저 매칭된다 */
    @GetMapping("/count")
    public ResponseEntity<ApiResponse<Long>> count() {
        return ResponseEntity.ok(ApiResponse.success(publicReviewService.countAll()));
    }

    @GetMapping("/{reviewId}")
    public ResponseEntity<ApiResponse<PublicReviewResponse>> get(@PathVariable Long reviewId) {
        return ResponseEntity.ok(ApiResponse.success(publicReviewService.get(reviewId)));
    }
}
