package com.caskbycask.domain.event.dto;

import com.caskbycask.domain.event.entity.CalendarEvent;
import com.caskbycask.domain.event.entity.enums.EventCategory;
import com.caskbycask.domain.event.entity.enums.EventSource;
import com.caskbycask.domain.user.entity.User;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** 관리자용 이벤트 응답(노출 여부·출처·작성자 메타 포함). */
public record AdminEventResponse(
        Long id,
        String title,
        String description,
        String linkUrl,
        EventCategory category,
        LocalDate startDate,
        LocalDate endDate,
        Boolean isVisible,
        EventSource source,
        Long createdById,
        String createdByNickname,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static AdminEventResponse from(CalendarEvent e) {
        User creator = e.getCreatedBy();
        return new AdminEventResponse(
                e.getId(),
                e.getTitle(),
                e.getDescription(),
                e.getLinkUrl(),
                e.getCategory(),
                e.getStartDate(),
                e.getEndDate(),
                e.getIsVisible(),
                e.getSource(),
                creator != null ? creator.getId() : null,
                creator != null ? creator.getNickname() : null,
                e.getCreatedAt(),
                e.getUpdatedAt()
        );
    }
}
