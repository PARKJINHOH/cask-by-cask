package com.caskbycask.domain.banner.controller;

import com.caskbycask.domain.banner.dto.BannerResponse;
import com.caskbycask.domain.banner.entity.enums.BannerLanguage;
import com.caskbycask.domain.banner.service.BannerService;
import com.caskbycask.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// 비회원 포함 전체 허용 (SecurityConfig: GET /api/banners/** permitAll)
@RestController
@RequestMapping("/api/banners")
@RequiredArgsConstructor
public class BannerController {

    private final BannerService bannerService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<BannerResponse>>> getActiveBanners(
            @RequestParam(defaultValue = "KO") BannerLanguage language
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(bannerService.getActiveBanners(language))
        );
    }
}
