package com.drinkindex.domain.community.controller;

import com.drinkindex.domain.community.dto.*;
import com.drinkindex.domain.community.entity.enums.BoardType;
import com.drinkindex.domain.community.service.PostImageService;
import com.drinkindex.domain.community.service.PostService;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import com.drinkindex.global.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;
    private final PostImageService postImageService;
    private final UserRepository userRepository;

    // ─── 목록 ───────────────────────────────────

    @GetMapping
    public ResponseEntity<ApiResponse<Page<PostListResponse>>> getPosts(
            @RequestParam BoardType boardType,
            @RequestParam(required = false) Long prefixId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) PostSort sort,
            @RequestParam(required = false) Long authorId,
            @RequestParam(required = false) Long commentAuthorId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                postService.getPosts(boardType, prefixId, keyword, sort,
                        authorId, commentAuthorId, page, size)));
    }

    @GetMapping("/best")
    public ResponseEntity<ApiResponse<Page<PostListResponse>>> getBestPosts(
            @RequestParam BoardType boardType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                postService.getBestPosts(boardType, page, size)));
    }

    // ─── 상세 ───────────────────────────────────

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PostDetailResponse>> getPost(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        // 동영상 CSP: 이 엔드포인트 응답에만 frame-src 완화
        response.setHeader("Content-Security-Policy",
                "default-src 'self'; " +
                "script-src 'self'; " +
                "style-src 'self' 'unsafe-inline'; " +
                "img-src 'self' data: blob:; " +
                "font-src 'self'; " +
                "frame-src https://www.youtube.com https://player.vimeo.com; " +
                "frame-ancestors 'none'; " +
                "object-src 'none'; " +
                "base-uri 'self';"
        );

        Long userId   = userDetails != null ? userDetails.getUserId() : null;
        boolean isAdmin = userDetails != null && "ROLE_ADMIN".equals(
                userDetails.getAuthorities().iterator().next().getAuthority());
        String clientIp = resolveClientIp(request);

        return ResponseEntity.ok(ApiResponse.success(
                postService.getPost(id, userId, isAdmin, clientIp)));
    }

    // ─── 작성 / 수정 / 삭제 ─────────────────────

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PostDetailResponse>> createPost(
            @Valid @RequestBody CreatePostRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                postService.createPost(request, userDetails.getUserId())));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PostDetailResponse>> updatePost(
            @PathVariable Long id,
            @Valid @RequestBody UpdatePostRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                postService.updatePost(id, request, userDetails.getUserId())));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> deletePost(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        postService.deletePost(id, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ─── 신고 ───────────────────────────────────

    @PostMapping("/{id}/reports")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> reportPost(
            @PathVariable Long id,
            @RequestBody PostReportRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        postService.reportPost(id, request, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ─── 추천 / 비추천 ───────────────────────────

    @PostMapping("/{id}/likes")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> likePost(
            @PathVariable Long id,
            @Valid @RequestBody PostLikeRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        postService.likePost(id, request.getIsLike(), userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ─── 스크랩 ─────────────────────────────────

    @PostMapping("/{id}/scraps")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> toggleScrap(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        postService.toggleScrap(id, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ─── 숨김 / 복구 (모더레이터 이상) ──────────────

    @PatchMapping("/{id}/hide")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MODERATOR')")
    public ResponseEntity<ApiResponse<Void>> hidePost(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User actor = userRepository.findById(userDetails.getUserId())
                .orElseThrow();
        postService.hidePost(id, actor);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PatchMapping("/{id}/restore-hide")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','MODERATOR')")
    public ResponseEntity<ApiResponse<Void>> restorePostHide(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        User actor = userRepository.findById(userDetails.getUserId())
                .orElseThrow();
        postService.restorePostHide(id, actor);
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ─── 이미지 업로드 ───────────────────────────

    @PostMapping("/images")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PostImageUploadResponse>> uploadImage(
            @RequestParam("image") MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                postImageService.upload(file, userDetails.getUserId())));
    }

    // local 프로파일 전용 이미지 서빙
    @GetMapping("/images/{savedFileName}")
    @Profile("local")
    public ResponseEntity<Resource> serveImage(@PathVariable String savedFileName) {
        // [보안] Path Traversal 방어
        if (savedFileName.contains("..") || savedFileName.contains("/") || savedFileName.contains("\\")) {
            throw new CustomException(ErrorCode.INVALID_FILE_PATH);
        }
        Resource resource = postImageService.loadAsResource(savedFileName);
        return ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG).body(resource);
    }

    // ─── Private ────────────────────────────────

    private String resolveClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
