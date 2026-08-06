package com.caskbycask.domain.community.entity;

import com.caskbycask.domain.community.entity.enums.BoardType;
import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Entity
@Table(name = "post_prefixes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class PostPrefix extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Comment("게시판 유형 — FREE/NOTICE/PHOTO")
    private BoardType boardType;

    @Column(nullable = false, length = 20)
    @Comment("말머리명")
    private String name;

    @Column(length = 7)
    @Comment("색상(HEX)")
    private String colorHex;

    @Builder.Default
    @Column(nullable = false)
    @Comment("사용 여부")
    private Boolean isActive = true;

    @Builder.Default
    @Column(name = "sort_order", nullable = false)
    @Comment("정렬 순서")
    private Integer sortOrder = 0;

    public void update(String name, String colorHex, Boolean isActive, Integer sortOrder) {
        this.name = name;
        this.colorHex = colorHex;
        this.isActive = isActive;
        this.sortOrder = sortOrder;
    }
}
