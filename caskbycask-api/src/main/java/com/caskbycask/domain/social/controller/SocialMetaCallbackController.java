package com.caskbycask.domain.social.controller;

import com.caskbycask.domain.social.entity.SocialDataDeletionRequest;
import com.caskbycask.domain.social.entity.enums.SocialPlatform;
import com.caskbycask.domain.social.service.InvalidMetaSignedRequestException;
import com.caskbycask.domain.social.service.SocialMetaCallbackService;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/social/meta")
@RequiredArgsConstructor
public class SocialMetaCallbackController {

    private final SocialMetaCallbackService callbackService;

    @GetMapping({"/{platform}/deauthorize", "/{platform}/data-deletion"})
    public ResponseEntity<Map<String, String>> readiness(@PathVariable String platform) {
        SocialPlatform parsed = parsePlatform(platform);
        if (parsed == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Map.of("status", "ready", "platform", parsed.name()));
    }

    @PostMapping(value = "/{platform}/deauthorize",
            consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<Void> deauthorize(
            @PathVariable String platform,
            @RequestParam("signed_request") String signedRequest) {
        try {
            SocialPlatform parsed = parsePlatform(platform);
            if (parsed == null) return ResponseEntity.notFound().build();
            callbackService.deauthorize(parsed, signedRequest);
            return ResponseEntity.ok().build();
        } catch (InvalidMetaSignedRequestException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping(value = "/{platform}/data-deletion",
            consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<DataDeletionCallbackResponse> deleteData(
            @PathVariable String platform,
            @RequestParam("signed_request") String signedRequest) {
        try {
            SocialPlatform parsed = parsePlatform(platform);
            if (parsed == null) return ResponseEntity.notFound().build();
            var result = callbackService.deleteData(parsed, signedRequest);
            return ResponseEntity.ok(new DataDeletionCallbackResponse(
                    result.statusUrl(), result.confirmationCode()));
        } catch (InvalidMetaSignedRequestException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/data-deletion/status/{confirmationCode:[a-f0-9]{32}}")
    public ResponseEntity<DataDeletionStatusResponse> deletionStatus(
            @PathVariable String confirmationCode) {
        SocialDataDeletionRequest request = callbackService.status(confirmationCode);
        if (request == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(new DataDeletionStatusResponse(
                request.getConfirmationCode(),
                request.getPlatform().name(),
                request.getStatus().name(),
                request.getCreatedAt(),
                request.getCompletedAt()
        ));
    }

    private static SocialPlatform parsePlatform(String value) {
        try {
            return SocialPlatform.valueOf(value.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    public record DataDeletionCallbackResponse(
            String url,
            @JsonProperty("confirmation_code") String confirmationCode) {
    }

    public record DataDeletionStatusResponse(
            String confirmationCode,
            String platform,
            String status,
            LocalDateTime requestedAt,
            LocalDateTime completedAt) {
    }
}
