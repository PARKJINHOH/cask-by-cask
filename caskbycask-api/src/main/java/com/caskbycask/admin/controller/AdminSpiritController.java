package com.caskbycask.admin.controller;

import com.caskbycask.domain.review.dto.AdminVariantReviewRequestResponse;
import com.caskbycask.domain.review.dto.ApproveVariantReviewRequest;
import com.caskbycask.domain.review.dto.ModerationRequest;
import com.caskbycask.domain.review.entity.enums.VariantReviewRequestStatus;
import com.caskbycask.domain.review.service.VariantReviewRequestService;
import com.caskbycask.domain.spirit.dto.*;
import com.caskbycask.domain.spirit.entity.enums.RequestStatus;
import com.caskbycask.domain.spirit.entity.enums.SpiritCategory;
import com.caskbycask.domain.spirit.entity.enums.SpiritStatus;
import com.caskbycask.domain.spirit.service.SpiritImageService;
import com.caskbycask.domain.spirit.service.SpiritService;
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
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/admin/spirits")
@RequiredArgsConstructor
public class AdminSpiritController {

    private final SpiritService spiritService;
    private final SpiritImageService spiritImageService;
    private final VariantReviewRequestService variantReviewRequestService;

    // ?? ??CRUD ?????????????????????????????????????????????
    // PARTNER ?ы븿 ?묎렐 媛??(verifyProducerAccess 濡??몃? ?쒖뼱)

    // User-added sub-edition approval queue.
    @GetMapping("/variant-requests")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<AdminVariantRequestResponse>>> getVariantRequests(
            @RequestParam(required = false) SpiritStatus status,
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(spiritService.getVariantRequestsForAdmin(status, keyword, pageable))
        ));
    }

    @PostMapping("/variant-requests/{id}/approve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<AdminVariantRequestResponse>> approveVariantRequest(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(spiritService.approveVariantRequest(id)));
    }

    @PatchMapping("/variant-requests/{id}/reject")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<Void>> rejectVariantRequest(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) ModerationRequest request) {
        spiritService.rejectVariantRequest(id, request);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @GetMapping("/variant-review-requests")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<AdminVariantReviewRequestResponse>>> getVariantReviewRequests(
            @RequestParam(required = false) VariantReviewRequestStatus status,
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(variantReviewRequestService.getAdminRequests(status, keyword, pageable))
        ));
    }

    @PostMapping("/variant-review-requests/{id}/approve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<AdminVariantReviewRequestResponse>> approveVariantReviewRequest(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) ApproveVariantReviewRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                variantReviewRequestService.approve(id, request, userDetails.getUserId())
        ));
    }

    @PostMapping("/variant-review-requests/{id}/approve-saved-variant")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<AdminVariantReviewRequestResponse>> approveSavedVariantReviewRequest(
            @PathVariable Long id,
            @Valid @RequestBody ApproveVariantReviewRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                variantReviewRequestService.approveSavedVariant(id, request.targetVariantId(), userDetails.getUserId())
        ));
    }

    @PostMapping("/variant-review-requests/{id}/reject-review")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<AdminVariantReviewRequestResponse>> rejectSavedVariantReviewRequest(
            @PathVariable Long id,
            @Valid @RequestBody ApproveVariantReviewRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                variantReviewRequestService.rejectReviewOnly(
                        id,
                        request.targetVariantId(),
                        userDetails.getUserId(),
                        request.reviewRejectReason()
                )
        ));
    }

    @PatchMapping("/variant-review-requests/{id}/reject")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<Void>> rejectVariantReviewRequest(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) ModerationRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        variantReviewRequestService.reject(id, userDetails.getUserId(), request);
        return ResponseEntity.ok(ApiResponse.success());
    }

    // 愿由ъ옄 ??紐⑸줉 ??status 誘몄????꾩껜) ??ACTIVE/HIDDEN/PENDING 紐⑤몢 議고쉶
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<SpiritListResponse>>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) SpiritCategory category,
            @RequestParam(required = false) SpiritStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        SpiritSearchCondition condition = new SpiritSearchCondition(
                keyword, category, null, null, null,
                null, null, null, null, null, null, null,
                status, null,
                null, null, null, null);
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(spiritService.searchSpiritsForAdmin(condition, pageable))));
    }

    // 愿由ъ옄 ???곸꽭 ???곹깭(ACTIVE/HIDDEN/PENDING) 臾닿? 議고쉶
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SpiritDetailResponse>> getDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                spiritService.getSpiritDetailForAdmin(id)
        ));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SpiritDetailResponse>> create(
            @Valid @RequestBody CreateSpiritRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                spiritService.createSpirit(request, userDetails.getUserId())
        ));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<SpiritDetailResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateSpiritRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                spiritService.updateSpirit(id, request, userDetails.getUserId())
        ));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        spiritService.deleteSpirit(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @DeleteMapping("/{id}/permanent")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<Void>> permanentlyDelete(@PathVariable Long id) {
        spiritService.permanentlyDeleteSpirit(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PatchMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<Void>> restore(@PathVariable Long id) {
        spiritService.restoreSpirit(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ?? ?곌? ???ㅻⅨ 諛곗튂쨌蹂묒엯) ?섎룞 愿由??????????????????????
    // ?먮룞(?대쫫) ?곌껐???뷀빐 愿由ъ옄媛 ?섎룞 異붽?/?쒓굅. ?묐갑??

    @GetMapping("/{id}/variants")
    public ResponseEntity<ApiResponse<List<AdminSpiritVariantResponse>>> getVariants(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(spiritService.getSpiritVariantsForAdmin(id)));
    }

    @PostMapping("/{id}/variants/{targetId}")
    public ResponseEntity<ApiResponse<List<AdminSpiritVariantResponse>>> addVariant(
            @PathVariable Long id,
            @PathVariable Long targetId) {
        spiritService.addVariantLink(id, targetId);
        return ResponseEntity.ok(ApiResponse.success(spiritService.getSpiritVariantsForAdmin(id)));
    }

    @DeleteMapping("/{id}/variants/{targetId}")
    public ResponseEntity<ApiResponse<List<AdminSpiritVariantResponse>>> removeVariant(
            @PathVariable Long id,
            @PathVariable Long targetId) {
        spiritService.removeVariantLink(id, targetId);
        return ResponseEntity.ok(ApiResponse.success(spiritService.getSpiritVariantsForAdmin(id)));
    }

    // ?? ?대?吏 愿由???????????????????????????????????????????

    @PostMapping("/{id}/images")
    public ResponseEntity<ApiResponse<SpiritImageResponse>> uploadImage(
            @PathVariable Long id,
            @RequestParam MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                spiritImageService.uploadImage(id, file)
        ));
    }

    @DeleteMapping("/{id}/images/{imageId}")
    public ResponseEntity<ApiResponse<Void>> deleteImage(
            @PathVariable Long id,
            @PathVariable Long imageId) {
        spiritImageService.deleteImage(id, imageId);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PatchMapping("/{id}/images/{imageId}/primary")
    public ResponseEntity<ApiResponse<SpiritImageResponse>> setPrimaryImage(
            @PathVariable Long id,
            @PathVariable Long imageId) {
        return ResponseEntity.ok(ApiResponse.success(
                spiritImageService.setPrimaryImage(id, imageId)
        ));
    }

    @PatchMapping("/{id}/images/reorder")
    public ResponseEntity<ApiResponse<List<SpiritImageResponse>>> reorderImages(
            @PathVariable Long id,
            @Valid @RequestBody SpiritImageReorderRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                spiritImageService.reorderImages(id, request.imageIds())
        ));
    }

    // ?? ?깅줉 ?붿껌 ??議고쉶/?섏젙 (PARTNER ?ы븿) ??????????????????

    @GetMapping("/requests")
    public ResponseEntity<ApiResponse<PageResponse<SpiritRegisterRequestResponse>>> getRequests(
            @RequestParam(required = false) RequestStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(spiritService.getRegisterRequests(status, pageable))
        ));
    }

    @GetMapping("/requests/{id}")
    public ResponseEntity<ApiResponse<SpiritRegisterRequestDetailResponse>> getRequestDetail(
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                spiritService.getRegisterRequestDetail(id)
        ));
    }

    @PatchMapping("/requests/{id}")
    public ResponseEntity<ApiResponse<SpiritRegisterRequestDetailResponse>> updateRequest(
            @PathVariable Long id,
            @Valid @RequestBody SpiritRegisterRequestBody body) {
        return ResponseEntity.ok(ApiResponse.success(
                spiritService.updateRegisterRequest(id, body)
        ));
    }

    @PostMapping("/requests/{id}/images")
    public ResponseEntity<ApiResponse<SpiritRegisterRequestDetailResponse>> uploadRequestImage(
            @PathVariable Long id,
            @RequestParam MultipartFile file) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                spiritService.uploadRequestImage(id, file)
        ));
    }

    @DeleteMapping("/requests/{id}/images")
    public ResponseEntity<ApiResponse<SpiritRegisterRequestDetailResponse>> removeRequestImage(
            @PathVariable Long id,
            @RequestParam String imageUrl) {
        return ResponseEntity.ok(ApiResponse.success(
                spiritService.removeRequestImageUrl(id, imageUrl)
        ));
    }

    // ?? ?깅줉 ?붿껌 ???뱀씤/嫄곗젅 (ADMIN ?댁긽留? ??????????????????

    // ?깅줉 ?붿껌 ?곸꽭 ?붾㈃(= ?????깅줉怨??숈씪 ???먯꽌 愿由ъ옄媛 蹂댁셿???꾩껜 ?곸꽭濡??뱀씤
    @PostMapping("/requests/{id}/approve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<SpiritDetailResponse>> approveRequestWithDetail(
            @PathVariable Long id,
            @Valid @RequestBody CreateSpiritRequest detail,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                spiritService.approveRegisterRequestWithDetail(id, detail, userDetails.getUserId())
        ));
    }

    @PatchMapping("/requests/{id}/reject")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<Void>> rejectRequest(
            @PathVariable Long id,
            @Valid @RequestBody RejectSpiritRequestRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        spiritService.rejectRegisterRequest(id, request.rejectReason(), userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }
}
