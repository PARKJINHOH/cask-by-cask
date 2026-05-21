package com.drinkindex.domain.community.controller;

import com.drinkindex.domain.community.dto.AdminDeletePostRequest;
import com.drinkindex.domain.community.dto.PostDetailResponse;
import com.drinkindex.domain.community.dto.PostReportAdminResponse;
import com.drinkindex.domain.community.entity.enums.ReportStatus;
import com.drinkindex.domain.community.service.PostService;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/posts")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
public class PostAdminController {

    private final PostService postService;

    @GetMapping("/reports")
    public ResponseEntity<ApiResponse<Page<PostReportAdminResponse>>> getReports(
            @RequestParam(required = false) ReportStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(postService.getReports(status, page, size)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePost(
            @PathVariable Long id,
            @RequestBody(required = false) AdminDeletePostRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        String reason = request != null ? request.getDeleteReason() : null;
        postService.adminDeletePost(id, userDetails.getUserId(), reason);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PostMapping("/{deletedPostId}/restore")
    public ResponseEntity<ApiResponse<PostDetailResponse>> restore(@PathVariable Long deletedPostId) {
        return ResponseEntity.ok(ApiResponse.success(postService.restorePost(deletedPostId)));
    }

    @PatchMapping("/{id}/unlock")
    public ResponseEntity<ApiResponse<Void>> unlock(@PathVariable Long id) {
        postService.unlockPost(id);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
