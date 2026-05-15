package com.drinkindex.domain.banner.controller;

import com.drinkindex.domain.banner.dto.BannerResponse;
import com.drinkindex.domain.banner.entity.enums.BannerLanguage;
import com.drinkindex.domain.banner.service.BannerService;
import com.drinkindex.global.response.ApiResponse;
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
