package com.caskbycask.domain.translation.controller;

import com.caskbycask.domain.translation.dto.TranslationRequest;
import com.caskbycask.domain.translation.dto.TranslationResponse;
import com.caskbycask.domain.translation.service.TranslationService;
import com.caskbycask.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/translations")
@RequiredArgsConstructor
public class TranslationController {

    private final TranslationService translationService;

    @PostMapping
    public ResponseEntity<ApiResponse<TranslationResponse>> translate(
            @Valid @RequestBody TranslationRequest request) {
        return ResponseEntity.ok(ApiResponse.success(translationService.translate(request)));
    }
}
