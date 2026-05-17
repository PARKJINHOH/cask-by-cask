package com.drinkindex.domain.score.entity;

import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "member_level_config")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class MemberLevelConfig extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Integer level;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(nullable = false)
    private Integer minScore;

    // 프론트에서 이 키로 SVG 컴포넌트 선택. 예: "lv1_malt", "lv11_50yo"
    @Column(nullable = false, length = 50)
    private String iconKey;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isActive = true;

    public void update(String name, Integer minScore, String iconKey, Boolean isActive) {
        if (name != null) this.name = name;
        if (minScore != null) this.minScore = minScore;
        if (iconKey != null) this.iconKey = iconKey;
        if (isActive != null) this.isActive = isActive;
    }
}
