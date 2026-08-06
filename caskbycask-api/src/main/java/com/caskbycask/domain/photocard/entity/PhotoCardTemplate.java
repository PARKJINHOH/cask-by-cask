package com.caskbycask.domain.photocard.entity;

import com.caskbycask.domain.photocard.entity.enums.PhotoCardModerationStatus;
import com.caskbycask.domain.photocard.entity.enums.PhotoCardTemplateType;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

/**
 * 포토카드 템플릿.
 * <p>
 * 레이아웃은 taste_tree_versions 의 content_json 선례대로 LONGTEXT JSON 으로 담는다.
 * 테이스팅 트리와 달리 초안/발행 개념이 없어 버전 테이블을 두지 않는다.
 */
@Entity
@Table(
        name = "photo_card_templates",
        indexes = {
                @Index(name = "idx_photo_card_tpl_owner", columnList = "owner_user_id, updated_at"),
                @Index(name = "idx_photo_card_tpl_public",
                        columnList = "template_type, is_public, moderation_status, display_order")
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("포토카드 템플릿")
public class PhotoCardTemplate extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "template_type", nullable = false, length = 20)
    @Comment("템플릿 유형 — OFFICIAL/USER")
    private PhotoCardTemplateType templateType;

    /** OFFICIAL 은 null. USER 는 반드시 있다. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_user_id")
    @Comment("소유자(users.id) — OFFICIAL 은 null")
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    @Comment("생성자(users.id)")
    private User createdBy;

    @Column(nullable = false, length = 60)
    @Comment("템플릿 이름")
    private String name;

    @Column(length = 200)
    @Comment("설명")
    private String description;

    @Column(name = "aspect_ratio", nullable = false, length = 12)
    @Comment("이미지 비율 — 1:1/4:5/3:4/9:16/16:9")
    private String aspectRatio;

    @Column(name = "schema_version", nullable = false)
    @Comment("레이아웃 스키마 버전")
    private Integer schemaVersion;

    @Lob
    @Column(name = "layout_json", nullable = false, columnDefinition = "LONGTEXT")
    @Comment("레이아웃 JSON")
    private String layoutJson;

    @Column(name = "thumbnail_url", length = 500)
    @Comment("미리보기 이미지 URL")
    private String thumbnailUrl;

    @Column(name = "thumbnail_saved_file_name", length = 255)
    @Comment("미리보기 저장 파일명")
    private String thumbnailSavedFileName;

    @Column(name = "thumbnail_sub_path", length = 200)
    @Comment("미리보기 저장 하위 경로")
    private String thumbnailSubPath;

    @Builder.Default
    @Column(name = "is_public", nullable = false)
    @Comment("공개 여부 — 사용자 템플릿을 다른 사용자에게 개방")
    private Boolean isPublic = false;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "moderation_status", nullable = false, length = 20)
    @Comment("노출 상태 — 관리자 숨김용")
    private PhotoCardModerationStatus moderationStatus = PhotoCardModerationStatus.VISIBLE;

    @Builder.Default
    @Column(name = "display_order", nullable = false)
    @Comment("정렬 순서")
    private Integer displayOrder = 0;

    @Builder.Default
    @Column(name = "use_count", nullable = false)
    @Comment("사용 횟수")
    private Long useCount = 0L;

    public void update(String name, String description, String aspectRatio,
                       Integer schemaVersion, String layoutJson) {
        this.name = name;
        this.description = description;
        this.aspectRatio = aspectRatio;
        this.schemaVersion = schemaVersion;
        this.layoutJson = layoutJson;
    }

    public void updateThumbnail(String url, String savedFileName, String subPath) {
        this.thumbnailUrl = url;
        this.thumbnailSavedFileName = savedFileName;
        this.thumbnailSubPath = subPath;
    }

    public void changePublic(boolean isPublic) {
        this.isPublic = isPublic;
    }

    public void changeModerationStatus(PhotoCardModerationStatus status) {
        this.moderationStatus = status;
    }

    public void changeDisplayOrder(int displayOrder) {
        this.displayOrder = displayOrder;
    }

    public void increaseUseCount() {
        this.useCount = (this.useCount == null ? 0L : this.useCount) + 1;
    }

    public boolean isOwnedBy(Long userId) {
        return templateType == PhotoCardTemplateType.USER
                && owner != null
                && owner.getId().equals(userId);
    }

    /** 다른 사용자가 골라 쓸 수 있는가 — 공식이거나, 공개된 사용자 템플릿이며 숨겨지지 않았을 때. */
    public boolean isUsableByOthers() {
        if (moderationStatus != PhotoCardModerationStatus.VISIBLE) return false;
        return templateType == PhotoCardTemplateType.OFFICIAL || Boolean.TRUE.equals(isPublic);
    }
}
