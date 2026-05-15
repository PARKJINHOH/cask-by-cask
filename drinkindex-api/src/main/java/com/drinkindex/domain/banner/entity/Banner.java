package com.drinkindex.domain.banner.entity;

import com.drinkindex.domain.banner.entity.enums.BannerLanguage;
import com.drinkindex.domain.banner.entity.enums.BannerType;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "banners",
        indexes = {
                @Index(name = "idx_banner_sort_order",   columnList = "sort_order"),
                @Index(name = "idx_banner_is_visible",   columnList = "is_visible"),
                @Index(name = "idx_banner_language",     columnList = "language")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class Banner extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String adminTitle;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private BannerType bannerType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 5)
    private BannerLanguage language;

    // [보안] XSS: 원본 HTML. DB 저장 전용, API 응답 절대 미노출.
    @Column(columnDefinition = "LONGTEXT")
    private String content;

    // [보안] XSS: jsoup Sanitize 완료본. API 응답은 이 필드만 사용.
    @Column(columnDefinition = "LONGTEXT")
    private String contentSanitized;

    @Column(length = 500)
    private String linkUrl;

    @Builder.Default
    @Column(nullable = false)
    private Boolean linkTargetBlank = false;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isVisible = false;

    @Builder.Default
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isAlwaysVisible = false;

    private LocalDateTime startAt;
    private LocalDateTime endAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy;

    public void update(String adminTitle, String content, String contentSanitized,
                       String linkUrl, Boolean linkTargetBlank, Boolean isVisible,
                       Integer sortOrder, Boolean isAlwaysVisible,
                       LocalDateTime startAt, LocalDateTime endAt) {
        this.adminTitle = adminTitle;
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
