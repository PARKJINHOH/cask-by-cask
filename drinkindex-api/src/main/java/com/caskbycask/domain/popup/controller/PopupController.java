package com.caskbycask.domain.popup.controller;

import com.caskbycask.domain.popup.dto.PopupResponse;
import com.caskbycask.domain.popup.entity.enums.PopupDisplayPage;
import com.caskbycask.domain.popup.entity.enums.PopupLanguage;
import com.caskbycask.domain.popup.service.PopupService;
import com.caskbycask.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// 비회원 포함 전체 허용 (SecurityConfig: GET /api/popups/** permitAll)
@RestController
@RequestMapping("/api/popups")
@RequiredArgsConstructor
public class PopupController {

    private final PopupService popupService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PopupResponse>>> getActivePopups(
            @RequestParam(defaultValue = "KO") PopupLanguage language,
            @RequestParam(name = "page", defaultValue = "MAIN") PopupDisplayPage displayPage
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(popupService.getActivePopups(language, displayPage))
        );
    }
}
