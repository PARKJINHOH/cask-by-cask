package com.drinkindex.domain.event.repository;

import com.drinkindex.domain.event.entity.CalendarEvent;
import com.drinkindex.domain.event.entity.enums.EventCategory;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface CalendarEventRepository extends JpaRepository<CalendarEvent, Long> {

    /**
     * 공개용: 주어진 기간([rangeStart, rangeEnd])과 겹치는 노출 이벤트.
     * 겹침 판정 = e.startDate <= rangeEnd AND COALESCE(e.endDate, e.startDate) >= rangeStart
     */
    @Query("""
            SELECT e FROM CalendarEvent e
            WHERE e.isVisible = true
            AND e.startDate <= :rangeEnd
            AND COALESCE(e.endDate, e.startDate) >= :rangeStart
            ORDER BY e.startDate ASC, e.id ASC
            """)
    List<CalendarEvent> findVisibleInRange(
            @Param("rangeStart") LocalDate rangeStart,
            @Param("rangeEnd") LocalDate rangeEnd
    );

    /**
     * 관리자용: 기간과 겹치는 전체 이벤트(노출 여부 무관), 카테고리 선택 필터.
     */
    @Query("""
            SELECT e FROM CalendarEvent e
            WHERE e.startDate <= :rangeEnd
            AND COALESCE(e.endDate, e.startDate) >= :rangeStart
            AND (:category IS NULL OR e.category = :category)
            ORDER BY e.startDate ASC, e.id ASC
            """)
    List<CalendarEvent> findAllInRange(
            @Param("rangeStart") LocalDate rangeStart,
            @Param("rangeEnd") LocalDate rangeEnd,
            @Param("category") EventCategory category
    );

    /**
     * 공개용: 오늘 기준 아직 끝나지 않은(진행 중 + 예정) 노출 이벤트를 가까운 순으로.
     */
    @Query("""
            SELECT e FROM CalendarEvent e
            WHERE e.isVisible = true
            AND COALESCE(e.endDate, e.startDate) >= :today
            ORDER BY e.startDate ASC, e.id ASC
            """)
    List<CalendarEvent> findUpcoming(@Param("today") LocalDate today, Pageable pageable);
}
