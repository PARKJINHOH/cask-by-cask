package com.caskbycask.domain.community.controller;

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
import java.util.Map;

// 로컬 디스크에 저장된 이모지 이미지를 서빙. LocalFileStorageService 와 동일하게 모든 프로파일에서 동작.
@Slf4j
@RestController
@RequestMapping("/api/emojis/images")
public class EmojiImageController {

    private static final Map<String, String> MIME_MAP = Map.of(
            "jpg",  "image/jpeg",
            "jpeg", "image/jpeg",
            "png",  "image/png",
            "gif",  "image/gif",
            "webp", "image/webp"
    );

    private final Path basePath;

    public EmojiImageController(@Value("${storage.local.base-path}") String basePathStr) {
        this.basePath = Paths.get(basePathStr).toAbsolutePath().normalize();
    }

    @GetMapping("/{savedFileName}")
    public ResponseEntity<Resource> serveImage(@PathVariable String savedFileName) {
        if (savedFileName.contains("..") || savedFileName.contains("/") || savedFileName.contains("\\")) {
            throw new CustomException(ErrorCode.INVALID_FILE_PATH);
        }

        Path filePath = basePath.resolve("emojis").resolve(savedFileName).normalize();
        if (!filePath.startsWith(basePath)) {
            log.warn("Path traversal 시도 감지: {}", savedFileName);
            throw new CustomException(ErrorCode.INVALID_FILE_PATH);
        }

        Resource resource = new FileSystemResource(filePath);
        if (!resource.exists() || !resource.isReadable()) {
            throw new CustomException(ErrorCode.EMOJI_NOT_FOUND);
        }

        String ext = savedFileName.contains(".")
                ? savedFileName.substring(savedFileName.lastIndexOf('.') + 1).toLowerCase()
                : "";
        String mimeType = MIME_MAP.getOrDefault(ext, "application/octet-stream");

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(mimeType))
                .body(resource);
    }
}
