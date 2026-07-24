package com.caskbycask.domain.social.controller;

import com.caskbycask.domain.social.config.SocialPublishingProperties;
import com.caskbycask.domain.social.dto.SocialCapabilityResponse;
import com.caskbycask.domain.social.dto.SocialPublishSelection;
import com.caskbycask.domain.social.entity.enums.SocialConnectionStatus;
import com.caskbycask.domain.social.entity.enums.SocialPlatform;
import com.caskbycask.domain.social.repository.SocialAccountConnectionRepository;
import com.caskbycask.domain.social.service.SocialThumbnailTemplateService;
import com.caskbycask.domain.spirit.repository.SpiritImageRepository;
import com.caskbycask.domain.spirit.repository.SpiritRepository;
import com.caskbycask.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/social")
@RequiredArgsConstructor
public class SocialCapabilityController {

    private final SocialPublishingProperties properties;
    private final SocialAccountConnectionRepository connectionRepository;
    private final SocialThumbnailTemplateService templateService;
    private final SpiritRepository spiritRepository;
    private final SpiritImageRepository spiritImageRepository;

    @GetMapping("/capabilities")
    public ResponseEntity<ApiResponse<SocialCapabilityResponse>> capabilities(
            @RequestParam(required = false) Long spiritId) {
        return ResponseEntity.ok(ApiResponse.success(new SocialCapabilityResponse(
                properties.isEnabled(),
                available(SocialPlatform.INSTAGRAM),
                available(SocialPlatform.THREADS),
                reviewImageAvailable(spiritId),
                SocialPublishSelection.CURRENT_CONSENT_VERSION,
                templateService.activeTemplates()
        )));
    }

    private boolean available(SocialPlatform platform) {
        return properties.isEnabled() && connectionRepository.findByPlatform(platform)
                .map(connection -> connection.getStatus() == SocialConnectionStatus.CONNECTED
                        && connection.getTokenExpiresAt().isAfter(LocalDateTime.now()))
                .orElse(false);
    }

    private boolean reviewImageAvailable(Long spiritId) {
        if (spiritId == null) return true;
        if (spiritImageRepository.existsBySpiritId(spiritId)) return true;
        Long parentId = spiritRepository.findParentIdById(spiritId);
        return parentId != null && spiritImageRepository.existsBySpiritId(parentId);
    }
}
