package com.caskbycask.domain.tastetree.entity;

import com.caskbycask.domain.tastetree.entity.enums.TasteTreeType;
import com.caskbycask.domain.tastetree.entity.enums.TasteTreeModerationStatus;
import com.caskbycask.domain.user.entity.User;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "taste_trees", indexes = {
        @Index(name = "idx_taste_trees_owner_updated", columnList = "owner_user_id, updated_at"),
        @Index(name = "idx_taste_trees_type", columnList = "tree_type")
}, uniqueConstraints = {
        @UniqueConstraint(name = "ux_taste_trees_share_key", columnNames = "share_key")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class TasteTree extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "tree_type", nullable = false, length = 20)
    private TasteTreeType type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_user_id")
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    private User createdBy;

    @Column(name = "share_key", nullable = false, length = 64)
    private String shareKey;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_tree_id")
    private TasteTree sourceTree;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    @Column(name = "moderation_status", nullable = false, length = 20)
    private TasteTreeModerationStatus moderationStatus = TasteTreeModerationStatus.VISIBLE;

    @Builder.Default
    @Column(name = "like_count", nullable = false)
    private Integer likeCount = 0;

    @Builder.Default
    @Column(name = "view_count", nullable = false)
    private Integer viewCount = 0;

    public boolean isOwnedBy(Long userId) {
        return type == TasteTreeType.USER && owner != null && owner.getId().equals(userId);
    }

    public boolean isCreatedBy(Long userId) {
        return createdBy != null && createdBy.getId().equals(userId);
    }

    public void hide() {
        moderationStatus = TasteTreeModerationStatus.HIDDEN;
    }

    public void restore() {
        moderationStatus = TasteTreeModerationStatus.VISIBLE;
    }

    public void increaseLikeCount() {
        likeCount++;
    }

    public void decreaseLikeCount() {
        likeCount = Math.max(0, likeCount - 1);
    }

    public void increaseViewCount() {
        viewCount++;
    }
}
