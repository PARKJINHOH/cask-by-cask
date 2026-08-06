package com.caskbycask.domain.photocard.controller;

import com.caskbycask.domain.photocard.entity.PhotoCardImage;
import com.caskbycask.domain.photocard.repository.PhotoCardImageRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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

/**
 * 포토카드 템플릿 미리보기 · 이미지 레이어 서빙.
 * <p>
 * 저장 URL 이 {@code /api/photo-cards/images/{파일명}} 이라 연월 디렉토리가 경로에 없어,
 * 파일명으로 DB 에서 저장 하위 경로를 복원한다(BannerImageController 와 같은 방식).
 */
@Slf4j
@RestController
@RequestMapping("/api/photo-cards/images")
public class PhotoCardImageController {

    private final Path basePath;
    private final PhotoCardImageRepository imageRepository;

    public PhotoCardImageController(
            @Value("${storage.local.base-path}") String basePathStr,
            PhotoCardImageRepository imageRepository
    ) {
        this.basePath = Paths.get(basePathStr).toAbsolutePath().normalize();
        this.imageRepository = imageRepository;
    }

    @GetMapping("/{savedFileName}")
    public ResponseEntity<Resource> serve(@PathVariable String savedFileName) {
        // [보안] Path Traversal 방어: ../ 등 경로 탐색 문자 사전 차단
        if (savedFileName.contains("..") || savedFileName.contains("/") || savedFileName.contains("\\")) {
            throw new CustomException(ErrorCode.INVALID_FILE_PATH);
        }

        PhotoCardImage image = imageRepository.findBySavedFileName(savedFileName)
                .orElseThrow(() -> new CustomException(ErrorCode.PHOTO_CARD_IMAGE_NOT_FOUND));

        // [보안] Path Traversal 이중 방어: normalize 후 basePath 범위 내부인지 검증
        Path filePath = basePath
                .resolve(image.getSubPath())
                .resolve(savedFileName)
                .normalize();
        if (!filePath.startsWith(basePath)) {
            log.warn("Path traversal 시도 감지: {}", savedFileName);
            throw new CustomException(ErrorCode.INVALID_FILE_PATH);
        }

        Resource resource = new FileSystemResource(filePath);
        if (!resource.exists() || !resource.isReadable()) {
            throw new CustomException(ErrorCode.PHOTO_CARD_IMAGE_NOT_FOUND);
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(image.getMimeType()))
                .body(resource);
    }
}
