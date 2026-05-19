package com.drinkindex.admin.controller;

import com.drinkindex.admin.service.AdminUserService;
import com.drinkindex.domain.user.dto.AdminUserResponse;
import com.drinkindex.domain.user.dto.ChangeRoleRequest;
import com.drinkindex.domain.user.dto.CreateDistilleryManagerRequest;
import com.drinkindex.domain.user.dto.SuspendUserRequest;
import com.drinkindex.domain.user.dto.UpdateBoardPermissionsRequest;
import com.drinkindex.domain.user.entity.enums.Role;
import com.drinkindex.global.auth.security.CustomUserDetails;
import com.drinkindex.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService adminUserService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<AdminUserResponse>>> searchUsers(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) Boolean isActive,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success(
                adminUserService.searchUsers(keyword, role, isActive, pageable)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminUserResponse>> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(adminUserService.getUser(id)));
    }

    @PostMapping("/distillery-manager")
    public ResponseEntity<ApiResponse<AdminUserResponse>> createDistilleryManager(
            @Valid @RequestBody CreateDistilleryManagerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                adminUserService.createDistilleryManager(request)));
    }

    @PatchMapping("/{id}/role")
    public ResponseEntity<ApiResponse<AdminUserResponse>> changeRole(
            @PathVariable Long id,
            @Valid @RequestBody ChangeRoleRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                adminUserService.changeRole(id, request, userDetails.getUserId())));
    }

    @PutMapping("/{id}/board-permissions")
    public ResponseEntity<ApiResponse<AdminUserResponse>> updateBoardPermissions(
            @PathVariable Long id,
            @Valid @RequestBody UpdateBoardPermissionsRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                adminUserService.updateBoardPermissions(id, request, userDetails.getUserId())));
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<ApiResponse<Void>> deactivate(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        adminUserService.deactivateUser(id, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PatchMapping("/{id}/activate")
    public ResponseEntity<ApiResponse<Void>> activate(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        adminUserService.activateUser(id, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @PathVariable Long id,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        adminUserService.deleteUser(id, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PostMapping("/{id}/suspend")
    public ResponseEntity<ApiResponse<Void>> suspend(
            @PathVariable Long id,
            @Valid @RequestBody SuspendUserRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        adminUserService.suspendUser(id, request, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }
}
