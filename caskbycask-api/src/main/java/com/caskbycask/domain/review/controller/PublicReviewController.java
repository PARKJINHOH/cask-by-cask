package com.caskbycask.domain.review.controller;

import com.caskbycask.domain.review.dto.PublicReviewResponse;
import com.caskbycask.domain.review.service.PublicReviewService;
import com.caskbycask.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/reviews")
@RequiredArgsConstructor
public class PublicReviewController {

    private final PublicReviewService publicReviewService;

    @GetMapping("/{reviewId}")
    public ResponseEntity<ApiResponse<PublicReviewResponse>> get(@PathVariable Long reviewId) {
        return ResponseEntity.ok(ApiResponse.success(publicReviewService.get(reviewId)));
    }
}
