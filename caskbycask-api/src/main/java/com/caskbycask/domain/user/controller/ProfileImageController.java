package com.caskbycask.domain.user.controller;

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
import java.util.Map;
import java.util.concurrent.TimeUnit;

// 로컬 디스크에 저장된 프로필 이미지를 서빙. LocalFileStorageService 와 동일하게 모든 프로파일에서 동작.
@Slf4j
@RestController
@RequestMapping("/api/profiles/images")
public class ProfileImageController {

    private static final Map<String, String> EXT_TO_MIME = Map.of(
            "jpg", "image/jpeg",
            "jpeg", "image/jpeg",
            "png", "image/png",
            "webp", "image/webp"
    );

    private final Path basePath;

    public ProfileImageController(@Value("${storage.local.base-path}") String basePathStr) {
        this.basePath = Paths.get(basePathStr).toAbsolutePath().normalize();
    }

    @GetMapping("/{savedFileName}")
    public ResponseEntity<Resource> serveImage(@PathVariable String savedFileName) {
        if (savedFileName.contains("..") || savedFileName.contains("/") || savedFileName.contains("\\")) {
            throw new CustomException(ErrorCode.INVALID_FILE_PATH);
        }

        Path filePath = basePath.resolve("profiles").resolve(savedFileName).normalize();

        if (!filePath.startsWith(basePath)) {
            log.warn("Path traversal 시도 감지: {}", savedFileName);
            throw new CustomException(ErrorCode.INVALID_FILE_PATH);
        }

        Resource resource = new FileSystemResource(filePath);
        if (!resource.exists() || !resource.isReadable()) {
            throw new CustomException(ErrorCode.PROFILE_IMAGE_NOT_FOUND);
        }

        String ext = "";
        int dotIdx = savedFileName.lastIndexOf('.');
        if (dotIdx >= 0) {
            ext = savedFileName.substring(dotIdx + 1).toLowerCase();
        }
        String mimeType = EXT_TO_MIME.getOrDefault(ext, "image/jpeg");

        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(1, TimeUnit.DAYS).cachePublic())
                .contentType(MediaType.parseMediaType(mimeType))
                .body(resource);
    }
}
