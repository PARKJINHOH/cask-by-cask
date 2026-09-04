package com.caskbycask.domain.venue.controller;

import com.caskbycask.domain.venue.dto.VenueCommentImageResponse;
import com.caskbycask.domain.venue.dto.VenueCommentRequest;
import com.caskbycask.domain.venue.dto.VenueCommentResponse;
import com.caskbycask.domain.venue.service.VenueCommentService;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import com.caskbycask.global.storage.ImagePlanValidator;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 장소 댓글.
 *
 * <p>사진이 함께 올라오므로 작성·수정은 멀티파트다. 수정은 {@code imagePlan} 으로
 * "유지·재정렬·교체"를 한 번에 표현한다 — 별도 업로드 엔드포인트를 두면 폼을 벗어났을 때
 * 주인 없는 파일이 남고, 그걸 치우는 배치가 또 필요해진다.
 */
@RestController
@RequestMapping("/api/venues")
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "venue", name = "enabled", havingValue = "true")
public class VenueCommentController {

    private final VenueCommentService venueCommentService;

    @GetMapping("/{venueId:[0-9]+}/comments")
    public ResponseEntity<ApiResponse<List<VenueCommentResponse>>> list(@PathVariable Long venueId) {
        return ResponseEntity.ok(ApiResponse.success(venueCommentService.getComments(venueId)));
    }

    /** 사진 탭 — 그 장소의 모든 댓글에 달린 사진을 최신순으로 모은다. */
    @GetMapping("/{venueId:[0-9]+}/gallery")
    public ResponseEntity<ApiResponse<List<VenueCommentImageResponse>>> gallery(
            @PathVariable Long venueId) {
        return ResponseEntity.ok(ApiResponse.success(venueCommentService.getGallery(venueId)));
    }

    @PostMapping(value = "/{venueId:[0-9]+}/comments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<VenueCommentResponse>> create(
            @PathVariable Long venueId,
            @Valid @RequestPart("request") VenueCommentRequest request,
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                venueCommentService.create(venueId, userDetails.getUserId(), request, images)));
    }

    @PatchMapping(value = "/comments/{commentId:[0-9]+}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<VenueCommentResponse>> update(
            @PathVariable Long commentId,
            @Valid @RequestPart("request") VenueCommentRequest request,
            @RequestPart(value = "imagePlan", required = false) List<ImagePlanValidator.PlanItem> imagePlan,
            @RequestPart(value = "images", required = false) List<MultipartFile> images,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(venueCommentService.update(
                commentId, userDetails.getUserId(), request, imagePlan, images)));
    }

    @DeleteMapping("/comments/{commentId:[0-9]+}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long commentId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        venueCommentService.delete(commentId, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }
}
