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
import java.util.stream.Stream;

@RestController
@RequestMapping("/api/inquiries")
@RequiredArgsConstructor
public class InquiryController {

    private final InquiryService inquiryService;

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<Void>> submit(
            @Valid @RequestPart("data") InquiryRequest request,
            @RequestPart(value = "attachments", required = false) List<MultipartFile> attachments,
            @RequestPart(value = "images", required = false) List<MultipartFile> legacyImages
    ) {
        // 구버전 프론트와의 배포 전환 구간을 위해 images 파트도 잠시 함께 수용한다.
        List<MultipartFile> files = Stream.concat(
                attachments == null ? Stream.empty() : attachments.stream(),
                legacyImages == null ? Stream.empty() : legacyImages.stream()
        ).toList();
        inquiryService.submit(request, files);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
