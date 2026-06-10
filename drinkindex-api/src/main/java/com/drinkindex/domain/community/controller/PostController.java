package com.drinkindex.domain.community.controller;

import com.drinkindex.domain.community.dto.*;
import com.drinkindex.domain.community.entity.PostImage;
import com.drinkindex.domain.community.entity.PostVideo;
import com.drinkindex.domain.community.entity.enums.BoardType;
import com.drinkindex.domain.community.service.PostImageService;
import com.drinkindex.domain.community.service.PostService;
import com.drinkindex.domain.community.service.PostVideoService;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import com.drinkindex.global.response.ApiResponse;
import com.drinkindex.global.response.PageResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;
    private final PostImageService postImageService;
    private final PostVideoService postVideoService;
    private final UserRepository userRepository;

    // ─── 목록 ───────────────────────────────────

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<PostListResponse>>> getPosts(
            @RequestParam(required = false) BoardType boardType,
            @RequestParam(required = false) Long prefixId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) PostSort sort,
            @RequestParam(required = false) Long authorId,
            @RequestParam(required = false) Long commentAuthorId,
            @RequestParam(required = false) Long distilleryTagId, // [패치 9] 소식 게시판 증류소 태그 필터
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Long userId = userDetails != null ? userDetails.getUserId() : null;
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(postService.getPosts(boardType, prefixId, keyword, sort,
                        authorId, commentAuthorId, distilleryTagId, userId, page, size))));
    }

    @GetMapping("/best")
    public ResponseEntity<ApiResponse<PageResponse<PostListResponse>>> getBestPosts(
            @RequestParam BoardType boardType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Long userId = userDetails != null ? userDetails.getUserId() : null;
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(postService.getBestPosts(boardType, userId, page, size))));
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
                "media-src 'self'; " +
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

    @GetMapping("/me/scraps")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PageResponse<PostListResponse>>> getMyScraps(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(postService.getMyScraps(userDetails.getUserId(), page, size))));
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

    // ─── 동영상 업로드 ──────────────────────────────────

    @PostMapping("/videos")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PostVideoUploadResponse>> uploadVideo(
            @RequestParam("video") MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                postVideoService.upload(file, userDetails.getUserId())));
    }

    // 동영상 스트리밍 — Range 헤더 기반 HTTP 206 Partial Content (seek 지원)
    @GetMapping("/videos/{savedFileName}")
    public ResponseEntity<StreamingResponseBody> serveVideo(
            @PathVariable String savedFileName,
            @RequestHeader HttpHeaders headers
    ) {
        if (savedFileName.contains("..") || savedFileName.contains("/") || savedFileName.contains("\\")) {
            throw new CustomException(ErrorCode.INVALID_FILE_PATH);
        }

        PostVideo video    = postVideoService.loadForStream(savedFileName);
        Path      filePath = postVideoService.resolveVideoPath(video);
        Resource  resource = new FileSystemResource(filePath);
        long      fileLength;
        try {
            fileLength = resource.contentLength();
        } catch (IOException e) {
            throw new CustomException(ErrorCode.POST_VIDEO_NOT_FOUND);
        }

        MediaType mimeType = MediaType.parseMediaType(video.getMimeType());
        List<HttpRange> ranges = headers.getRange();

        if (ranges.isEmpty()) {
            return ResponseEntity.ok()
                    .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                    .contentLength(fileLength)
                    .contentType(mimeType)
                    .body(out -> {
                        try (FileInputStream fis = new FileInputStream(filePath.toFile())) {
                            fis.transferTo(out);
                        }
                    });
        }

        HttpRange range       = ranges.get(0);
        long      start       = range.getRangeStart(fileLength);
        long      end         = range.getRangeEnd(fileLength);
        long      contentLength = end - start + 1;

        return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT)
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .header(HttpHeaders.CONTENT_RANGE, "bytes " + start + "-" + end + "/" + fileLength)
                .contentLength(contentLength)
                .contentType(mimeType)
                .body(out -> {
                    try (FileInputStream fis = new FileInputStream(filePath.toFile())) {
                        long skipped = 0;
                        while (skipped < start) {
                            long n = fis.skip(start - skipped);
                            if (n <= 0) break;
                            skipped += n;
                        }
                        byte[] buf = new byte[8192];
                        long remaining = contentLength;
                        int read;
                        while (remaining > 0
                                && (read = fis.read(buf, 0, (int) Math.min(buf.length, remaining))) != -1) {
                            out.write(buf, 0, read);
                            remaining -= read;
                        }
                    }
                });
    }

    // local 프로파일 전용 이미지 서빙
    @GetMapping("/images/{savedFileName}")
    @org.springframework.context.annotation.Profile("local")
    public ResponseEntity<Resource> serveImage(@PathVariable String savedFileName) {
        // [보안] Path Traversal 방어
        if (savedFileName.contains("..") || savedFileName.contains("/") || savedFileName.contains("\\")) {
            throw new CustomException(ErrorCode.INVALID_FILE_PATH);
        }
        PostImage image = postImageService.findBySavedFileName(savedFileName);
        Resource resource = postImageService.loadAsResource(savedFileName, image.getSubPath());
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(image.getMimeType())).body(resource);
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
