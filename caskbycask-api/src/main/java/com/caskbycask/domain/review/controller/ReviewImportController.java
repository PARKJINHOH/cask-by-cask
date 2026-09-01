package com.caskbycask.domain.review.controller;

import com.caskbycask.domain.review.dto.ReviewImportFetchRequest;
import com.caskbycask.domain.review.dto.ReviewImportFetchResponse;
import com.caskbycask.domain.review.service.ReviewImportService;
import com.caskbycask.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 다른 커뮤니티에 써 둔 자기 리뷰를 옮겨 올 때, 공개 게시글 본문을 대신 읽어 준다.
 * 브라우저는 CORS 때문에 외부 게시글을 직접 못 읽어서 서버를 한 번 거친다.
 */
@RestController
@RequestMapping("/api/review-imports")
@RequiredArgsConstructor
public class ReviewImportController {

    private final ReviewImportService reviewImportService;

    /** 본문 텍스트만 돌려준다. 저장하지 않고 이미지도 가져오지 않는다. */
    @PostMapping("/fetch")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ReviewImportFetchResponse>> fetch(
            @Valid @RequestBody ReviewImportFetchRequest request) {
        return ResponseEntity.ok(ApiResponse.success(reviewImportService.fetch(request.url())));
    }
}
