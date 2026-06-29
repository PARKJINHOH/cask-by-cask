package com.caskbycask.domain.event.service;

import com.caskbycask.domain.event.dto.AdminEventResponse;
import com.caskbycask.domain.event.dto.CreateEventRequest;
import com.caskbycask.domain.event.dto.EventResponse;
import com.caskbycask.domain.event.dto.UpdateEventRequest;
import com.caskbycask.domain.event.dto.SuggestEventRequest;
import com.caskbycask.domain.event.entity.CalendarEvent;
import com.caskbycask.domain.event.entity.enums.EventCategory;
import com.caskbycask.domain.event.entity.enums.EventSource;
import com.caskbycask.domain.event.repository.CalendarEventRepository;
import com.caskbycask.domain.score.constant.ScoreActions;
import com.caskbycask.domain.score.service.ScoreService;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.domain.user.repository.UserRepository;
import com.caskbycask.global.exception.CustomException;
import com.caskbycask.global.exception.ErrorCode;
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
    private final ScoreService scoreService;

    /** 점수 이력 reference 타입(이벤트 제보 승인). */
    private static final String SCORE_REF_TYPE = "CALENDAR_EVENT";

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
    public List<AdminEventResponse> getLatestEventsForAdmin(EventCategory category, int size) {
        int safeSize = Math.min(Math.max(size, 1), 500);
        Pageable pageable = PageRequest.of(0, safeSize);
        List<CalendarEvent> events = category == null
                ? calendarEventRepository.findAllByOrderByCreatedAtDescIdDesc(pageable)
                : calendarEventRepository.findByCategoryOrderByCreatedAtDescIdDesc(category, pageable);

        return events.stream()
                .map(AdminEventResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminEventResponse getEventForAdmin(Long eventId) {
        return AdminEventResponse.from(findEventById(eventId));
    }

    @Transactional
    public AdminEventResponse createEvent(CreateEventRequest request, Long creatorId) {
        User creator = userRepository.getByIdOrThrow(creatorId);

        CalendarEvent event = CalendarEvent.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .linkUrl(request.getLinkUrl())
                .category(request.getCategory())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .isVisible(Boolean.TRUE.equals(request.getIsVisible()))
                .source(EventSource.ADMIN)
                .createdBy(creator)
                .build();

        return AdminEventResponse.from(calendarEventRepository.save(event));
    }

    /** 관리자 검토 대기 중인 사용자 제보 목록(최근 제보순). */
    @Transactional(readOnly = true)
    public List<AdminEventResponse> getSuggestionsForAdmin() {
        return calendarEventRepository.findBySourceOrderByCreatedAtDesc(EventSource.USER).stream()
                .map(AdminEventResponse::from)
                .toList();
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
        awardIfApprovedSuggestion(event);
        return AdminEventResponse.from(event);
    }

    @Transactional
    public void deleteEvent(Long eventId) {
        calendarEventRepository.delete(findEventById(eventId));
    }

    @Transactional
    public void updateVisibility(Long eventId, Boolean isVisible) {
        CalendarEvent event = findEventById(eventId);
        event.setVisible(Boolean.TRUE.equals(isVisible));
        awardIfApprovedSuggestion(event);
    }

    // ═══════════════════════════════════════════
    // 사용자 제보
    // ═══════════════════════════════════════════

    /** 로그인 사용자의 이벤트 제보 → 검토 대기(USER, isVisible=false)로 생성. */
    @Transactional
    public void suggestEvent(SuggestEventRequest request, Long userId) {
        User reporter = userRepository.getByIdOrThrow(userId);

        CalendarEvent event = CalendarEvent.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .linkUrl(request.getLinkUrl())
                .category(request.getCategory())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .isVisible(false)
                .source(EventSource.USER)
                .createdBy(reporter)
                .build();

        calendarEventRepository.save(event);
    }

    // ═══════════════════════════════════════════
    // Private
    // ═══════════════════════════════════════════

    /**
     * 사용자 제보(source=USER)가 공개로 전환되면 제보자에게 점수 지급.
     * ScoreService 가 referenceId당 1회 지급 + MEMBER 외(관리자 등) 자동 스킵을 보장하므로
     * 노출 토글을 반복해도 중복 지급되지 않는다.
     */
    private void awardIfApprovedSuggestion(CalendarEvent event) {
        if (event.getSource() == EventSource.USER
                && Boolean.TRUE.equals(event.getIsVisible())
                && event.getCreatedBy() != null) {
            scoreService.award(
                    event.getCreatedBy().getId(),
                    ScoreActions.EVENT_SUGGEST_APPROVED,
                    SCORE_REF_TYPE,
                    event.getId()
            );
        }
    }

    private CalendarEvent findEventById(Long eventId) {
        return calendarEventRepository.findById(eventId)
                .orElseThrow(() -> new CustomException(ErrorCode.EVENT_NOT_FOUND));
    }
}
