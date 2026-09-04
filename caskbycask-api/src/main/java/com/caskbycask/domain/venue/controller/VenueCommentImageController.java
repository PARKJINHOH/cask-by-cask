package com.caskbycask.domain.venue.controller;

import com.caskbycask.domain.venue.repository.VenueCommentImageRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.concurrent.TimeUnit;

/**
 * 장소 댓글 사진 서빙.
 *
 * <p>경로가 {@code /api/venues/images/...} 인 것은 저장 디렉토리에서 자동으로 결정된다
 * (LocalFileStorageService.buildUrl — subPath 첫 세그먼트가 URL 프리픽스가 된다).
 *
 * <p>파일명이 UUID 라 열거할 수 없고, 저장 시 WebP 로 재인코딩되어 EXIF 가 제거된 상태다.
 * 공개 기능 플래그와 무관하게 살려 둔다 — 관리자가 신고된 사진을 확인해야 하기 때문이다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/venues/images")
public class VenueCommentImageController {

    private final VenueCommentImageRepository imageRepository;
    private final FileStorageService fileStorageService;

    @GetMapping("/{savedFileName:.+}")
    public ResponseEntity<Resource> serve(@PathVariable String savedFileName) {
        // [보안] Path Traversal 방어 — 파일명에 경로 구분자가 섞이면 즉시 거절한다.
        if (savedFileName.contains("..") || savedFileName.contains("/")
                || savedFileName.contains("\\")) {
            throw new CustomException(ErrorCode.INVALID_FILE_PATH);
        }
        var image = imageRepository.findBySavedFileName(savedFileName)
                .orElseThrow(() -> new CustomException(ErrorCode.VENUE_COMMENT_IMAGE_NOT_FOUND));
        Resource resource = fileStorageService.loadAsResource(
                image.getSavedFileName(), image.getSubPath());
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic().immutable())
                .header("X-Content-Type-Options", "nosniff")
                .contentType(MediaType.parseMediaType(image.getMimeType()))
                .body(resource);
    }
}
