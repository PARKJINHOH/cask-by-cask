package com.caskbycask.domain.venue.controller;

import com.caskbycask.domain.venue.dto.VenueRequestBody;
import com.caskbycask.domain.venue.dto.VenueRequestResponse;
import com.caskbycask.domain.venue.service.VenueRequestService;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 장소 제보 (로그인 필요).
 *
 * <p>[보안] {@code GET /api/venues/**} 가 광범위하게 permitAll 이므로,
 * {@code /api/venues/requests/me} 는 SecurityConfig 에서 <b>그보다 먼저</b>
 * authenticated 로 못박아 두었다. 생산자 요청이 같은 함정을 겪고 남긴 규칙이다.
 */
@RestController
@RequestMapping("/api/venues/requests")
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "venue", name = "enabled", havingValue = "true")
public class VenueRequestController {

    private final VenueRequestService venueRequestService;

    @PostMapping
    public ResponseEntity<ApiResponse<VenueRequestResponse>> submit(
            @Valid @RequestBody VenueRequestBody body,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                venueRequestService.submit(body, userDetails.getUserId())));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<VenueRequestResponse>>> myRequests(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                venueRequestService.getMyRequests(userDetails.getUserId())));
    }
}
