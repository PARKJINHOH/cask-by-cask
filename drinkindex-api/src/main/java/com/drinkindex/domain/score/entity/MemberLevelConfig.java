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

    @Builder.Default
    @Column(nullable = false)
    private Boolean isActive = true;

    public void update(String name, Integer minScore, Boolean isActive) {
        if (name != null) this.name = name;
        if (minScore != null) this.minScore = minScore;
        if (isActive != null) this.isActive = isActive;
    }
}
