package com.drinkindex.domain.legal.controller;

import com.drinkindex.domain.legal.dto.LegalDocumentResponse;
import com.drinkindex.domain.legal.entity.enums.LegalDocumentType;
import com.drinkindex.domain.legal.service.LegalDocumentService;
import com.drinkindex.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/legal")
@RequiredArgsConstructor
public class LegalDocumentController {

    private final LegalDocumentService legalDocumentService;

    @GetMapping("/latest")
    public ResponseEntity<ApiResponse<LegalDocumentResponse>> getLatest(@RequestParam LegalDocumentType type) {
        return ResponseEntity.ok(ApiResponse.success(legalDocumentService.getLatest(type)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<LegalDocumentResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(legalDocumentService.getById(id)));
    }
}
