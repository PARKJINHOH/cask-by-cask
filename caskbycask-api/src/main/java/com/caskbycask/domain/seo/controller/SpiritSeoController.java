package com.caskbycask.domain.seo.controller;

import com.caskbycask.domain.seo.dto.SpiritSeoResponse;
import com.caskbycask.domain.seo.service.SpiritSeoService;
import com.caskbycask.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/seo/spirits")
@RequiredArgsConstructor
public class SpiritSeoController {

    private final SpiritSeoService spiritSeoService;

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SpiritSeoResponse>> getSpiritSeo(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(spiritSeoService.getSpiritSeo(id)));
    }
}
