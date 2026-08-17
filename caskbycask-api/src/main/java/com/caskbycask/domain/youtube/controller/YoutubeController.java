package com.caskbycask.domain.youtube.controller;

import com.caskbycask.domain.youtube.dto.YoutubeChannelResponse;
import com.caskbycask.domain.youtube.dto.YoutubeVideoResponse;
import com.caskbycask.domain.youtube.service.YoutubeGalleryService;
import com.caskbycask.global.response.ApiResponse;
import com.caskbycask.global.response.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** 공개 유튜브 갤러리. 비회원도 볼 수 있다. */
@RestController
@RequestMapping("/api/youtube")
@RequiredArgsConstructor
public class YoutubeController {

    /** 목록 한 페이지 상한 — 요청 파라미터로 페이지를 부풀리지 못하게 막는다. */
    private static final int MAX_PAGE_SIZE = 48;

    private final YoutubeGalleryService youtubeGalleryService;

    @GetMapping("/videos")
    public ResponseEntity<ApiResponse<PageResponse<YoutubeVideoResponse>>> getVideos(
            @RequestParam(required = false) Long channelId,
            @RequestParam(required = false) String videoType,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long spiritId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "24") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(
                youtubeGalleryService.getVideos(
                        channelId, videoType, keyword, spiritId,
                        Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE_SIZE))
        )));
    }

    /**
     * 영상 상세 — 경로 식별자는 DB PK 가 아니라 유튜브 영상 ID 다(공유한 주소가 그대로 통하도록).
     * <p>11자 형식을 경로에 못박아 아래 {@code /videos/latest} 같은 정적 경로와 겹치지 않게 한다.
     */
    @GetMapping("/videos/{videoKey:[A-Za-z0-9_-]{11}}")
    public ResponseEntity<ApiResponse<YoutubeVideoResponse>> getVideo(@PathVariable String videoKey) {
        return ResponseEntity.ok(ApiResponse.success(youtubeGalleryService.getVideo(videoKey)));
    }

    @GetMapping("/channels")
    public ResponseEntity<ApiResponse<List<YoutubeChannelResponse>>> getChannels() {
        return ResponseEntity.ok(ApiResponse.success(youtubeGalleryService.getChannels()));
    }

    /** 채널 랜딩 페이지 — 경로에는 핸들(@ 제외) 또는 채널 ID 가 들어온다. */
    @GetMapping("/channels/{ref}")
    public ResponseEntity<ApiResponse<YoutubeChannelResponse>> getChannel(@PathVariable String ref) {
        return ResponseEntity.ok(ApiResponse.success(youtubeGalleryService.getChannel(ref)));
    }

    /** 주류 상세의 '관련 영상'. */
    @GetMapping("/videos/by-spirit/{spiritId}")
    public ResponseEntity<ApiResponse<List<YoutubeVideoResponse>>> getVideosBySpirit(
            @PathVariable Long spiritId
    ) {
        return ResponseEntity.ok(ApiResponse.success(youtubeGalleryService.getVideosBySpirit(spiritId)));
    }
}
