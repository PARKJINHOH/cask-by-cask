package com.drinkindex.domain.notice.controller;

import com.drinkindex.domain.notice.dto.NoticeDetailResponse;
import com.drinkindex.domain.notice.dto.NoticeListResponse;
import com.drinkindex.domain.notice.entity.NoticeCategory;
import com.drinkindex.domain.notice.service.NoticeService;
import com.drinkindex.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

// 비회원 포함 전체 허용 — SecurityConfig에서 GET /api/notices/** permitAll 설정
@RestController
@RequestMapping("/api/notices")
@RequiredArgsConstructor
public class NoticeController {

    private final NoticeService noticeService;

    /**
     * 공개 공지 목록 조회 (isPinned DESC, createdAt DESC)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<Page<NoticeListResponse>>> getPublishedNotices(
            @RequestParam(required = false) NoticeCategory category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(noticeService.getPublishedNotices(category, page, size))
        );
    }

    /**
     * 공개 공지 상세 조회 + viewCount +1
     * [보안] isPublished=true 조건으로 미발행 공지 직접 접근 차단
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<NoticeDetailResponse>> getPublishedNoticeDetail(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(noticeService.getPublishedNoticeDetail(id))
        );
    }
}
