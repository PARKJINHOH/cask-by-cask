package com.caskbycask.domain.tastetree.controller;

import com.caskbycask.domain.tastetree.dto.TasteTreeImageFile;
import com.caskbycask.domain.tastetree.service.TasteTreeService;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.storage.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/taste-tree/images")
@RequiredArgsConstructor
public class TasteTreeImageController {

    private final TasteTreeService service;
    private final FileStorageService fileStorageService;

    @GetMapping("/{savedFileName}")
    public ResponseEntity<Resource> serveImage(@PathVariable String savedFileName) {
        if (savedFileName.contains("..") || savedFileName.contains("/") || savedFileName.contains("\\")) {
            throw new CustomException(ErrorCode.INVALID_FILE_PATH);
        }
        TasteTreeImageFile image = service.findImageFile(savedFileName)
                .orElseThrow(() -> new CustomException(ErrorCode.TASTE_TREE_IMAGE_NOT_FOUND));
        Resource resource = fileStorageService.loadAsResource(savedFileName, image.subPath());
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(image.mimeType()))
                .body(resource);
    }
}
