package com.caskbycask.domain.venue.controller;

import com.caskbycask.domain.venue.dto.SpiritVenueResponse;
import com.caskbycask.domain.venue.service.VenueService;
import com.caskbycask.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 주류 상세의 "이 술을 마실 수 있는 곳".
 *
 * <p>경로가 {@code /api/spirits/**} 라 SecurityConfig 의 기존 permitAll 이 그대로 덮는다 —
 * 설정을 더 열 필요가 없다.
 *
 * <p>장소 도메인에 두는 이유는 집계가 장소 쪽 관심사이기 때문이다. 주류 서비스가
 * 장소 저장소를 알게 되면 두 도메인이 양방향으로 얽힌다.
 */
@RestController
@RequestMapping("/api/spirits")
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "venue", name = "enabled", havingValue = "true")
public class SpiritVenueController {

    private final VenueService venueService;

    @GetMapping("/{spiritId:[0-9]+}/venues")
    public ResponseEntity<ApiResponse<List<SpiritVenueResponse>>> venuesForSpirit(
            @PathVariable Long spiritId,
            @RequestParam(defaultValue = "8") int limit) {
        return ResponseEntity.ok(ApiResponse.success(
                venueService.getVenuesForSpirit(spiritId, limit)));
    }
}
