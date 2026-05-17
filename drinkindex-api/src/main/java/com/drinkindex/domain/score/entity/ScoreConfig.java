package com.drinkindex.domain.score.entity;

import com.drinkindex.domain.score.entity.enums.ScoreActionType;
import com.drinkindex.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "score_config")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class ScoreConfig extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true, length = 50)
    private ScoreActionType actionType;

    @Column(nullable = false)
    private Integer score;

    // null = 무제한. COMMENT_WRITE = 20 (하루 최대 20점)
    @Column
    private Integer dailyLimit;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isActive = true;

    @Column(length = 200)
    private String description;

    public void update(Integer score, Integer dailyLimit, Boolean isActive, String description) {
        if (score != null) this.score = score;
        if (dailyLimit != null) this.dailyLimit = dailyLimit;
        if (isActive != null) this.isActive = isActive;
        if (description != null) this.description = description;
    }
}
