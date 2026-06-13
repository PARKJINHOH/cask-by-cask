package com.caskbycask.domain.community.entity;

import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "community_emojis")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class CommunityEmoji extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    private EmojiGroup group;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(length = 500)
    private String imageUrl;

    @Column(length = 10)
    private String unicode;

    @Column(nullable = false, length = 50)
    private String label;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isActive = true;

    @Builder.Default
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    public void toggleActive() { this.isActive = !this.isActive; }

    public void updateSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }

    public void update(String imageUrl, String unicode, String label, Boolean isActive, Integer sortOrder, EmojiGroup group) {
        this.imageUrl = imageUrl;
        this.unicode = unicode;
        this.label = label;
        this.isActive = isActive;
        this.sortOrder = sortOrder;
        this.group = group;
    }
}
