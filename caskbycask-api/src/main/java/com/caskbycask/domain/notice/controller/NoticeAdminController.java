package com.caskbycask.domain.notice.controller;

import com.caskbycask.domain.notice.dto.*;
import com.caskbycask.domain.notice.dto.NoticeAdminDetailResponse;
import com.caskbycask.domain.notice.entity.NoticeCategory;
import com.caskbycask.domain.notice.service.NoticeService;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import com.caskbycask.global.response.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/notices")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
public class NoticeAdminController {

    private final NoticeService noticeService;

    // ─── 공지 CRUD ───────────────────────────────────────

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<NoticeAdminDetailResponse>> getNoticeDetail(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(noticeService.getNoticeForAdmin(id))
        );
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<NoticeListResponse>>> getAllNotices(
            @RequestParam(required = false) NoticeCategory category,
            @RequestParam(required = false) Boolean isPublished,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(PageResponse.from(noticeService.getAllNoticesForAdmin(category, isPublished, page, size)))
        );
    }

    @PostMapping
    public ResponseEntity<ApiResponse<NoticeDetailResponse>> createNotice(
            @Valid @RequestBody CreateNoticeRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(noticeService.createNotice(request, userDetails.getUserId()))
        );
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<NoticeDetailResponse>> updateNotice(
            @PathVariable Long id,
            @Valid @RequestBody UpdateNoticeRequest request
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(noticeService.updateNotice(id, request))
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteNotice(@PathVariable Long id) {
        noticeService.deleteNotice(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ─── 이미지 업로드/삭제 ────────────────────────────

    // [보안] 검증 순서: 크기 → 내용(Magic Bytes) 기반 포맷 판별 → 판별된 확장자로 UUID 파일명
    @PostMapping("/images")
    public ResponseEntity<ApiResponse<NoticeImageResponse>> uploadImage(
            @RequestParam("image") MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(noticeService.uploadImage(file, userDetails.getUserId()))
        );
    }

    /**
     * 이미지 삭제
     * [보안] isUsed=true(공지 본문에 사용 중)이면 삭제 불가 → 본문에서 제거 후 삭제 유도
     */
    @DeleteMapping("/images/{imageId}")
    public ResponseEntity<ApiResponse<Void>> deleteImage(@PathVariable Long imageId) {
        noticeService.deleteImage(imageId);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PutMapping("/display-orders")
    public ResponseEntity<ApiResponse<Void>> updateDisplayOrders(
            @Valid @RequestBody UpdateNoticeDisplayOrdersRequest request
    ) {
        noticeService.updateDisplayOrders(request.getNoticeIds());
        return ResponseEntity.ok(ApiResponse.success());
    }
}
