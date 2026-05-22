package com.drinkindex.domain.byob.controller;

import com.drinkindex.domain.byob.dto.*;
import com.drinkindex.domain.byob.service.ByobService;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/byob")
@RequiredArgsConstructor
public class ByobController {

    private final ByobService byobService;

    // ── 목록 (공개) ───────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ByobListResponse>>> getList(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(byobService.getList(status, page, size)));
    }

    // ── 상세 (공개, 로그인 시 myParticipant 포함) ─────────────────

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ByobDetailResponse>> getDetail(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Long userId = userDetails != null ? userDetails.getUserId() : null;
        return ResponseEntity.ok(ApiResponse.success(byobService.getDetail(id, userId)));
    }

    // ── 생성 (로그인 필수) ────────────────────────────────────────

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ByobDetailResponse>> create(
            @Valid @RequestBody CreateByobRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(byobService.create(userDetails.getUserId(), request)));
    }

    // ── 수정 ──────────────────────────────────────────────────────

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ByobDetailResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateByobRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(byobService.update(id, userDetails.getUserId(), request)));
    }

    // ── 상태 변경 ─────────────────────────────────────────────────

    @PatchMapping("/{id}/status")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> changeStatus(
            @PathVariable Long id,
            @Valid @RequestBody ChangeByobStatusRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        byobService.changeStatus(id, userDetails.getUserId(), request);
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ── 삭제 ──────────────────────────────────────────────────────

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        byobService.delete(id, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ── 참여 신청 ─────────────────────────────────────────────────

    @PostMapping("/{id}/participants")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ByobParticipantResponse>> apply(
            @PathVariable Long id,
            @Valid @RequestBody ApplyByobRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(byobService.apply(id, userDetails.getUserId(), request)));
    }

    // ── 신청 취소 ─────────────────────────────────────────────────

    @DeleteMapping("/{id}/participants/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> cancelApply(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        byobService.cancelApply(id, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ── 참여자 목록 (주최자) ───────────────────────────────────────

    @GetMapping("/{id}/participants")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<ByobParticipantResponse>>> getParticipants(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(byobService.getParticipants(id, userDetails.getUserId())));
    }

    // ── 승인 ──────────────────────────────────────────────────────

    @PatchMapping("/{id}/participants/{pid}/approve")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> approve(
            @PathVariable Long id,
            @PathVariable Long pid,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        byobService.approve(id, pid, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ── 거절 ──────────────────────────────────────────────────────

    @PatchMapping("/{id}/participants/{pid}/reject")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> reject(
            @PathVariable Long id,
            @PathVariable Long pid,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        byobService.reject(id, pid, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ── 제외 ──────────────────────────────────────────────────────

    @PatchMapping("/{id}/participants/{pid}/remove")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> remove(
            @PathVariable Long id,
            @PathVariable Long pid,
            @Valid @RequestBody RemoveParticipantRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        byobService.remove(id, pid, userDetails.getUserId(), request);
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ── 댓글 조회 ─────────────────────────────────────────────────

    @GetMapping("/{id}/comments")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<ByobCommentResponse>>> getComments(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(byobService.getComments(id, userDetails.getUserId())));
    }

    // ── 댓글 작성 ─────────────────────────────────────────────────

    @PostMapping("/{id}/comments")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ByobCommentResponse>> createComment(
            @PathVariable Long id,
            @Valid @RequestBody CreateByobCommentRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(byobService.createComment(id, userDetails.getUserId(), request)));
    }

    // ── 댓글 삭제 ─────────────────────────────────────────────────

    @DeleteMapping("/{id}/comments/{cid}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable Long id,
            @PathVariable Long cid,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        byobService.deleteComment(id, cid, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ── 마이페이지: 주최한 모임 ───────────────────────────────────

    @GetMapping("/my/hosted")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Page<ByobMyHostedResponse>>> getMyHosted(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(byobService.getMyHosted(userDetails.getUserId(), page, size)));
    }

    // ── 마이페이지: 참여한 모임 ───────────────────────────────────

    @GetMapping("/my/joined")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Page<ByobMyJoinedResponse>>> getMyJoined(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(byobService.getMyJoined(userDetails.getUserId(), page, size)));
    }
}
