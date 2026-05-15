package com.drinkindex.domain.popup.entity;

import com.drinkindex.domain.popup.entity.enums.PopupDisplayPage;
import com.drinkindex.domain.popup.entity.enums.PopupLanguage;
import com.drinkindex.domain.popup.entity.enums.PopupType;
import com.drinkindex.domain.user.entity.User;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "popups",
        indexes = {
                @Index(name = "idx_popup_sort_order", columnList = "sort_order"),
                @Index(name = "idx_popup_is_visible", columnList = "is_visible"),
                @Index(name = "idx_popup_display_page_language", columnList = "display_page, language")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class Popup extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 관리자 내부 식별명. 사용자 API 응답 미포함.
    @Column(nullable = false, length = 200)
    private String adminTitle;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private PopupType popupType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 5)
    private PopupLanguage language;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    private PopupDisplayPage displayPage = PopupDisplayPage.MAIN;

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
    private Boolean closeOnOverlay = true;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isAlwaysVisible = false;

    // isAlwaysVisible=true 저장 시 강제 null.
    private LocalDateTime startAt;
    private LocalDateTime endAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy;

    public void update(String adminTitle, String content, String contentSanitized,
                       String linkUrl, Boolean linkTargetBlank, Boolean isVisible,
                       Integer sortOrder, Boolean closeOnOverlay,
                       Boolean isAlwaysVisible, LocalDateTime startAt, LocalDateTime endAt) {
        this.adminTitle = adminTitle;
        this.content = content;
        this.contentSanitized = contentSanitized;
        this.linkUrl = linkUrl;
        this.linkTargetBlank = linkTargetBlank;
        this.isVisible = isVisible;
        this.sortOrder = sortOrder;
        this.closeOnOverlay = closeOnOverlay;
        this.isAlwaysVisible = isAlwaysVisible;
        this.startAt = startAt;
        this.endAt = endAt;
    }

    public void setVisible(Boolean isVisible) {
        this.isVisible = isVisible;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }
}
