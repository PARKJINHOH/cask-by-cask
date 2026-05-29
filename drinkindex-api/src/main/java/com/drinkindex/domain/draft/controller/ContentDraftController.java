package com.drinkindex.domain.draft.controller;

import com.drinkindex.domain.draft.dto.DraftResponse;
import com.drinkindex.domain.draft.dto.SaveDraftRequest;
import com.drinkindex.domain.draft.service.ContentDraftService;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// 게시글/공지 작성 임시저장 — 로그인 필수
@RestController
@RequestMapping("/api/drafts")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class ContentDraftController {

    private final ContentDraftService contentDraftService;

    // 저장(생성/갱신)
    @PutMapping
    public ResponseEntity<ApiResponse<DraftResponse>> saveDraft(
            @Valid @RequestBody SaveDraftRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(contentDraftService.save(userDetails.getUserId(), request)));
    }

    // 작성 화면(draftKey)별 목록
    @GetMapping
    public ResponseEntity<ApiResponse<List<DraftResponse>>> listDrafts(
            @RequestParam String draftKey,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(contentDraftService.list(userDetails.getUserId(), draftKey)));
    }

    // 단건 조회(불러오기)
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DraftResponse>> getDraft(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(contentDraftService.getOne(userDetails.getUserId(), id)));
    }

    // 삭제
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDraft(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        contentDraftService.delete(userDetails.getUserId(), id);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
