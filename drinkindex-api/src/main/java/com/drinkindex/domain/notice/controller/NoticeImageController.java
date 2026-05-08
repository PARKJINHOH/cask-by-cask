package com.drinkindex.domain.notice.controller;

import com.drinkindex.domain.notice.entity.NoticeImage;
import com.drinkindex.domain.notice.repository.NoticeImageRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Path;
import java.nio.file.Paths;

// local 프로파일 전용: dev/prod에서는 S3 URL로 직접 접근하므로 불필요
@Slf4j
@RestController
@RequestMapping("/api/notices/images")
@Profile("local")
public class NoticeImageController {

    private final Path basePath;
    private final NoticeImageRepository noticeImageRepository;

    public NoticeImageController(
            @Value("${storage.local.base-path}") String basePathStr,
            NoticeImageRepository noticeImageRepository
    ) {
        this.basePath = Paths.get(basePathStr).toAbsolutePath().normalize();
        this.noticeImageRepository = noticeImageRepository;
    }

    /**
     * 공지사항 이미지 서빙 (local 전용)
     * [보안] Path Traversal 방어: savedFileName에 경로 탐색 문자 포함 시 즉시 거부.
     * [보안] DB mimeType 조회 후 Content-Type 설정 — 브라우저 MIME 스니핑 방지.
     */
    @GetMapping("/{savedFileName}")
    public ResponseEntity<Resource> serveImage(@PathVariable String savedFileName) {
        // [보안] Path Traversal 방어: ../ 등 경로 탐색 문자 사전 차단
        if (savedFileName.contains("..") || savedFileName.contains("/") || savedFileName.contains("\\")) {
            throw new CustomException(ErrorCode.INVALID_FILE_PATH);
        }

        NoticeImage noticeImage = noticeImageRepository.findBySavedFileName(savedFileName)
                .orElseThrow(() -> new CustomException(ErrorCode.NOTICE_IMAGE_NOT_FOUND));

        // [보안] Path Traversal 이중 방어: normalize 후 basePath 범위 내부인지 검증
        Path filePath = basePath
                .resolve(noticeImage.getSubPath())
                .resolve(savedFileName)
                .normalize();

        if (!filePath.startsWith(basePath)) {
            log.warn("Path traversal 시도 감지: {}", savedFileName);
            throw new CustomException(ErrorCode.INVALID_FILE_PATH);
        }

        Resource resource = new FileSystemResource(filePath);
        if (!resource.exists() || !resource.isReadable()) {
            throw new CustomException(ErrorCode.NOTICE_IMAGE_NOT_FOUND);
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(noticeImage.getMimeType()))
                .body(resource);
    }
}
