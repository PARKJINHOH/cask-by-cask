package com.caskbycask.domain.tierlist.controller;

import com.caskbycask.domain.tierlist.entity.TierListImage;
import com.caskbycask.domain.tierlist.service.TierListService;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tier-list/images")
@RequiredArgsConstructor
public class TierListImageController {

    private final TierListService tierListService;
    private final FileStorageService fileStorageService;

    @GetMapping("/{savedFileName}")
    public ResponseEntity<Resource> serveImage(@PathVariable String savedFileName) {
        if (savedFileName.contains("..") || savedFileName.contains("/") || savedFileName.contains("\\")) {
            throw new CustomException(ErrorCode.INVALID_FILE_PATH);
        }
        TierListImage image = tierListService.getImage(savedFileName);
        Resource resource = fileStorageService.loadAsResource(savedFileName, image.getSubPath());
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(image.getMimeType()))
                .body(resource);
    }
}
