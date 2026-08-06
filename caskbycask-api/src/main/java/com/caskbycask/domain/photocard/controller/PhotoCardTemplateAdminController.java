package com.caskbycask.domain.photocard.controller;

import com.caskbycask.domain.photocard.dto.PhotoCardTemplateResponse;
import com.caskbycask.domain.photocard.dto.PhotoCardTemplateSaveRequest;
import com.caskbycask.domain.photocard.entity.enums.PhotoCardModerationStatus;
import com.caskbycask.domain.photocard.service.PhotoCardTemplateService;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import com.caskbycask.global.response.PageResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 포토카드 템플릿 관리 — 공식 템플릿 등록·정렬과 공개된 사용자 템플릿 모더레이션.
 */
@RestController
@RequestMapping("/api/admin/photo-cards/templates")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
public class PhotoCardTemplateAdminController {

    private final PhotoCardTemplateService templateService;

    /** 공식 템플릿 전체 (숨김 포함) */
    @GetMapping("/official")
    public ResponseEntity<ApiResponse<List<PhotoCardTemplateResponse>>> listOfficial() {
        return ResponseEntity.ok(ApiResponse.success(templateService.getOfficialTemplatesForAdmin()));
    }

    /** 사용자가 공개한 템플릿 — 부적절한 문구 검토용 */
    @GetMapping("/public")
    public ResponseEntity<ApiResponse<PageResponse<PhotoCardTemplateResponse>>> listPublicUserTemplates(
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(templateService.getPublicUserTemplatesForAdmin(pageable))));
    }

    @PostMapping("/official")
    public ResponseEntity<ApiResponse<PhotoCardTemplateResponse>> createOfficial(
            @Valid @RequestBody PhotoCardTemplateSaveRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                templateService.createOfficialTemplate(request, userDetails.getUserId())));
    }

    @PutMapping("/official/{id}")
    public ResponseEntity<ApiResponse<PhotoCardTemplateResponse>> updateOfficial(
            @PathVariable Long id,
            @Valid @RequestBody PhotoCardTemplateSaveRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(templateService.updateOfficialTemplate(id, request)));
    }

    /** 공식 템플릿 노출 순서 — 보낸 배열 순서를 그대로 display_order 로 쓴다. */
    @PatchMapping("/official/order")
    public ResponseEntity<ApiResponse<Void>> reorderOfficial(@RequestBody List<Long> orderedIds) {
        templateService.reorderOfficialTemplates(orderedIds);
        return ResponseEntity.ok(ApiResponse.success());
    }

    /** 숨김/복구 — 공식·사용자 템플릿 공용 */
    @PatchMapping("/{id}/moderation")
    public ResponseEntity<ApiResponse<PhotoCardTemplateResponse>> changeModeration(
            @PathVariable Long id,
            @RequestParam PhotoCardModerationStatus status
    ) {
        return ResponseEntity.ok(ApiResponse.success(templateService.changeModeration(id, status)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        templateService.deleteTemplateByAdmin(id);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
