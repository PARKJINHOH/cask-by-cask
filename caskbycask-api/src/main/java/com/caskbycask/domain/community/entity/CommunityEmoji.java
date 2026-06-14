package com.caskbycask.domain.community.entity;

import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Entity
@Table(name = "community_emojis")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("커뮤니티 이모지")
public class CommunityEmoji extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    @Comment("이모지 그룹(emoji_groups.id)")
    private EmojiGroup group;

    @Column(nullable = false, unique = true, length = 50)
    @Comment("이모지 코드(고유)")
    private String code;

    @Column(length = 500)
    @Comment("커스텀 이미지 URL")
    private String imageUrl;

    @Column(length = 10)
    @Comment("유니코드 이모지 문자")
    private String unicode;

    @Column(nullable = false, length = 50)
    @Comment("표시 라벨")
    private String label;

    @Builder.Default
    @Column(nullable = false)
    @Comment("사용 여부")
    private Boolean isActive = true;

    @Builder.Default
    @Column(name = "sort_order", nullable = false)
    @Comment("정렬 순서")
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
