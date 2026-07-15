package com.caskbycask.domain.tastetree.controller;

import com.caskbycask.domain.tastetree.dto.*;
import com.caskbycask.domain.tastetree.service.TasteTreeService;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/taste-trees")
@RequiredArgsConstructor
public class TasteTreeController {

    private final TasteTreeService service;

    @GetMapping("/official")
    public ResponseEntity<ApiResponse<List<TasteTreeSummaryResponse>>> getOfficial(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(service.getOfficialTrees(userId(userDetails))));
    }

    @GetMapping("/share/{shareKey}")
    public ResponseEntity<ApiResponse<TasteTreeViewResponse>> getShared(
            @PathVariable String shareKey,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(service.getShared(shareKey, userId(userDetails))));
    }

    @PostMapping("/share/{shareKey}/complete")
    public ResponseEntity<ApiResponse<TasteTreeResultResponse>> complete(
            @PathVariable String shareKey,
            @Valid @RequestBody TasteTreeCompleteRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(service.complete(shareKey, request, userId(userDetails))));
    }

    @GetMapping("/results/{shareKey}")
    public ResponseEntity<ApiResponse<TasteTreeResultResponse>> getResult(@PathVariable String shareKey) {
        return ResponseEntity.ok(ApiResponse.success(service.getResult(shareKey)));
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<MyTasteTreesResponse>> getMine(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(service.getMyTrees(userDetails.getUserId())));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<TasteTreeViewResponse>> getMineDetail(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(service.getMine(id, userDetails.getUserId())));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<TasteTreeViewResponse>> create(
            @Valid @RequestBody TasteTreeSaveRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(service.create(request, userDetails.getUserId())));
    }

    @PutMapping("/{id}/draft")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<TasteTreeViewResponse>> saveDraft(
            @PathVariable Long id,
            @Valid @RequestBody TasteTreeSaveRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(service.saveDraft(id, request, userDetails.getUserId())));
    }

    @PostMapping("/{id}/publish")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<TasteTreeViewResponse>> publish(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(service.publish(id, userDetails.getUserId())));
    }

    @PostMapping("/share/{shareKey}/bookmark")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<TasteTreeBookmarkResponse>> bookmark(
            @PathVariable String shareKey,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(service.toggleBookmark(shareKey, userDetails.getUserId())));
    }

    @PostMapping("/share/{shareKey}/clone")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<TasteTreeViewResponse>> cloneTree(
            @PathVariable String shareKey,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(service.cloneTree(shareKey, userDetails.getUserId())));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        service.delete(id, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PostMapping(value = "/images", consumes = "multipart/form-data")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<TasteTreeImageUploadResponse>> uploadImage(
            @RequestParam("image") MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(service.uploadImage(file, userDetails.getUserId())));
    }

    private Long userId(CustomUserDetails details) {
        return details == null ? null : details.getUserId();
    }
}
