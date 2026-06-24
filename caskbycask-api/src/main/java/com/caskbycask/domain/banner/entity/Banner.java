package com.caskbycask.domain.banner.entity;

import com.caskbycask.domain.banner.entity.enums.BannerLanguage;
import com.caskbycask.domain.banner.entity.enums.BannerPosition;
import com.caskbycask.domain.banner.entity.enums.BannerType;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "banners",
        indexes = {
                @Index(name = "idx_banner_sort_order",   columnList = "sort_order"),
                @Index(name = "idx_banner_is_visible",   columnList = "is_visible"),
                @Index(name = "idx_banner_language",     columnList = "language"),
                @Index(name = "idx_banner_position",     columnList = "position")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("메인/사이드 배너")
public class Banner extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @Column(nullable = false, length = 200)
    @Comment("관리용 제목")
    private String adminTitle;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Comment("배너 유형 — HTML/IMAGE")
    private BannerType bannerType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Comment("배너 위치 — MAIN/SIDE")
    @Builder.Default
    private BannerPosition position = BannerPosition.MAIN;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 5)
    @Comment("언어 — KO/EN")
    private BannerLanguage language;

    // [보안] XSS: 원본 HTML. DB 저장 전용, API 응답 절대 미노출.
    @Column(columnDefinition = "LONGTEXT")
    @Comment("본문 HTML(원본)")
    private String content;

    // [보안] XSS: jsoup Sanitize 완료본. API 응답은 이 필드만 사용.
    @Column(columnDefinition = "LONGTEXT")
    @Comment("본문 HTML(XSS 필터링)")
    private String contentSanitized;

    @Column(length = 500)
    @Comment("링크 URL")
    private String linkUrl;

    @Builder.Default
    @Column(nullable = false)
    @Comment("링크 새 창 열기 여부")
    private Boolean linkTargetBlank = false;

    @Builder.Default
    @Column(nullable = false)
    @Comment("노출 여부")
    private Boolean isVisible = false;

    @Builder.Default
    @Column(name = "sort_order", nullable = false)
    @Comment("정렬 순서")
    private Integer sortOrder = 0;

    @Builder.Default
    @Column(nullable = false)
    @Comment("상시 노출 여부")
    private Boolean isAlwaysVisible = false;

    @Comment("노출 시작 일시")
    private LocalDateTime startAt;
    @Comment("노출 종료 일시")
    private LocalDateTime endAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", nullable = false)
    @Comment("작성 관리자(users.id)")
    private User createdBy;

    public void update(String adminTitle, BannerPosition position, String content, String contentSanitized,
                       String linkUrl, Boolean linkTargetBlank, Boolean isVisible,
                       Integer sortOrder, Boolean isAlwaysVisible,
                       LocalDateTime startAt, LocalDateTime endAt) {
        this.adminTitle = adminTitle;
        this.position = position;
        this.content = content;
        this.contentSanitized = contentSanitized;
        this.linkUrl = linkUrl;
        this.linkTargetBlank = linkTargetBlank;
        this.isVisible = isVisible;
        this.sortOrder = sortOrder;
        this.isAlwaysVisible = isAlwaysVisible;
        this.startAt = startAt;
        this.endAt = endAt;
    }

    public void setVisible(Boolean isVisible)     { this.isVisible = isVisible; }
    public void setSortOrder(Integer sortOrder)   { this.sortOrder = sortOrder; }
}
