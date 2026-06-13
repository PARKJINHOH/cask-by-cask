package com.caskbycask.domain.inquiry.controller;

import com.caskbycask.domain.inquiry.dto.InquiryRequest;
import com.caskbycask.domain.inquiry.service.InquiryService;
import com.caskbycask.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/inquiries")
@RequiredArgsConstructor
public class InquiryController {

    private final InquiryService inquiryService;

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<Void>> submit(
            @Valid @RequestPart("data") InquiryRequest request,
            @RequestPart(value = "images", required = false) List<MultipartFile> images
    ) {
        inquiryService.submit(request, images);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
