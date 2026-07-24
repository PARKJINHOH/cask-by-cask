package com.caskbycask.domain.social.controller;

import com.caskbycask.domain.social.config.SocialPublishingProperties;
import com.caskbycask.domain.social.service.SocialAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

@RestController
@RequestMapping("/api/admin/social/accounts/oauth")
@RequiredArgsConstructor
public class SocialOAuthCallbackController {

    private final SocialAccountService accountService;
    private final SocialPublishingProperties properties;

    @GetMapping("/callback")
    public ResponseEntity<Void> callback(
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String error) {
        if (state == null || code == null || error != null) {
            String failedTarget = properties.getSiteUrl().replaceAll("/+$", "")
                    + "/admin/social?socialConnected=false";
            return ResponseEntity.status(HttpStatus.FOUND)
                    .header(HttpHeaders.LOCATION, URI.create(failedTarget).toASCIIString())
                    .build();
        }
        String returnPath = accountService.completeOAuth(state, code);
        String target = properties.getSiteUrl().replaceAll("/+$", "") + returnPath
                + (returnPath.contains("?") ? "&" : "?") + "socialConnected=true";
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, URI.create(target).toASCIIString())
                .build();
    }
}
