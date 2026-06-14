package com.caskbycask.domain.score.entity;

import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Entity
@Table(name = "member_level_config")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("회원 레벨(등급) 설정")
public class MemberLevelConfig extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @Column(nullable = false, unique = true)
    @Comment("레벨")
    private Integer level;

    @Column(nullable = false, length = 50)
    @Comment("등급명")
    private String name;

    @Column(nullable = false)
    @Comment("도달 최소 점수")
    private Integer minScore;

    @Builder.Default
    @Column(nullable = false)
    @Comment("사용 여부")
    private Boolean isActive = true;

    public void update(String name, Integer minScore, Boolean isActive) {
        if (name != null) this.name = name;
        if (minScore != null) this.minScore = minScore;
        if (isActive != null) this.isActive = isActive;
    }
}
