package com.caskbycask.domain.producer.controller;

import com.caskbycask.domain.producer.entity.ProducerLogoImage;
import com.caskbycask.domain.producer.repository.ProducerLogoImageRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.TimeUnit;

/**
 * 생산자 로고 이미지 서빙.
 * <p>
 * 저장 시 subPath 첫 세그먼트가 {@code producers} 라 LocalFileStorageService 가
 * {@code /api/producers/images/{file}} URL 을 만든다. ProducerController 의 {@code /{id}} 는
 * 세그먼트가 하나라 경로가 겹치지 않는다.
 * <p>
 * SecurityConfig 는 {@code GET /api/producers/**} 를 이미 permitAll 로 열어 두었다.
 * <p>
 * 파일명이 UUID 기반이라 내용이 바뀌면 이름도 바뀐다 → immutable 로 1년 캐시한다
 * (다른 이미지 서빙 엔드포인트와 동일한 정책 — ReviewImageController 참고).
 */
@Slf4j
@RestController
@RequestMapping("/api/producers/images")
public class ProducerImageController {

    private final Path basePath;
    private final ProducerLogoImageRepository producerLogoImageRepository;

    public ProducerImageController(
            @Value("${storage.local.base-path}") String basePathStr,
            ProducerLogoImageRepository producerLogoImageRepository
    ) {
        this.basePath = Paths.get(basePathStr).toAbsolutePath().normalize();
        this.producerLogoImageRepository = producerLogoImageRepository;
    }

    @GetMapping("/{savedFileName}")
    public ResponseEntity<Resource> serveLogo(@PathVariable String savedFileName) {
        // [보안] Path Traversal 방어: ../ 등 경로 탐색 문자 사전 차단
        if (savedFileName.contains("..") || savedFileName.contains("/") || savedFileName.contains("\\")) {
            throw new CustomException(ErrorCode.INVALID_FILE_PATH);
        }

        ProducerLogoImage image = producerLogoImageRepository.findBySavedFileName(savedFileName)
                .orElseThrow(() -> new CustomException(ErrorCode.DISTILLERY_LOGO_NOT_FOUND));

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
            throw new CustomException(ErrorCode.DISTILLERY_LOGO_NOT_FOUND);
        }

        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic().immutable())
                .header("X-Content-Type-Options", "nosniff")
                .contentType(MediaType.parseMediaType(image.getMimeType()))
                .body(resource);
    }
}
