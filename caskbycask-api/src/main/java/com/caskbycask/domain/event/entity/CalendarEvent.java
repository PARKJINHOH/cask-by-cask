package com.caskbycask.domain.event.entity;

import com.caskbycask.domain.event.entity.enums.EventCategory;
import com.caskbycask.domain.event.entity.enums.EventSource;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

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
@Comment("캘린더 이벤트")
public class CalendarEvent extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @Column(nullable = false, length = 200)
    @Comment("제목")
    private String title;

    // 평문(plain text)으로 저장. API 응답은 React 에서 자동 이스케이프되어 렌더링됨(HTML 미허용).
    @Column(columnDefinition = "TEXT")
    @Comment("상세 설명")
    private String description;

    @Column(length = 500)
    @Comment("링크 URL")
    private String linkUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Comment("분류 — EVENT/FESTIVAL/RELEASE/ETC")
    private EventCategory category;

    // 등록 출처. USER = 사용자 제보(생성 시 isVisible=false), ADMIN = 관리자 직접 등록.
    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 10)
    @Comment("등록 출처 — ADMIN(관리자)/USER(사용자 제보)")
    private EventSource source = EventSource.ADMIN;

    @Column(name = "start_date", nullable = false)
    @Comment("시작 일자")
    private LocalDate startDate;

    // null 이면 단일일(하루짜리) 이벤트, 값이 있으면 startDate~endDate 기간 이벤트.
    @Column(name = "end_date")
    @Comment("종료 일자")
    private LocalDate endDate;

    @Builder.Default
    @Column(name = "is_visible", nullable = false)
    @Comment("노출 여부")
    private Boolean isVisible = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", nullable = false)
    @Comment("작성 관리자(users.id)")
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
