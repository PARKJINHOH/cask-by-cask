package com.caskbycask.domain.event.controller;

import com.caskbycask.domain.event.dto.AdminEventResponse;
import com.caskbycask.domain.event.dto.CreateEventRequest;
import com.caskbycask.domain.event.dto.UpdateEventRequest;
import com.caskbycask.domain.event.entity.enums.EventCategory;
import com.caskbycask.domain.event.service.CalendarEventService;
import com.caskbycask.global.auth.security.CustomUserDetails;
import com.caskbycask.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/admin/events")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN')")
public class EventAdminController {

    private final CalendarEventService calendarEventService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AdminEventResponse>>> getEvents(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) EventCategory category
    ) {
        LocalDate now = LocalDate.now();
        int y = year != null ? year : now.getYear();
        int m = month != null ? month : now.getMonthValue();
        return ResponseEntity.ok(
                ApiResponse.success(calendarEventService.getEventsForAdmin(y, m, category))
        );
    }

    /** 사용자 제보 목록(최근 제보순, 작성자 정보 포함). */
    @GetMapping("/suggestions")
    public ResponseEntity<ApiResponse<List<AdminEventResponse>>> getSuggestions() {
        return ResponseEntity.ok(ApiResponse.success(calendarEventService.getSuggestionsForAdmin()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminEventResponse>> getEventDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(calendarEventService.getEventForAdmin(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<AdminEventResponse>> createEvent(
            @Valid @RequestBody CreateEventRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        return ResponseEntity.ok(
                ApiResponse.success(calendarEventService.createEvent(request, userDetails.getUserId()))
        );
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminEventResponse>> updateEvent(
            @PathVariable Long id,
            @Valid @RequestBody UpdateEventRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success(calendarEventService.updateEvent(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteEvent(@PathVariable Long id) {
        calendarEventService.deleteEvent(id);
        return ResponseEntity.ok(ApiResponse.success());
    }

    @PatchMapping("/{id}/visibility")
    public ResponseEntity<ApiResponse<Void>> updateVisibility(
            @PathVariable Long id,
            @RequestBody VisibilityRequest request
    ) {
        calendarEventService.updateVisibility(id, request.getIsVisible());
        return ResponseEntity.ok(ApiResponse.success());
    }

    @Getter
    @NoArgsConstructor
    public static class VisibilityRequest {
        private Boolean isVisible;
    }
}
