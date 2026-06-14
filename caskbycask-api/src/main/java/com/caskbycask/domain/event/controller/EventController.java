package com.caskbycask.domain.event.controller;

import com.caskbycask.domain.event.dto.EventResponse;
import com.caskbycask.domain.event.dto.SuggestEventRequest;
import com.caskbycask.domain.event.service.CalendarEventService;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

// 비회원 포함 전체 허용 (SecurityConfig: GET /api/events/** permitAll)
@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final CalendarEventService calendarEventService;

    /** 특정 연·월의 이벤트 달력 조회. 미지정 시 현재 연·월. */
    @GetMapping
    public ResponseEntity<ApiResponse<List<EventResponse>>> getEvents(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month
    ) {
        LocalDate now = LocalDate.now();
        int y = year != null ? year : now.getYear();
        int m = month != null ? month : now.getMonthValue();
        return ResponseEntity.ok(
                ApiResponse.success(calendarEventService.getVisibleEventsByMonth(y, m))
        );
    }

    /** 오늘 기준 진행 중 + 다가오는 이벤트 목록(사이드바용). */
    @GetMapping("/upcoming")
    public ResponseEntity<ApiResponse<List<EventResponse>>> getUpcoming(
            @RequestParam(defaultValue = "10") int limit
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(calendarEventService.getUpcomingEvents(limit))
        );
    }

    /** 로그인 사용자의 이벤트 제보(검토 대기로 등록). 승인 시 노출 + 점수 지급. */
    @PostMapping("/suggest")
    public ResponseEntity<ApiResponse<Void>> suggestEvent(
            @Valid @RequestBody SuggestEventRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        calendarEventService.suggestEvent(request, userDetails.getUserId());
        return ResponseEntity.ok(ApiResponse.success());
    }
}
