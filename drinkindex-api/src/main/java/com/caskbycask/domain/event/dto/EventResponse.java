package com.caskbycask.domain.event.dto;

import com.caskbycask.domain.event.entity.CalendarEvent;
import com.caskbycask.domain.event.entity.enums.EventCategory;

import java.time.LocalDate;

/** 공개 조회용 이벤트 응답. */
public record EventResponse(
        Long id,
        String title,
        String description,
        String linkUrl,
        EventCategory category,
        LocalDate startDate,
        LocalDate endDate
) {
    public static EventResponse from(CalendarEvent e) {
        return new EventResponse(
                e.getId(),
                e.getTitle(),
                e.getDescription(),
                e.getLinkUrl(),
                e.getCategory(),
                e.getStartDate(),
                e.getEndDate()
        );
    }
}
