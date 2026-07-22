package com.caskbycask.domain.user.controller;

import com.caskbycask.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Profile("local")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class DevAuthController {

    @Value("${admin.seed.email}")
    private String adminEmail;

    @Value("${admin.seed.password}")
    private String adminPassword;

    @GetMapping("/admin-credentials")
    public ResponseEntity<ApiResponse<Map<String, String>>> getAdminCredentials() {
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "email", adminEmail,
                "password", adminPassword
        )));
    }
}
