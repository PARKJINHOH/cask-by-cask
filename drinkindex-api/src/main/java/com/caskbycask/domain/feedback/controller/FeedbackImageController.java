package com.caskbycask.domain.feedback.controller;

import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
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

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

// local 프로파일 전용: dev/prod 에서는 S3 URL 로 직접 접근
@Slf4j
@RestController
@RequestMapping("/api/feedbacks/images")
@Profile("local")
public class FeedbackImageController {

    private static final Map<String, String> MIME_MAP = Map.of(
            "jpg", "image/jpeg",
            "jpeg", "image/jpeg",
            "png", "image/png",
            "webp", "image/webp",
            "gif", "image/gif"
    );

    private final Path basePath;

    public FeedbackImageController(@Value("${storage.local.base-path}") String basePathStr) {
        this.basePath = Paths.get(basePathStr).resolve("feedbacks").toAbsolutePath().normalize();
    }

    @GetMapping("/{filename}")
    public ResponseEntity<Resource> serveImage(@PathVariable String filename) {
        // [보안] Path Traversal 방어
        if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            throw new CustomException(ErrorCode.INVALID_FILE_PATH);
        }

        try {
            if (Files.exists(basePath)) {
                Path found = Files.walk(basePath, 2)
                        .filter(p -> p.getFileName().toString().equals(filename))
                        .filter(p -> p.startsWith(basePath))
                        .findFirst()
                        .orElseThrow(() -> new CustomException(ErrorCode.NOT_FOUND));

                String ext = filename.contains(".") ? filename.substring(filename.lastIndexOf('.') + 1).toLowerCase() : "";
                String mimeType = MIME_MAP.getOrDefault(ext, "image/jpeg");

                Resource resource = new FileSystemResource(found);
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(mimeType))
                        .body(resource);
            }
        } catch (IOException e) {
            log.error("개선·문의 이미지 파일 탐색 실패: {}", filename, e);
        }
        throw new CustomException(ErrorCode.NOT_FOUND);
    }
}
