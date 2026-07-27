package com.caskbycask.domain.review.controller;

import com.caskbycask.domain.review.repository.ReviewImageRepository;
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

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/reviews/images")
public class ReviewImageController {

    private final ReviewImageRepository imageRepository;
    private final FileStorageService fileStorageService;

    @GetMapping("/{savedFileName:.+}")
    public ResponseEntity<Resource> serve(@PathVariable String savedFileName) {
        if (savedFileName.contains("..") || savedFileName.contains("/")
                || savedFileName.contains("\\")) {
            throw new CustomException(ErrorCode.INVALID_FILE_PATH);
        }
        var image = imageRepository.findBySavedFileName(savedFileName)
                .orElseThrow(() -> new CustomException(ErrorCode.REVIEW_IMAGE_NOT_FOUND));
        Resource resource = fileStorageService.loadAsResource(
                image.getSavedFileName(), image.getSubPath());
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(365, TimeUnit.DAYS).cachePublic().immutable())
                .header("X-Content-Type-Options", "nosniff")
                .contentType(MediaType.parseMediaType(image.getMimeType()))
                .body(resource);
    }
}
