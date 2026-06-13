package com.caskbycask.domain.faq.controller;

import com.caskbycask.domain.faq.dto.FaqGroupResponse;
import com.caskbycask.domain.faq.service.FaqService;
import com.caskbycask.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/faq")
@RequiredArgsConstructor
public class FaqController {

    private final FaqService faqService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<FaqGroupResponse>>> getPublicFaqs(
            @RequestParam(defaultValue = "ko") String lang
    ) {
        return ResponseEntity.ok(ApiResponse.success(faqService.getPublicFaqs(lang)));
    }
}
