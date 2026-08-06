package com.caskbycask.domain.producer.controller;

import com.caskbycask.domain.producer.entity.Producer;
import com.caskbycask.domain.producer.repository.ProducerRepository;
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
 * 생산자 로고 이미지 서빙.
 * <p>
 * 저장 시 subPath 첫 세그먼트가 {@code producers} 라 LocalFileStorageService 가
 * {@code /api/producers/images/{file}} URL 을 만든다. ProducerController 의 {@code /{id}} 는
 * 세그먼트가 하나라 경로가 겹치지 않는다.
 * <p>
 * SecurityConfig 는 {@code GET /api/producers/**} 를 이미 permitAll 로 열어 두었다.
 */
@Slf4j
@RestController
@RequestMapping("/api/producers/images")
public class ProducerImageController {

    private final Path basePath;
    private final ProducerRepository producerRepository;

    public ProducerImageController(
            @Value("${storage.local.base-path}") String basePathStr,
            ProducerRepository producerRepository
    ) {
        this.basePath = Paths.get(basePathStr).toAbsolutePath().normalize();
        this.producerRepository = producerRepository;
    }

    @GetMapping("/{savedFileName}")
    public ResponseEntity<Resource> serveLogo(@PathVariable String savedFileName) {
        // [보안] Path Traversal 방어: ../ 등 경로 탐색 문자 사전 차단
        if (savedFileName.contains("..") || savedFileName.contains("/") || savedFileName.contains("\\")) {
            throw new CustomException(ErrorCode.INVALID_FILE_PATH);
        }

        Producer producer = producerRepository.findByLogoSavedFileName(savedFileName)
                .orElseThrow(() -> new CustomException(ErrorCode.DISTILLERY_NOT_FOUND));

        // [보안] Path Traversal 이중 방어: normalize 후 basePath 범위 내부인지 검증
        Path filePath = basePath
                .resolve(producer.getLogoSubPath())
                .resolve(savedFileName)
                .normalize();

        if (!filePath.startsWith(basePath)) {
            log.warn("Path traversal 시도 감지: {}", savedFileName);
            throw new CustomException(ErrorCode.INVALID_FILE_PATH);
        }

        Resource resource = new FileSystemResource(filePath);
        if (!resource.exists() || !resource.isReadable()) {
            throw new CustomException(ErrorCode.DISTILLERY_NOT_FOUND);
        }

        // 저장 시 WebP 로 변환되므로 확장자에서 Content-Type 을 유도한다.
        return ResponseEntity.ok()
                .contentType(mediaTypeOf(savedFileName))
                .body(resource);
    }

    private MediaType mediaTypeOf(String fileName) {
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".webp")) return MediaType.parseMediaType("image/webp");
        if (lower.endsWith(".png"))  return MediaType.IMAGE_PNG;
        if (lower.endsWith(".gif"))  return MediaType.IMAGE_GIF;
        return MediaType.IMAGE_JPEG;
    }
}
