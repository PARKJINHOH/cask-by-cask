package com.caskbycask.domain.tastetree.controller;

import com.caskbycask.domain.tastetree.dto.*;
import com.caskbycask.domain.tastetree.entity.enums.TasteTreeType;
import com.caskbycask.domain.tastetree.service.TasteTreeService;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import com.caskbycask.global.response.PageResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/taste-trees")
@RequiredArgsConstructor
public class TasteTreeController {

    private static final String VIEWER_COOKIE = "di_tt_viewer";
    private final TasteTreeService service;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<TasteTreeSummaryResponse>>> search(
            @RequestParam(required = false) TasteTreeType type,
            @RequestParam(defaultValue = "") String keyword,
            @RequestParam(defaultValue = "LATEST") TasteTreeSort sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                service.searchPublic(type, keyword, sort, page, size, userId(userDetails))));
    }

    @GetMapping("/official")
    public ResponseEntity<ApiResponse<List<TasteTreeSummaryResponse>>> getOfficial(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(service.getOfficialTrees(userId(userDetails))));
    }

    @GetMapping("/facts")
    public ResponseEntity<ApiResponse<List<String>>> getFacts() {
        return ResponseEntity.ok(ApiResponse.success(service.getFacts()));
    }

    @GetMapping("/share/{shareKey}")
    public ResponseEntity<ApiResponse<TasteTreeViewResponse>> getShared(
            @PathVariable String shareKey,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(service.getShared(shareKey, userId(userDetails))));
    }

    @PostMapping("/share/{shareKey}/view")
    public ResponseEntity<ApiResponse<TasteTreeEngagementResponse>> recordView(
            @PathVariable String shareKey,
            @CookieValue(name = VIEWER_COOKIE, required = false) String viewerId,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletRequest request,
            HttpServletResponse response) {
        String resolvedViewerId = viewerId;
        if (resolvedViewerId == null || resolvedViewerId.length() > 64) {
            resolvedViewerId = UUID.randomUUID().toString();
            ResponseCookie cookie = ResponseCookie.from(VIEWER_COOKIE, resolvedViewerId)
                    .httpOnly(true).secure(request.isSecure()).sameSite("Lax").path("/")
                    .maxAge(Duration.ofDays(365)).build();
            response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        }
        return ResponseEntity.ok(ApiResponse.success(
                service.recordView(shareKey, userId(userDetails), resolvedViewerId)));
    }

    @PutMapping("/share/{shareKey}/like")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<TasteTreeEngagementResponse>> like(
            @PathVariable String shareKey,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(service.like(shareKey, userDetails.getUserId())));
    }

    @DeleteMapping("/share/{shareKey}/like")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<TasteTreeEngagementResponse>> unlike(
            @PathVariable String shareKey,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(service.unlike(shareKey, userDetails.getUserId())));
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

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        service.delete(id, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PostMapping(value = "/{id}/images", consumes = "multipart/form-data")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<TasteTreeImageUploadResponse>> uploadImage(
            @PathVariable Long id,
            @RequestParam("image") MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                service.uploadImage(file, id, userDetails.getUserId(), false)));
    }

    private Long userId(CustomUserDetails details) {
        return details == null ? null : details.getUserId();
    }
}
