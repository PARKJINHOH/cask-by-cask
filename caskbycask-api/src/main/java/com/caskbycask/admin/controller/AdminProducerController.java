package com.caskbycask.admin.controller;

import com.caskbycask.domain.producer.dto.*;
import com.caskbycask.domain.producer.service.ProducerService;
import com.caskbycask.domain.spirit.entity.enums.RequestStatus;
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

@RestController
@RequestMapping("/api/admin/producers")
@RequiredArgsConstructor
public class AdminProducerController {

    private final ProducerService producerService;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<AdminProducerResponse>>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String nameKo,
            @RequestParam(required = false) String nameEn,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) Integer foundedYear,
            @RequestParam(required = false) com.caskbycask.domain.producer.entity.ProducerType type,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(PageResponse.from(
                producerService.searchForAdmin(
                        keyword, nameKo, nameEn, country, foundedYear, type, pageable))));
    }

    // ── 증류소 CRUD ──────────────────────────────────────────────
    // [보안] SecurityConfig 의 /api/admin/producers/** 는 PARTNER 도 허용한다.
    //   증류소 마스터데이터 자체의 생성/수정/삭제는 소유권 검증이 없으므로
    //   PARTNER 가 타 증류소를 임의 변경하지 못하도록 메서드 레벨에서 ADMIN 이상으로 제한한다.
    //   (PARTNER 의 자기 증류소 셀프 편집이 필요해지면 소유권 검증과 함께 별도 설계)

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<ProducerResponse>> create(
            @Valid @RequestBody CreateProducerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(producerService.create(request)));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<ProducerResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateProducerRequest request) {
        return ResponseEntity.ok(ApiResponse.success(producerService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        producerService.delete(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ── 등록 요청 관리 (ADMIN 이상) ──────────────────────────────

    @GetMapping("/requests")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<ProducerRegisterRequestResponse>>> getRequests(
            @RequestParam(defaultValue = "PENDING") RequestStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.from(producerService.getProducerRequests(status, pageable))));
    }

    @GetMapping("/requests/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<ProducerRegisterRequestResponse>> getRequestDetail(
            @PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                producerService.getProducerRequestDetail(id)));
    }

    @PatchMapping("/requests/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<ProducerRegisterRequestResponse>> updateRequest(
            @PathVariable Long id,
            @Valid @RequestBody ProducerRegisterRequestBody body) {
        return ResponseEntity.ok(ApiResponse.success(
                producerService.updateProducerRequest(id, body)));
    }

    // ─── 로고 이미지 ───────────────────────────────────────────────
    // 포토카드에 증류소 로고를 얹기 위해 도입. 생산자 저장(PUT)과 분리한 이유는
    // UpdateProducerRequest 가 "null = 변경 안 함" 규약이라 삭제를 표현할 수 없기 때문이다.

    @PostMapping(value = "/{id}/logo", consumes = "multipart/form-data")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<ProducerResponse>> uploadLogo(
            @PathVariable Long id,
            @RequestParam("image") MultipartFile image) {
        return ResponseEntity.ok(ApiResponse.success(producerService.uploadLogo(id, image)));
    }

    @DeleteMapping("/{id}/logo")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<ProducerResponse>> deleteLogo(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(producerService.deleteLogo(id)));
    }

    @PatchMapping("/requests/{id}/approve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<ProducerResponse>> approveRequest(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                producerService.approveProducerRequest(id, userDetails.getUserId())));
    }

    @PatchMapping("/requests/{id}/reject")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
    public ResponseEntity<ApiResponse<Void>> rejectRequest(
            @PathVariable Long id,
            @Valid @RequestBody RejectProducerRequestRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        producerService.rejectProducerRequest(id, request.rejectReason(), userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }
}
