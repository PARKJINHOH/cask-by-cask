package com.caskbycask.domain.social.controller;

import com.caskbycask.domain.social.config.SocialPublishingProperties;
import com.caskbycask.domain.social.dto.SocialPublicDtos;
import com.caskbycask.domain.social.entity.SocialPublishBundle;
import com.caskbycask.domain.social.entity.enums.SocialSourceType;
import com.caskbycask.domain.social.repository.SocialPublishBundleRepository;
import com.caskbycask.domain.social.service.SocialImageRenderService;
import com.caskbycask.domain.social.service.SocialPublicationQueryService;
import com.caskbycask.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class SocialPublicController {

    private final SocialPublishBundleRepository bundleRepository;
    private final SocialPublicationQueryService queryService;
    private final SocialImageRenderService imageRenderService;
    private final SocialPublishingProperties properties;

    @GetMapping("/s/{code}")
    public ResponseEntity<Void> shortLink(@PathVariable String code) {
        SocialPublishBundle bundle = bundleRepository.findByShortCode(code)
                .filter(value -> !value.isSourceDeleted())
                .orElse(null);
        String path = bundle != null ? destination(bundle) : "/ko/social?unavailable=1";
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(properties.getSiteUrl().replaceAll("/+$", "") + path))
                .build();
    }

    @GetMapping("/api/social/hub")
    public ResponseEntity<ApiResponse<List<SocialPublicDtos.HubItem>>> hub(
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(queryService.publicHub(size)));
    }

    @GetMapping("/api/social/images/{yearMonth}/{fileName:.+}")
    public ResponseEntity<FileSystemResource> image(
            @PathVariable String yearMonth, @PathVariable String fileName) {
        Path path = imageRenderService.resolveGeneratedImage(yearMonth, fileName);
        if (!Files.isRegularFile(path)) return ResponseEntity.notFound().build();
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG)
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                .body(new FileSystemResource(path));
    }

    private static String destination(SocialPublishBundle bundle) {
        String locale = "en".equals(bundle.getLocale()) ? "en" : "ko";
        if (bundle.getContentType() == SocialSourceType.REVIEW) {
            return "/" + locale + "/reviews/" + bundle.getContentId();
        }
        if (bundle.getContentType() == SocialSourceType.POST) {
            return "/" + locale + "/community/notice/" + bundle.getContentId();
        }
        return "/" + locale + "/social";
    }
}
