package com.caskbycask.domain.youtube.controller;

import com.caskbycask.domain.youtube.dto.*;
import com.caskbycask.domain.youtube.service.YoutubeAdminService;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import com.caskbycask.global.response.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** 관리자 유튜브 갤러리 운영. */
@RestController
@RequestMapping("/api/admin/youtube")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
public class YoutubeAdminController {

    private final YoutubeAdminService youtubeAdminService;

    // ─── 채널 ──────────────────────────────────────────────

    @GetMapping("/channels")
    public ResponseEntity<ApiResponse<PageResponse<AdminYoutubeChannelResponse>>> getChannels(
            @RequestParam(required = false) Boolean visible,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(
                youtubeAdminService.getChannels(visible, keyword, page, size))));
    }

    @GetMapping("/channels/{id}")
    public ResponseEntity<ApiResponse<AdminYoutubeChannelResponse>> getChannel(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(youtubeAdminService.getChannel(id)));
    }

    @PostMapping("/channels")
    public ResponseEntity<ApiResponse<AdminYoutubeChannelResponse>> createChannel(
            @Valid @RequestBody CreateYoutubeChannelRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                youtubeAdminService.createChannel(request, userDetails.getUserId())));
    }

    @PatchMapping("/channels/{id}")
    public ResponseEntity<ApiResponse<AdminYoutubeChannelResponse>> updateChannel(
            @PathVariable Long id,
            @Valid @RequestBody UpdateYoutubeChannelRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(youtubeAdminService.updateChannel(id, request)));
    }

    @DeleteMapping("/channels/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteChannel(@PathVariable Long id) {
        youtubeAdminService.deleteChannel(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PatchMapping("/channels/order")
    public ResponseEntity<ApiResponse<Void>> reorderChannels(@RequestBody List<Long> orderedIds) {
        youtubeAdminService.reorderChannels(orderedIds);
        return ResponseEntity.ok(ApiResponse.success());
    }

    /** 지금 수집 — 채널 하나. 실패도 200 으로 내려 사유를 화면에 그대로 보여 준다. */
    @PostMapping("/channels/{id}/sync")
    public ResponseEntity<ApiResponse<YoutubeSyncResultResponse>> syncChannel(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(youtubeAdminService.syncChannel(id)));
    }

    /** 채널명·프로필 이미지를 유튜브에서 다시 읽어 온다. */
    @PostMapping("/channels/{id}/refresh-profile")
    public ResponseEntity<ApiResponse<AdminYoutubeChannelResponse>> refreshChannelProfile(
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(ApiResponse.success(youtubeAdminService.refreshChannelProfile(id)));
    }

    /** 지금 수집 — 전체. */
    @PostMapping("/sync")
    public ResponseEntity<ApiResponse<YoutubeSyncResultResponse>> syncAll() {
        return ResponseEntity.ok(ApiResponse.success(youtubeAdminService.syncAll()));
    }

    /**
     * 삭제·비공개된 영상 지금 점검.
     * <p>RSS 는 최신 15편만 담아 옛 영상의 생사를 알려 주지 않으므로 이 경로가 따로 있다.
     * 정기 배치(기본 매일 새벽)와 같은 로직이다.
     */
    @PostMapping("/availability-check")
    public ResponseEntity<ApiResponse<YoutubeAvailabilityResultResponse>> checkAvailability() {
        return ResponseEntity.ok(ApiResponse.success(youtubeAdminService.checkAvailability()));
    }

    // ─── 영상 ──────────────────────────────────────────────

    @GetMapping("/videos")
    public ResponseEntity<ApiResponse<PageResponse<AdminYoutubeVideoResponse>>> getVideos(
            @RequestParam(required = false) Long channelId,
            @RequestParam(required = false) Boolean visible,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(
                youtubeAdminService.getVideos(channelId, visible, keyword, page, size))));
    }

    @GetMapping("/videos/{id}")
    public ResponseEntity<ApiResponse<AdminYoutubeVideoResponse>> getVideo(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(youtubeAdminService.getVideo(id)));
    }

    @PostMapping("/videos")
    public ResponseEntity<ApiResponse<AdminYoutubeVideoResponse>> createVideo(
            @Valid @RequestBody CreateYoutubeVideoRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(youtubeAdminService.createVideo(request)));
    }

    @PatchMapping("/videos/{id}")
    public ResponseEntity<ApiResponse<AdminYoutubeVideoResponse>> updateVideo(
            @PathVariable Long id,
            @Valid @RequestBody UpdateYoutubeVideoRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(youtubeAdminService.updateVideo(id, request)));
    }

    /**
     * 자동 수집분은 지워도 다음 수집에서 되살아나므로 <b>숨김 처리</b>된다.
     * 직접 등록분만 실제로 삭제된다.
     */
    @DeleteMapping("/videos/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteVideo(@PathVariable Long id) {
        youtubeAdminService.deleteVideo(id);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
