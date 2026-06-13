package com.caskbycask.domain.event.entity;

import com.caskbycask.domain.event.entity.enums.EventCategory;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(
        name = "calendar_events",
        indexes = {
                @Index(name = "idx_event_start_date", columnList = "start_date"),
                @Index(name = "idx_event_end_date",   columnList = "end_date"),
                @Index(name = "idx_event_is_visible", columnList = "is_visible")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class CalendarEvent extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    // 평문(plain text)으로 저장. API 응답은 React 에서 자동 이스케이프되어 렌더링됨(HTML 미허용).
    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 500)
    private String linkUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private EventCategory category;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    // null 이면 단일일(하루짜리) 이벤트, 값이 있으면 startDate~endDate 기간 이벤트.
    @Column(name = "end_date")
    private LocalDate endDate;

    @Builder.Default
    @Column(name = "is_visible", nullable = false)
    private Boolean isVisible = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy;

    public void update(String title, String description, String linkUrl,
                       EventCategory category, LocalDate startDate, LocalDate endDate,
                       Boolean isVisible) {
        this.title = title;
        this.description = description;
        this.linkUrl = linkUrl;
        this.category = category;
        this.startDate = startDate;
        this.endDate = endDate;
        this.isVisible = isVisible;
    }

    public void setVisible(Boolean isVisible) {
        this.isVisible = isVisible;
    }

    /** 기간 종료일(단일일이면 시작일과 동일). 겹침 판정·정렬에 사용. */
    @Transient
    public LocalDate getEffectiveEndDate() {
        return endDate != null ? endDate : startDate;
    }
}
