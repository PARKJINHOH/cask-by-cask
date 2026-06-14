package com.caskbycask.domain.popup.entity;

import com.caskbycask.domain.popup.entity.enums.PopupDisplayPage;
import com.caskbycask.domain.popup.entity.enums.PopupLanguage;
import com.caskbycask.domain.popup.entity.enums.PopupType;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

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
@Comment("메인 팝업")
public class Popup extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    // 관리자 내부 식별명. 사용자 API 응답 미포함.
    @Column(nullable = false, length = 200)
    @Comment("관리용 제목")
    private String adminTitle;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Comment("팝업 유형 — HTML/IMAGE")
    private PopupType popupType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 5)
    @Comment("언어 — KO/EN")
    private PopupLanguage language;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(nullable = false, length = 20)
    @Comment("노출 페이지 — MAIN")
    private PopupDisplayPage displayPage = PopupDisplayPage.MAIN;

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
    @Comment("배경 클릭 시 닫기 여부")
    private Boolean closeOnOverlay = true;

    @Builder.Default
    @Column(nullable = false)
    @Comment("상시 노출 여부")
    private Boolean isAlwaysVisible = false;

    // isAlwaysVisible=true 저장 시 강제 null.
    @Comment("노출 시작 일시")
    private LocalDateTime startAt;
    @Comment("노출 종료 일시")
    private LocalDateTime endAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", nullable = false)
    @Comment("작성 관리자(users.id)")
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
