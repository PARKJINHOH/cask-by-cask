package com.drinkindex.domain.legal.controller;

import com.drinkindex.domain.legal.dto.CreateLegalDocumentRequest;
import com.drinkindex.domain.legal.dto.LegalDocumentListItem;
import com.drinkindex.domain.legal.dto.LegalDocumentResponse;
import com.drinkindex.domain.legal.dto.UpdateLegalDocumentRequest;
import com.drinkindex.domain.legal.entity.enums.LegalDocumentType;
import com.drinkindex.domain.legal.service.LegalDocumentService;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/legal")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminLegalDocumentController {

    private final LegalDocumentService legalDocumentService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<LegalDocumentListItem>>> list(
            @RequestParam LegalDocumentType type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(ApiResponse.success(legalDocumentService.getAllVersions(type, page, size)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<LegalDocumentResponse>> create(
            @Valid @RequestBody CreateLegalDocumentRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(legalDocumentService.create(request, userDetails.getUserId())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<LegalDocumentResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(legalDocumentService.getByIdForAdmin(id)));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<LegalDocumentResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateLegalDocumentRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(legalDocumentService.update(id, request)));
    }

    @PutMapping("/{id}/activate")
    public ResponseEntity<ApiResponse<LegalDocumentResponse>> activate(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(legalDocumentService.activate(id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        legalDocumentService.delete(id);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
