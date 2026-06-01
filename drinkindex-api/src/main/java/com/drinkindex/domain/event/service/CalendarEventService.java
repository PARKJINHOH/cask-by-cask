package com.drinkindex.domain.event.service;

import com.drinkindex.domain.event.dto.AdminEventResponse;
import com.drinkindex.domain.event.dto.CreateEventRequest;
import com.drinkindex.domain.event.dto.EventResponse;
import com.drinkindex.domain.event.dto.UpdateEventRequest;
import com.drinkindex.domain.event.entity.CalendarEvent;
import com.drinkindex.domain.event.entity.enums.EventCategory;
import com.drinkindex.domain.event.repository.CalendarEventRepository;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.domain.user.repository.UserRepository;
import com.drinkindex.global.exception.CustomException;
import com.drinkindex.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CalendarEventService {

    private final CalendarEventRepository calendarEventRepository;
    private final UserRepository userRepository;

    // ═══════════════════════════════════════════
    // 공개 API
    // ═══════════════════════════════════════════

    /** 특정 연·월과 겹치는 노출 이벤트(달력 그리드가 보여주는 앞뒤 주를 포함해 넉넉히 조회). */
    @Transactional(readOnly = true)
    public List<EventResponse> getVisibleEventsByMonth(int year, int month) {
        YearMonth ym = YearMonth.of(year, month);
        // 달력 그리드는 직전/직후 달 일부를 함께 표시하므로 ±7일 여유를 둔다.
        LocalDate rangeStart = ym.atDay(1).minusDays(7);
        LocalDate rangeEnd = ym.atEndOfMonth().plusDays(7);
        return calendarEventRepository.findVisibleInRange(rangeStart, rangeEnd).stream()
                .map(EventResponse::from)
                .toList();
    }

    /** 오늘 기준 진행 중 + 다가오는 이벤트를 가까운 순으로 (사이드바 목록용). */
    @Transactional(readOnly = true)
    public List<EventResponse> getUpcomingEvents(int limit) {
        int safeLimit = Math.min(Math.max(limit, 1), 50);
        Pageable pageable = PageRequest.of(0, safeLimit);
        return calendarEventRepository.findUpcoming(LocalDate.now(), pageable).stream()
                .map(EventResponse::from)
                .toList();
    }

    // ═══════════════════════════════════════════
    // 관리자 CRUD
    // ═══════════════════════════════════════════

    @Transactional(readOnly = true)
    public List<AdminEventResponse> getEventsForAdmin(int year, int month, EventCategory category) {
        YearMonth ym = YearMonth.of(year, month);
        LocalDate rangeStart = ym.atDay(1).minusDays(7);
        LocalDate rangeEnd = ym.atEndOfMonth().plusDays(7);
        return calendarEventRepository.findAllInRange(rangeStart, rangeEnd, category).stream()
                .map(AdminEventResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminEventResponse getEventForAdmin(Long eventId) {
        return AdminEventResponse.from(findEventById(eventId));
    }

    @Transactional
    public AdminEventResponse createEvent(CreateEventRequest request, Long creatorId) {
        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        CalendarEvent event = CalendarEvent.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .linkUrl(request.getLinkUrl())
                .category(request.getCategory())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .isVisible(Boolean.TRUE.equals(request.getIsVisible()))
                .createdBy(creator)
                .build();

        return AdminEventResponse.from(calendarEventRepository.save(event));
    }

    @Transactional
    public AdminEventResponse updateEvent(Long eventId, UpdateEventRequest request) {
        CalendarEvent event = findEventById(eventId);
        event.update(
                request.getTitle(),
                request.getDescription(),
                request.getLinkUrl(),
                request.getCategory(),
                request.getStartDate(),
                request.getEndDate(),
                Boolean.TRUE.equals(request.getIsVisible())
        );
        return AdminEventResponse.from(event);
    }

    @Transactional
    public void deleteEvent(Long eventId) {
        calendarEventRepository.delete(findEventById(eventId));
    }

    @Transactional
    public void updateVisibility(Long eventId, Boolean isVisible) {
        findEventById(eventId).setVisible(Boolean.TRUE.equals(isVisible));
    }

    // ═══════════════════════════════════════════
    // Private
    // ═══════════════════════════════════════════

    private CalendarEvent findEventById(Long eventId) {
        return calendarEventRepository.findById(eventId)
                .orElseThrow(() -> new CustomException(ErrorCode.EVENT_NOT_FOUND));
    }
}
