package com.caskbycask.domain.photocard.controller;

import com.caskbycask.domain.photocard.dto.PhotoCardImageUploadResponse;
import com.caskbycask.domain.photocard.dto.PhotoCardTemplateResponse;
import com.caskbycask.domain.photocard.dto.PhotoCardTemplateSaveRequest;
import com.caskbycask.domain.photocard.service.PhotoCardTemplateService;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
import com.caskbycask.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/photo-cards/templates")
@RequiredArgsConstructor
public class PhotoCardTemplateController {

    private final PhotoCardTemplateService templateService;

    /**
     * 템플릿 목록.
     * @param scope OFFICIAL(공식) | MINE(내 것, 비공개 포함) | PUBLIC(다른 사용자가 공개한 것)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<PhotoCardTemplateResponse>>> list(
            @RequestParam(defaultValue = "OFFICIAL") String scope,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Long userId = userDetails != null ? userDetails.getUserId() : null;
        List<PhotoCardTemplateResponse> templates = switch (scope.toUpperCase()) {
            case "MINE" -> {
                if (userId == null) throw new CustomException(ErrorCode.UNAUTHORIZED);
                yield templateService.getMyTemplates(userId);
            }
            case "PUBLIC" -> templateService.getPublicTemplates(userId);
            default -> templateService.getOfficialTemplates(userId);
        };
        return ResponseEntity.ok(ApiResponse.success(templates));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PhotoCardTemplateResponse>> get(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Long userId = userDetails != null ? userDetails.getUserId() : null;
        return ResponseEntity.ok(ApiResponse.success(templateService.getTemplate(id, userId)));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PhotoCardTemplateResponse>> create(
            @Valid @RequestBody PhotoCardTemplateSaveRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                templateService.createMyTemplate(request, userDetails.getUserId())));
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PhotoCardTemplateResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody PhotoCardTemplateSaveRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                templateService.updateMyTemplate(id, request, userDetails.getUserId())));
    }

    /** 공개 전환 — 내 템플릿을 다른 사용자에게 열거나 닫는다. */
    @PatchMapping("/{id}/public")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PhotoCardTemplateResponse>> togglePublic(
            @PathVariable Long id,
            @RequestParam boolean isPublic,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                templateService.toggleMyTemplatePublic(id, isPublic, userDetails.getUserId())));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        templateService.deleteMyTemplate(id, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    /** 이 템플릿으로 포토카드를 만들었을 때 호출 — 인기순 정렬의 근거. */
    @PostMapping("/{id}/use")
    public ResponseEntity<ApiResponse<Void>> markUsed(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Long userId = userDetails != null ? userDetails.getUserId() : null;
        templateService.markUsed(id, userId);
        return ResponseEntity.ok(ApiResponse.success());
    }

    /** 템플릿 미리보기 / 이미지 레이어용 업로드 */
    @PostMapping(value = "/images", consumes = "multipart/form-data")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PhotoCardImageUploadResponse>> uploadImage(
            @RequestParam("image") MultipartFile image,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.success(
                templateService.uploadImage(image, userDetails.getUserId())));
    }
}
