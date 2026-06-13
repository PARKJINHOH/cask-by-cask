package com.caskbycask.admin.controller;

import com.caskbycask.admin.service.AdminRoleTypeService;
import com.caskbycask.domain.user.dto.CreateRoleTypeRequest;
import com.caskbycask.domain.user.dto.RoleTypeResponse;
import com.caskbycask.domain.user.dto.UpdateRoleTypeRequest;
import com.caskbycask.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/role-types")
@RequiredArgsConstructor
public class AdminRoleTypeController {

    private final AdminRoleTypeService adminRoleTypeService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<RoleTypeResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(adminRoleTypeService.getAll()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<RoleTypeResponse>> create(
            @Valid @RequestBody CreateRoleTypeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(adminRoleTypeService.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<RoleTypeResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateRoleTypeRequest request) {
        return ResponseEntity.ok(ApiResponse.success(adminRoleTypeService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        adminRoleTypeService.delete(id);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
