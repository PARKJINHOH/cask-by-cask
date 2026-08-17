package com.caskbycask.domain.gnbmenu.controller;

import com.caskbycask.domain.gnbmenu.service.GnbMenuService;
import com.caskbycask.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

// 비회원 포함 전체 허용 (SecurityConfig: GET /api/gnb-menus/hidden permitAll)
// — GNB 는 로그인 여부와 무관하게 그려지므로 인증을 걸면 비회원 화면이 어긋난다.
@RestController
@RequestMapping("/api/gnb-menus")
@RequiredArgsConstructor
public class GnbMenuController {

    private final GnbMenuService gnbMenuService;

    @GetMapping("/hidden")
    public ResponseEntity<ApiResponse<List<String>>> getHiddenMenuKeys() {
        return ResponseEntity.ok(ApiResponse.success(gnbMenuService.getHiddenMenuKeys()));
    }
}
