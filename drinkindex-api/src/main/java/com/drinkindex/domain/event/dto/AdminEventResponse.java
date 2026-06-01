package com.drinkindex.domain.event.dto;

import com.drinkindex.domain.event.entity.CalendarEvent;
import com.drinkindex.domain.event.entity.enums.EventCategory;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** 관리자용 이벤트 응답(노출 여부·메타 포함). */
public record AdminEventResponse(
        Long id,
        String title,
        String description,
        String linkUrl,
        EventCategory category,
        LocalDate startDate,
        LocalDate endDate,
        Boolean isVisible,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static AdminEventResponse from(CalendarEvent e) {
        return new AdminEventResponse(
                e.getId(),
                e.getTitle(),
                e.getDescription(),
                e.getLinkUrl(),
                e.getCategory(),
                e.getStartDate(),
                e.getEndDate(),
                e.getIsVisible(),
                e.getCreatedAt(),
                e.getUpdatedAt()
        );
    }
}
