package com.caskbycask.domain.community.entity;

import com.caskbycask.global.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Entity
@Table(name = "bad_words")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Comment("금칙어(콘텐츠 필터)")
public class BadWord extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Comment("PK")
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    @Comment("금칙어")
    private String word;

    @Builder.Default
    @Column(nullable = false)
    @Comment("사용 여부")
    private Boolean isActive = true;

    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
}
