package com.caskbycask.domain.seo.controller;

import com.caskbycask.domain.seo.service.IndexNowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.TimeUnit;

@RestController
@RequiredArgsConstructor
public class IndexNowKeyController {

    private final IndexNowService indexNowService;

    @GetMapping(value = "/indexnow-key.txt", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> keyFile() {
        if (!indexNowService.isKeyFileAvailable()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic())
                .contentType(MediaType.TEXT_PLAIN)
                .body(indexNowService.keyFileContent());
    }
}
