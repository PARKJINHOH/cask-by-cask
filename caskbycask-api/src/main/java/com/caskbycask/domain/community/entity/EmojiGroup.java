package com.caskbycask.domain.community.entity;

import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Entity
@Table(name = "emoji_groups")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("이모지 그룹")
public class EmojiGroup extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @Column(nullable = false, length = 50)
    @Comment("그룹명")
    private String name;

    @Builder.Default
    @Column(name = "sort_order", nullable = false)
    @Comment("정렬 순서")
    private Integer sortOrder = 0;

    @Builder.Default
    @Column(nullable = false)
    @Comment("사용 여부")
    private Boolean isActive = true;

    public void update(String name) {
        this.name = name;
    }

    public void updateSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }

    public void toggleActive() {
        this.isActive = !this.isActive;
    }
}
