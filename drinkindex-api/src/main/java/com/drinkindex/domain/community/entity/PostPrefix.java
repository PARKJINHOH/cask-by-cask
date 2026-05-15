package com.drinkindex.domain.community.entity;

import com.drinkindex.domain.community.entity.enums.BoardType;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "post_prefixes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class PostPrefix extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BoardType boardType;

    @Column(nullable = false, length = 20)
    private String name;

    @Column(length = 7)
    private String colorHex;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isActive = true;

    @Builder.Default
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    public void update(String name, String colorHex, Boolean isActive, Integer sortOrder) {
        this.name = name;
        this.colorHex = colorHex;
        this.isActive = isActive;
        this.sortOrder = sortOrder;
    }
}
