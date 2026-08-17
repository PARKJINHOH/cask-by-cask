package com.caskbycask.domain.gnbmenu.controller;

import com.caskbycask.domain.gnbmenu.dto.AdminGnbMenuResponse;
import com.caskbycask.domain.gnbmenu.service.GnbMenuService;
import com.caskbycask.global.response.ApiResponse;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/gnb-menus")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
public class GnbMenuAdminController {

    private final GnbMenuService gnbMenuService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AdminGnbMenuResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(gnbMenuService.getAllForAdmin()));
    }

    @PatchMapping("/{menuKey}/visibility")
    public ResponseEntity<ApiResponse<Void>> updateVisibility(
            @PathVariable String menuKey,
            @RequestBody VisibilityRequest request
    ) {
        gnbMenuService.updateVisibility(menuKey, request.getIsVisible());
        return ResponseEntity.ok(ApiResponse.success());
    }

    // ─── 내부 요청 DTO ─────────────────────────────────────

    @Getter @NoArgsConstructor
    public static class VisibilityRequest {
        private Boolean isVisible;
    }
}
