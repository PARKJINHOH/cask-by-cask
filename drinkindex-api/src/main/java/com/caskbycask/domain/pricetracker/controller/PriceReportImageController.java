package com.caskbycask.domain.pricetracker.controller;

import com.caskbycask.domain.pricetracker.dto.response.PriceReportImageUploadResponse;
import com.caskbycask.domain.pricetracker.service.PriceReportImageService;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/price-reports/images")
@RequiredArgsConstructor
public class PriceReportImageController {

    private final PriceReportImageService priceReportImageService;

    @PostMapping
    public ResponseEntity<ApiResponse<PriceReportImageUploadResponse>> uploadImage(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                priceReportImageService.uploadImage(file, userDetails.getUserId())));
    }
}
